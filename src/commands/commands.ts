import * as vscode from "vscode";
import {
    initializeGit,
    getGitStatus,
    stageAllChanges,
    commitChanges,
    pushChanges,
    getGitDiff,
} from "../git/gitOperations";
import {
    generateCommitMessage,
    validateApiKey,
    getApiKey as getGeminiApiKey,
} from "../ai/geminiService";
import {
    enableAutoCommit,
    disableAutoCommit,
} from "../autoCommit/autoCommitService";

export async function performCommit() {
    try {
        const status = await getGitStatus();

        if (
            !status.modified.length &&
            !status.not_added.length &&
            !status.deleted.length
        ) {
            console.log("No changes to commit");
            return;
        }

        await stageAllChanges();
        const commitMessage = await generateCommitMessage(await getGitDiff());

        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        await commitChanges(commitMessage);
        vscode.window.showInformationMessage(
            `Changes committed: ${commitMessage}`
        );

        try {
            await pushChanges();
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

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "git-ai-commiter.enableAutoCommit",
            async () => {
                console.log("enableAutoCommit command triggered");
                try {
                    await initializeGit();
                    if (await validateApiKey()) {
                        const config =
                            vscode.workspace.getConfiguration("gitAiCommitter");
                        const intervalSeconds = config.get<number>(
                            "commitInterval",
                            60
                        );

                        if (intervalSeconds <= 0) {
                            vscode.window.showErrorMessage(
                                "Auto-commit interval must be greater than 0"
                            );
                            return;
                        }

                        const intervalMinutes = Math.ceil(intervalSeconds / 60);
                        enableAutoCommit(intervalMinutes);
                        vscode.window.showInformationMessage(
                            `Auto-commit enabled (every ${intervalMinutes} minute${
                                intervalMinutes > 1 ? "s" : ""
                            })`
                        );
                    }
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
                    await initializeGit();
                    if (await validateApiKey()) {
                        await performCommit();
                    }
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
}
