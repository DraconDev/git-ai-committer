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

export function activate(context: vscode.ExtensionContext) {
    console.log("Git AI Committer is now active!");

    // Initialize Git
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder found");
        return;
    }

    git = simpleGit(workspaceFolders[0].uri.fsPath);

    // Initialize Gemini
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const apiKey = config.get<string>("geminiApiKey");
    if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
        });
    }

    // Register commands
    context.subscriptions.push(
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
        const response = await result.response;
        const message = response.text();

        // Clean up the message - remove quotes and newlines
        const cleanMessage = message
            .replace(/['"]/g, "")
            .replace(/\n/g, " ")
            .trim();

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
