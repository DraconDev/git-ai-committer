import * as vscode from "vscode";
import { git } from "../extension";
import { SettingsPanel } from "../settings/settingsPanel";
import { updateVersion } from "../version/versionService";

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        // Commit Now - Manual commit command
        vscode.commands.registerCommand(
            "git-ai-committer.commitNow",
            async () => {
                try {
                    const message = await vscode.window.showInputBox({
                        prompt: "Enter commit message",
                        placeHolder: "Type your commit message here",
                    });

                    if (message) {
                        await updateVersion("minor");
                        await git.commit(message, [], {
                            "--allow-empty": null,
                        });
                        await git.push();
                        vscode.window.showInformationMessage(
                            "Committed and pushed successfully!"
                        );
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(
                        "Failed to commit: " + error.message
                    );
                }
            }
        ),

        // Open Settings - Opens the comprehensive settings panel
        vscode.commands.registerCommand(
            "git-ai-committer.openSettings",
            async () => {
                SettingsPanel.createOrShow(context.extensionUri);
            }
        ),

        // Create Feature Summary - Analyzes past commits and creates summary
        vscode.commands.registerCommand(
            "git-ai-committer.createFeatureSummary",
            async () => {
                try {
                    const config =
                        vscode.workspace.getConfiguration("gitAiCommitter");
                    const defaultCount = config.get<number>(
                        "featureSummary.defaultCommitCount",
                        25
                    );
                    const includeFiles = config.get<boolean>(
                        "featureSummary.includeFileList",
                        true
                    );

                    // Ask user how many commits to analyze
                    const input = await vscode.window.showInputBox({
                        prompt: "How many commits should I analyze?",
                        value: defaultCount.toString(),
                        placeHolder: "Enter number of commits (1-200)",
                        validateInput: (value) => {
                            const num = parseInt(value);
                            if (isNaN(num) || num < 1 || num > 200) {
                                return "Please enter a number between 1 and 200";
                            }
                            return null;
                        },
                    });

                    if (!input) {
                        return; // User cancelled
                    }

                    const commitCount = parseInt(input);

                    // Show progress
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `Analyzing last ${commitCount} commits...`,
                            cancellable: false,
                        },
                        async (progress) => {
                            const {
                                analyzeCommitsForFeature,
                                formatFeatureSummaryMessage,
                                createFeatureSummaryCommit,
                            } = await import(
                                "../features/featureSummaryService.js"
                            );

                            progress.report({
                                increment: 30,
                                message: "Fetching commits...",
                            });

                            const summary = await analyzeCommitsForFeature(
                                commitCount
                            );

                            if (!summary) {
                                return;
                            }

                            progress.report({
                                increment: 40,
                                message: "Generating summary...",
                            });

                            // Apply user settings
                            summary.includeFiles = includeFiles;

                            // Format message for preview
                            const message =
                                formatFeatureSummaryMessage(summary);

                            progress.report({
                                increment: 20,
                                message: "Ready for review...",
                            });

                            // Show preview and get confirmation
                            const action =
                                await vscode.window.showInformationMessage(
                                    `Feature summary ready for ${commitCount} commits`,
                                    {
                                        modal: true,
                                        detail: `${message}\n\n---\n\nVersion bump suggestion: ${summary.versionBump}`,
                                    },
                                    "Create Commit",
                                    "Cancel"
                                );

                            if (action === "Create Commit") {
                                progress.report({
                                    increment: 10,
                                    message: "Creating commit...",
                                });
                                const success =
                                    await createFeatureSummaryCommit(summary);

                                if (success) {
                                    // Check if auto version bump is enabled
                                    const autoVersionBump = config.get<boolean>(
                                        "featureSummary.autoVersionBump",
                                        false
                                    );

                                    if (
                                        autoVersionBump &&
                                        summary.versionBump !== "none"
                                    ) {
                                        await updateVersion(
                                            summary.versionBump
                                        );
                                        vscode.window.showInformationMessage(
                                            `✅ Summary created and version bumped (${summary.versionBump})`
                                        );
                                    }
                                }
                            }
                        }
                    );
                } catch (error: any) {
                    vscode.window.showErrorMessage(
                        "Failed to create feature summary: " + error.message
                    );
                }
            }
        )
    );
}
