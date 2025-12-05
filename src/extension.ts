import { GoogleGenerativeAI } from "@google/generative-ai";
import simpleGit from "simple-git";
import * as vscode from "vscode";
import { GEMINI_MODEL_NAME, getApiKey } from "./ai/geminiService";
import {
    disableAutoCommit,
    enableAutoCommit,
} from "./autoCommit/autoCommitService";
import { registerCommands } from "./commands/commands";
import { commitService } from "./commit/commitService";
import {
    disposeVersionBumping,
    initializeVersionBumping,
} from "./version/versionService";

let gitInitialized = false;
let genAI: GoogleGenerativeAI;
let model: any;
export let git: ReturnType<typeof simpleGit>;

export async function activate(context: vscode.ExtensionContext) {
    // Register commands and settings view FIRST so users can access settings even if initialization fails
    registerCommands(context);

    console.log(
        "Git AI Auto Committer is now active! Starting to register commands..."
    );
    // vscode.window.showInformationMessage("Git AI Auto Committer activated!");

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
            "Gemini API key is not set. Please set it in the extension settings to use Git AI Auto Committer."
        );
        vscode.env.openExternal(
            vscode.Uri.parse("https://aistudio.google.com/apikey")
        );
        // Don't return here, proceed to register rest of properties so settings can be accessed
        // return;
    }

    if (apiKey) {
        try {
            genAI = new GoogleGenerativeAI(apiKey);
            model = genAI.getGenerativeModel({
                model: GEMINI_MODEL_NAME,
            });
        } catch (error) {
            console.error("Failed to initialize Gemini:", error);
        }
    }
    // }

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("gitAiCommitter.geminiApiKey")) {
                const apiKey = getApiKey();
                if (apiKey) {
                    genAI = new GoogleGenerativeAI(apiKey);
                    model = genAI.getGenerativeModel({
                        model: GEMINI_MODEL_NAME,
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

            // Handle gitattributes patterns changes
            if (
                e.affectsConfiguration(
                    "gitAiCommitter.gitattributesFilePatterns"
                )
            ) {
                try {
                    // Update gitattributes immediately when patterns change
                    await commitService.updateGitattributes();
                    vscode.window.showInformationMessage(
                        "Git attributes patterns updated successfully!"
                    );
                } catch (error) {
                    console.error(
                        "Failed to update gitattributes on setting change:",
                        error
                    );
                    vscode.window.showWarningMessage(
                        "Failed to update gitattributes file. It will be updated on the next commit."
                    );
                }
            }
        })
    );

    // Enable auto-commit by default
    try {
        enableAutoCommit();
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

    // Initialize version bumping
    initializeVersionBumping();
}

export function deactivate() {
    disableAutoCommit();
    disposeVersionBumping();
}
