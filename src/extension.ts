import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "./ai/geminiService";
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
import { commitService } from "./commit/commitService";

let gitInitialized = false;
let genAI: GoogleGenerativeAI;
let model: any;
export let git: ReturnType<typeof simpleGit>;

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
        gitInitialized = true;
    } catch (error) {
        vscode.window.showWarningMessage(
            "No Git repository found in the current workspace. Auto-commit will be enabled but won't work until a Git repository is initialized."
        );
        gitInitialized = false;
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
        return;
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
    });
    // }

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("gitAiCommitter.geminiApiKey")) {
                const apiKey = getApiKey();
                if (apiKey) {
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
                    await commitService.performCommit();
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

    // Enable auto-commit by default
    const interval = vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<number>("commitInterval", 60000); // Default to 1 minute
    try {
        enableAutoCommit(interval);
        // Periodically check for git repo initialization
        setInterval(async () => {
            if (!gitInitialized) {
                try {
                    await git.checkIsRepo();
                    gitInitialized = true;
                    vscode.window.showInformationMessage(
                        "Git repository detected! Auto-commit is now active."
                    );
                } catch (error) {
                    // Still no git repo
                }
            }
        }, 10000); // Check every 10 seconds
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(
                `Failed to enable auto-commit: ${error.message}`
            );
        }
    }

    // Register commands and settings view
    registerCommands(context);
    registerSettingsView(context);
}

export function deactivate() {
    disableAutoCommit();
}
