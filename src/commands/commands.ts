import * as vscode from "vscode";
import {
    enableAutoCommit,
    disableAutoCommit,
} from "../autoCommit/autoCommitService";

import { getApiKey } from "../ai/geminiService";
import { commitService } from "../commit/commitService";

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "git-ai-committer.enableAutoCommit",
            async () => {
                console.log("enableAutoCommit command triggered");
                try {
                    const interval = vscode.workspace
                        .getConfiguration("gitAiCommitter")
                        .get<number>("commitInterval", 60000);
                    await enableAutoCommit(interval);
                } catch (error: any) {
                    console.error("Error enabling auto-commit:", error);
                    vscode.window.showErrorMessage(
                        "Failed to enable auto-commit: " + error.message
                    );
                }
            }
        ),
        vscode.commands.registerCommand(
            "git-ai-committer.disableAutoCommit",
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
            "git-ai-committer.commitNow",
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
            "git-ai-committer.setGeminiApiKey",
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
}
