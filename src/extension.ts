import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, validateApiKey } from "./ai/geminiService";
import {
    enableAutoCommit,
    disableAutoCommit,
} from "./autoCommit/autoCommitService";
import {
    initializeGit,
    getGitStatus,
    stageAllChanges,
    commitChanges,
    pushChanges,
    getGitDiff,
} from "./git/gitOperations";
import { registerCommands } from "./commands/commands";
import { registerSettingsView } from "./settings/settings";
import simpleGit from "simple-git";

let gitInitialized = false;
let genAI: GoogleGenerativeAI;
let model: any;

export async function activate(context: vscode.ExtensionContext) {
    console.log(
        "Git AI Committer is now active! Starting to register commands..."
    );
    vscode.window.showInformationMessage("Git AI Committer activated!");

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
    const apiKey = getApiKey();
    if (!apiKey) {
        vscode.window.showWarningMessage(
            "Gemini API key is not set. Please set it in the extension settings to use Git AI Committer."
        );
        vscode.env.openExternal(
            vscode.Uri.parse("https://aistudio.google.com/apikey")
        );
    }

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

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("gitAiCommitter.geminiApiKey")) {
                const apiKey = getApiKey();
                if (apiKey && (await validateApiKey())) {
                    genAI = new GoogleGenerativeAI(apiKey);
                    model = genAI.getGenerativeModel({
                        model: "gemini-2.0-flash-exp",
                    });
                    vscode.window.showInformationMessage(
                        "Gemini API Key has been updated and validated successfully!"
                    );
                }
            }

            if (e.affectsConfiguration("gitAiCommitter.enabled")) {
                const enabled = vscode.workspace
                    .getConfiguration("gitAiCommitter")
                    .get<boolean>("enabled");

                if (enabled) {
                    await enableAutoCommit();
                } else {
                    disableAutoCommit();
                }
            }
        }),
        vscode.commands.registerCommand(
            "git-ai-commiter.enableAutoCommit",
            async () => {
                console.log("enableAutoCommit command triggered");
                try {
                    await enableAutoCommit();
                } catch (error: any) {
                    console.error("Error enabling auto-commit:", error);
                    vscode.window.showErrorMessage(
                        "Failed to enable auto-commit: " + error.message
                    );
                }
            }
        ),
        vscode.commands.registerCommand(
            "git-ai-commiter.disableAutoCommit",
            async () => {
                console.log("disableAutoCommit command triggered");
                try {
                    await disableAutoCommit();
                } catch (error: any) {
                    console.error("Error disabling auto-commit:", error);
                    vscode.window.showErrorMessage(
                        "Failed to disable auto-commit: " + error.message
                    );
                }
            }
        ),
        vscode.commands.registerCommand(
            "git-ai-commiter.commitNow",
            async () => {
                console.log("commitNow command triggered");
                try {
                    await performCommit();
                } catch (error: any) {
                    console.error("Error performing commit:", error);
                    vscode.window.showErrorMessage(
                        "Failed to commit: " + error.message
                    );
                }
            }
        ),
        vscode.commands.registerCommand(
            "git-ai-commiter.setGeminiApiKey",
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    prompt: "Enter your Gemini API Key",
                    placeHolder: "Paste your API key here",
                    password: true,
                });

                if (apiKey) {
                    await vscode.workspace
                        .getConfiguration("gitAiCommitter")
                        .update(
                            "geminiApiKey",
                            apiKey,
                            vscode.ConfigurationTarget.Global
                        );
                    vscode.window.showInformationMessage(
                        "API Key saved successfully!"
                    );
                }
            }
        )
    );

    // Setup activity monitoring
    vscode.workspace.onDidChangeTextDocument(() => resetInactivityTimer());

    // Initialize if enabled by default
    if (
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<boolean>("enabled")
    ) {
        enableAutoCommit();
    }

    // Register settings view
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("gitAiCommitter.settings", {
            getChildren: () => {
                return [
                    {
                        label: "API Key",
                        description: getApiKey() ? "*****" : "Not set",
                        command: {
                            command: "git-ai-commiter.setGeminiApiKey",
                            title: "Set API Key",
                        },
                    },
                    {
                        label: "Auto Commit",
                        description: vscode.workspace
                            .getConfiguration("gitAiCommitter")
                            .get<boolean>("enabled")
                            ? "Enabled"
                            : "Disabled",
                        command: {
                            command: vscode.workspace
                                .getConfiguration("gitAiCommitter")
                                .get<boolean>("enabled")
                                ? "git-ai-commiter.disableAutoCommit"
                                : "git-ai-commiter.enableAutoCommit",
                            title: "Toggle Auto Commit",
                        },
                    },
                ];
            },
            getTreeItem: (element) => element,
        })
    );
}

async function generateCommitMessage(): Promise<string> {
    if (!(await validateApiKey())) {
        throw new Error("API key not valid");
    }

    const status = await git.status();
    if (
        !status.modified.length &&
        !status.not_added.length &&
        !status.deleted.length
    ) {
        throw new Error("No changes to commit");
    }

    if (!model) {
        return "feat: update files";
    }

    try {
        const diff = await git.diff();
        if (!diff || diff === "") {
            throw new Error("No changes to commit");
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:

${diff}`;

        const result = await model.generateContent(prompt);
        if (!result || !result.response) {
            throw new Error("Empty response from Gemini API");
        }

        if (
            !result.response.candidates ||
            !result.response.candidates[0] ||
            !result.response.candidates[0].content ||
            !result.response.candidates[0].content.parts ||
            !result.response.candidates[0].content.parts[0] ||
            !result.response.candidates[0].content.parts[0].text
        ) {
            throw new Error("No candidates in response from Gemini API");
        }

        const response = result.response.candidates[0].content.parts[0].text;

        // Clean up the message - remove quotes and newlines
        const cleanMessage = response.replace(/["'\n\r]+/g, " ").trim();

        // Ensure it follows conventional commit format
        if (!cleanMessage.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
            return "feat: update files";
        }

        return cleanMessage;
    } catch (error) {
        console.error("Error generating commit message:", error);
        throw error;
    }
}

async function performCommit() {
    try {
        const status = await git.status();

        // Check if there are any changes to commit
        if (
            !status.modified.length &&
            !status.not_added.length &&
            !status.deleted.length
        ) {
            console.log("No changes to commit");
            return;
        }

        // Stage all changes
        await git.add(".");

        // Generate commit message
        const commitMessage = await generateCommitMessage();
        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        // Commit changes
        await git.commit(commitMessage);
        vscode.window.showInformationMessage(
            `Changes committed: ${commitMessage}`
        );

        // Push changes
        try {
            await git.push();
            vscode.window.showInformationMessage("Changes pushed successfully");
        } catch (error: any) {
            console.error("Push failed:", error);
            vscode.window.showErrorMessage(
                `Failed to push changes: ${error.message}`
            );
        }
    } catch (error: any) {
        if (error.message === "No changes to commit") {
            vscode.window.showInformationMessage("No changes to commit");
            return;
        }
        console.error("Commit failed:", error);
        vscode.window.showErrorMessage(
            `Failed to commit changes: ${error.message}`
        );
    }
}

export function deactivate() {
    disableAutoCommit();
}
