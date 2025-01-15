// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { simpleGit, SimpleGit } from "simple-git";
import { GoogleGenerativeAI } from "@google/generative-ai";

let autoCommitInterval: NodeJS.Timeout | undefined;
let inactivityTimeout: NodeJS.Timeout | undefined;
let lastActivityTime: number = Date.now();
let git: SimpleGit;
let genAI: GoogleGenerativeAI;
let model: any;

export async function activate(context: vscode.ExtensionContext) {
    console.log("Git AI Committer is now active!");

    // Initialize Git
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder found");
        return;
    }

    git = simpleGit(workspaceFolders[0].uri.fsPath);

    // Check if repository exists
    try {
        await git.checkIsRepo();
    } catch (error) {
        vscode.window.showErrorMessage(
            "No Git repository found in the current workspace."
        );
        return;
    }

    // Check for Gemini API key
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const apiKey = config.get<string>("geminiApiKey");

    if (!apiKey) {
        const setKey = "Set API Key";
        const getKey = "Get API Key";
        const response = await vscode.window.showWarningMessage(
            "Gemini API key is not set. You need to set it to use Git AI Committer.",
            setKey,
            getKey
        );

        if (response === setKey) {
            await vscode.commands.executeCommand(
                "git-ai-commiter.setGeminiApiKey"
            );
        } else if (response === getKey) {
            vscode.env.openExternal(
                vscode.Uri.parse("https://aistudio.google.com/apikey")
            );
        }
    }

    // Function to validate API key

    // Initialize Gemini
    if (await validateApiKey()) {
        const apiKey = getApiKey();

        if (!apiKey) {
            return;
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
        });
    }

    // Register commands
    let setGeminiApiKeyCommand = vscode.commands.registerCommand(
        "git-ai-commiter.setGeminiApiKey",
        async () => {
            const key = await vscode.window.showInputBox({
                prompt: "Enter your Gemini API Key",
                placeHolder: "Paste your API key here",
                password: true, // This hides the input
                ignoreFocusOut: true, // Keeps the input box open when focus is lost
                validateInput: (value) => {
                    return value && value.trim().length > 0
                        ? null
                        : "API key cannot be empty";
                },
            });

            if (key) {
                await vscode.workspace
                    .getConfiguration("gitAiCommitter")
                    .update(
                        "geminiApiKey",
                        key,
                        vscode.ConfigurationTarget.Global
                    );
                vscode.window.showInformationMessage(
                    "Gemini API Key has been set successfully!"
                );
            }
        }
    );

    context.subscriptions.push(
        setGeminiApiKeyCommand,
        vscode.commands.registerCommand(
            "git-ai-commiter.enableAutoCommit",
            enableAutoCommit
        ),
        vscode.commands.registerCommand(
            "git-ai-commiter.disableAutoCommit",
            disableAutoCommit
        ),
        vscode.commands.registerCommand("git-ai-commiter.commitNow", () =>
            performCommit()
        )
    );

    // Setup activity monitoring
    vscode.workspace.onDidChangeTextDocument(() => resetInactivityTimer());

    // Initialize if enabled by default
    if (config.get<boolean>("enabled")) {
        enableAutoCommit();
    }
}

async function generateCommitMessage(): Promise<string> {
    if (!(await validateApiKey())) {
        return "";
    }
    const apiKey = getApiKey();
    try {
        const diff = await git.diff();
        if (!diff) {
            return "No changes to commit";
        }

        if (!model) {
            return "feat: update files";
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:

${diff}`;

        const result = await model.generateContent(prompt);
        if (!result || !result.response) {
            console.log("error", "Empty response from Gemini");
            throw new Error("Empty response from Gemini API");
        }

        if (
            !result.response.candidates ||
            !result.response.candidates[0] ||
            !result.response.candidates[0].content ||
            !result.response.candidates[0].content.parts ||
            !result.response.candidates[0].content.parts[0]
        ) {
            console.log("error", "No candidates in response from Gemini");
            throw new Error("No candidates in response from Gemini API");
        }

        const response = result?.response?.candidates[0].content.parts[0].text;

        // Clean up the message - remove quotes and newlines
        const cleanMessage = parseJsonResponse(response);

        // Ensure it follows conventional commit format
        if (!cleanMessage.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
            return "feat: update files";
        }

        return cleanMessage;
    } catch (error) {
        console.error("Error generating commit message:", error);
        return "feat: update files";
    }
}

function parseJsonResponse(aiResponse: string) {
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || [
        null,
        aiResponse,
    ];
    const responseText = jsonMatch[1];

    let response;
    try {
        response = JSON.parse(responseText);
        console.log("Parsed AI response:", response);
    } catch (error) {
        console.error("Failed to parse AI response:", error);
        throw new Error("Invalid AI response format");
    }
    return response;
}

async function performCommit() {
    try {
        const status = await git.status();

        if (status.files.length === 0) {
            return;
        }

        // Add all changes
        await git.add(".");

        // Generate commit message
        const commitMessage = await generateCommitMessage();

        // Commit changes
        await git.commit(commitMessage);

        vscode.window.showInformationMessage(
            `Changes committed: ${commitMessage}`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to commit changes: ${error}`);
    }
}

function enableAutoCommit() {
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const commitInterval = config.get<number>("commitInterval") || 300;
    const inactivityTimeoutValue =
        config.get<number>("inactivityTimeout") || 120;

    // Clear existing intervals if any
    disableAutoCommit();

    // Set up commit interval if enabled
    if (commitInterval > 0) {
        autoCommitInterval = setInterval(
            () => performCommit(),
            commitInterval * 1000
        );
    }

    // Set up inactivity detection if enabled
    if (inactivityTimeoutValue > 0) {
        resetInactivityTimer();
    }

    vscode.window.showInformationMessage("Auto-commit enabled");
}

function disableAutoCommit() {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
        autoCommitInterval = undefined;
    }
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = undefined;
    }
    vscode.window.showInformationMessage("Auto-commit disabled");
}

function resetInactivityTimer() {
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const inactivityTimeoutValue =
        config.get<number>("inactivityTimeout") || 120;

    lastActivityTime = Date.now();

    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }

    if (inactivityTimeoutValue > 0) {
        inactivityTimeout = setTimeout(() => {
            const timeSinceLastActivity =
                (Date.now() - lastActivityTime) / 1000;
            if (timeSinceLastActivity >= inactivityTimeoutValue) {
                performCommit();
            }
        }, inactivityTimeoutValue * 1000);
    }
}

export function deactivate() {
    disableAutoCommit();
}

async function validateApiKey(): Promise<boolean> {
    const currentKey = vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("geminiApiKey");
    if (!currentKey) {
        const setKey = "Set API Key";
        const response = await vscode.window.showErrorMessage(
            "Gemini API key is required for this operation.",
            setKey
        );
        if (response === setKey) {
            await vscode.commands.executeCommand(
                "git-ai-commiter.setGeminiApiKey"
            );
            return validateApiKey(); // Check again after potentially setting the key
        }
        return false;
    }
    return true;
}

// Function to get API key
export function getApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("geminiApiKey");
}
