import * as vscode from "vscode";

import { generateCommitMessageWithFailover } from "../ai/aiFailover";
import { AIProvider } from "../ai/aiService";
import { generateGeminiMessage } from "../ai/geminiService";
import { git } from "../extension";
import {
    commitChanges,
    getGitDiff,
    pushChanges,
    stageAllChanges,
} from "../git/gitOperations";
import { updateVersion } from "../version/versionService";

export class CommitService {
    private lastProcessedDiff = "";
    private isGeneratingMessage = false;
    private lastCommitAttemptTime = 0;
    private readonly retryDelay = 60000; // 1 minute

    async checkIfGenerating() {
        if (this.isGeneratingMessage) {
            vscode.window.showInformationMessage(
                "Commit message generation already in progress"
            );
            return true;
        }
    }

    async handleCommitMessageGeneration(diff: string): Promise<string | null> {
        try {
            this.isGeneratingMessage = true;

            // Check if we need to wait (backoff)
            const now = Date.now();
            if (now - this.lastCommitAttemptTime < this.retryDelay) {
                return null; // Skip during backoff period
            }

            try {
                const commitMessage = await generateGeminiMessage(diff);
                if (commitMessage) {
                    this.lastProcessedDiff = diff;
                    this.lastCommitAttemptTime = 0; // Reset on success
                    return commitMessage;
                }
            } catch (error) {
                this.lastCommitAttemptTime = now; // Record failure time
                vscode.window.showErrorMessage(
                    `Failed to generate commit message: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
                return null;
            }

            return null;
        } finally {
            this.isGeneratingMessage = false;
        }
    }

    async performCommit() {
        // Check if commit message generation is already in progress
        if (await this.checkIfGenerating()) {
            return;
        }

        const status = await git.status();

        // Check if there are any changes to commit
        if (
            !status.modified.length &&
            !status.not_added.length &&
            !status.deleted.length
        ) {
            return;
        }

        try {
            // 1. Auto-manage .gitignore first
            await this.updateGitignore();

            // 2. Get current diff for AI message generation
            const currentDiff = await getGitDiff();
            if (!currentDiff) {
                return;
            }

            // 3. Generate commit message from current changes using failover system
            const provider = await getPreferredAIProvider();

            if (!provider) {
                vscode.window.showErrorMessage("No AI provider selected");
                return;
            }

            const commitMessage = await generateCommitMessageWithFailover(
                currentDiff,
                provider as AIProvider
            );

            if (!commitMessage) {
                // Message generation failed after all attempts - don't commit
                return;
            }

            const messageGenerated = true;

            // 4. If we got a message, now commit everything
            if (messageGenerated) {
                // Stage ALL changes
                const stagedAll = await stageAllChanges();
                if (!stagedAll) {
                    vscode.window.showErrorMessage("Failed to stage changes");
                    return;
                }

                // Bump version (this creates new changes)
                const versionUpdateResult = await updateVersion();
                if (versionUpdateResult === false) {
                    vscode.window.showErrorMessage("Failed to update version");
                    return;
                }

                // Stage version changes too
                const stagedVersion = await stageAllChanges();
                if (!stagedVersion) {
                    vscode.window.showErrorMessage(
                        "Failed to stage version changes"
                    );
                    return;
                }

                // Commit all and push
                const commitSuccess = await commitChanges(commitMessage);
                if (commitSuccess) {
                    await pushChanges();
                    this.lastCommitAttemptTime = 0; // Reset failure state
                }
            }
        } catch (error: any) {
            if (error.message === "No changes to commit") {
                return;
            }
            vscode.window.showErrorMessage(
                `Failed to commit changes: ${error.message}`
            );
        }
    }

    private async updateGitignore(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const ignoredPatterns = config.get<string[]>(
                "ignoredFilePatterns",
                []
            );

            if (ignoredPatterns.length === 0) {
                return; // No patterns to add
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const gitignorePath = workspaceFolder.uri.fsPath + "/.gitignore";
            const fs = require("fs").promises;

            let currentContent = "";
            try {
                currentContent = await fs.readFile(gitignorePath, "utf8");
            } catch (error) {
                // .gitignore doesn't exist, start with empty content
                currentContent = "";
            }

            // Check which patterns are already in .gitignore
            const existingLines = currentContent
                .split("\n")
                .map((line) => line.trim());
            const patternsToAdd = ignoredPatterns.filter((pattern) => {
                const cleanPattern = pattern.trim();
                return cleanPattern && !existingLines.includes(cleanPattern);
            });

            if (patternsToAdd.length === 0) {
                return; // All patterns already in .gitignore
            }

            // Add auto-committer section
            const newContent =
                currentContent +
                (currentContent.endsWith("\n") ? "" : "\n") +
                "\n# Auto-committer ignored files\n" +
                patternsToAdd.map((pattern) => pattern).join("\n") +
                "\n";

            await fs.writeFile(gitignorePath, newContent);

            // Add .gitignore to git if not already tracked
            try {
                await git.add(".gitignore");
            } catch (error) {
                // .gitignore might not be in the repo yet, that's OK
            }
        } catch (error) {
            console.error("Failed to update .gitignore:", error);
            // Don't fail the commit if .gitignore update fails
        }
    }
}

export const commitService = new CommitService();
