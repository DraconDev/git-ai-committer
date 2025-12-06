import * as vscode from "vscode";

import { generateCommitMessageWithFailover } from "../ai/aiFailover";
import { getPreferredAIProvider } from "../ai/aiService";
import { generateGeminiMessage } from "../ai/geminiService";
import { git } from "../extension";
import {
    commitChanges,
    getGitDiff,
    pushChanges,
    stageAllChanges,
} from "../git/gitOperations";
import { versionService } from "../version/versionCoreService";
import { updateVersion } from "../version/versionService";

export class CommitService {
    private lastProcessedDiff = "";
    private isGeneratingMessage = false;
    private lastCommitAttemptTime = 0;
    private readonly retryDelay = 60000; // 1 minute
    // Public flags for version bump state - accessible by auto-commit service
    public versionBumpInProgress = false;
    public versionBumpCompleted = false;

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

            // 2. Auto-manage .gitattributes if patterns are configured
            await this.updateGitattributes();

            // Re-verify that we still have changes to commit.
            // This prevents "empty version bumps" where the only change would be the version bump itself,
            // if the initial changes were resolved or ignored by the steps above.
            const reCheckStatus = await git.status();
            if (
                !reCheckStatus.modified.length &&
                !reCheckStatus.not_added.length &&
                !reCheckStatus.deleted.length &&
                !reCheckStatus.staged.length &&
                !reCheckStatus.created.length &&
                !reCheckStatus.renamed.length
            ) {
                return;
            }

            // 3. Bump version BEFORE getting diff (version bump happens on ALL commits)
            // Safety check: Don't bump version if the ONLY changes are to version files/lock files
            // This prevents infinite loops where a lockfile update triggers another bump
            const allChangedFiles = [
                ...reCheckStatus.modified,
                ...reCheckStatus.staged,
                ...reCheckStatus.created,
                ...reCheckStatus.renamed.map((f) => f.to),
                ...reCheckStatus.not_added,
            ];

            const onlyVersionFiles =
                allChangedFiles.length > 0 &&
                allChangedFiles.every((file) =>
                    versionService.isVersionFile(file)
                );

            let versionUpdateResult: string | false | null = null;
            if (!this.versionBumpInProgress && !this.versionBumpCompleted) {
                if (onlyVersionFiles) {
                    console.log(
                        "Skipping version bump: only different version files detected"
                    );
                } else {
                    this.versionBumpInProgress = true;
                    versionUpdateResult = await updateVersion();
                    if (versionUpdateResult === false) {
                        vscode.window.showErrorMessage(
                            "Failed to update version"
                        );
                        this.versionBumpInProgress = false;
                        return;
                    }
                    this.versionBumpCompleted = true;
                }
            }

            // 4. Stage ALL changes (including version files if bumped)
            const stagedAll = await stageAllChanges();
            if (!stagedAll) {
                vscode.window.showErrorMessage("Failed to stage changes");
                this.versionBumpInProgress = false;
                this.versionBumpCompleted = false;
                return;
            }

            // 5. Get diff AFTER staging (includes version changes if any)
            const currentDiff = await getGitDiff();
            if (!currentDiff) {
                return;
            }

            // 6. Generate commit message from staged changes using failover system
            const provider = await getPreferredAIProvider();

            if (!provider) {
                vscode.window.showErrorMessage("No AI provider selected");
                return;
            }

            let commitMessage = await generateCommitMessageWithFailover(
                currentDiff,
                provider
            );

            if (!commitMessage) {
                // Message generation failed after all attempts - don't commit
                return;
            }

            // 7. Commit all and push
            const commitSuccess = await commitChanges(commitMessage);
            if (commitSuccess) {
                await pushChanges();
                this.lastCommitAttemptTime = 0; // Reset failure state
            }
        } catch (error: any) {
            if (error.message === "No changes to commit") {
                this.versionBumpInProgress = false; // Reset flag on error
                this.versionBumpCompleted = false; // Reset completion flag on error
                return;
            }
            vscode.window.showErrorMessage(
                `Failed to commit changes: ${error.message}`
            );
        } finally {
            // Always reset version bump flags after commit attempt
            this.versionBumpInProgress = false;
            this.versionBumpCompleted = false;
        }
    }

    private async updateGitignore(): Promise<void> {
        try {
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

            // Step 1: Remove patterns from .gitignore that are explicitly allowed in .gitattributes
            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const smartGitignore = config.get<boolean>("smartGitignore", false);

            // ALWAYS get patterns from gitattributes to prevent them from being added back
            const patternsInGitattributes =
                await this.getPatternsFromGitattributes();

            let patternsToRemoveFromGitignore: string[] = [];
            if (smartGitignore) {
                patternsToRemoveFromGitignore = patternsInGitattributes;
            }

            let updatedContent = this.removePatternsFromGitignore(
                currentContent,
                patternsToRemoveFromGitignore
            );

            // Step 2: Add new patterns from configuration if any
            const ignoredPatterns = config.get<string[]>(
                "ignoredFilePatterns",
                []
            );

            if (ignoredPatterns.length > 0) {
                // Check which patterns are already in .gitignore
                const existingLines = updatedContent
                    .split("\n")
                    .map((line) => line.trim());
                const patternsToAdd = ignoredPatterns.filter((pattern) => {
                    const cleanPattern = pattern.trim();
                    // ALWAYS block adding back patterns that are in gitattributes, regardless of smartGitignore setting
                    if (patternsInGitattributes.includes(cleanPattern)) {
                        return false;
                    }

                    return (
                        cleanPattern && !existingLines.includes(cleanPattern)
                    );
                });

                if (patternsToAdd.length > 0) {
                    // Add auto-committer section
                    const header = "# Auto-committer ignored files";
                    const headerExists = updatedContent.includes(header);

                    updatedContent =
                        updatedContent +
                        (updatedContent.endsWith("\n") ? "" : "\n") +
                        (headerExists ? "" : `\n${header}\n`) +
                        patternsToAdd.map((pattern) => pattern).join("\n") +
                        "\n";
                }
            }

            // Only write if content has changed
            if (updatedContent !== currentContent) {
                await fs.writeFile(gitignorePath, updatedContent);

                // Add .gitignore to git if not already tracked
                try {
                    await git.add(".gitignore");
                } catch (error) {
                    // .gitignore might not be in the repo yet, that's OK
                }
            }
        } catch (error) {
            console.error("Failed to update .gitignore:", error);
            // Don't fail the commit if .gitignore update fails
        }
    }

    private async getPatternsFromGitattributes(): Promise<string[]> {
        try {
            // Read patterns from the VSCode settings that Git AI Committer manages
            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const gitattributesPatterns = config.get<string[]>(
                "gitattributesFilePatterns",
                []
            );

            // Also check the existing .gitattributes file on disk for any manually added patterns
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return gitattributesPatterns;
            }

            const gitattributesPath =
                workspaceFolder.uri.fsPath + "/.gitattributes";
            const fs = require("fs").promises;

            let gitattributesContent = "";
            try {
                gitattributesContent = await fs.readFile(
                    gitattributesPath,
                    "utf8"
                );
            } catch (error) {
                // .gitattributes doesn't exist, return just the configured patterns
                return gitattributesPatterns;
            }

            // Extract file patterns from the .gitattributes file on disk
            // Each line format is: pattern attribute1 attribute2 ...
            // We want just the pattern part (first column)
            const diskPatterns = gitattributesContent
                .split("\n")
                .map((line) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#")) {
                        return null;
                    }
                    // Extract the first column (file pattern) before any attributes
                    // Split by any whitespace (space or tab)
                    const parts = trimmed.split(/\s+/);
                    return parts[0];
                })
                .filter(
                    (pattern): pattern is string =>
                        pattern !== null && pattern.length > 0
                );

            // Combine configured patterns with patterns from disk
            // Remove duplicates
            const allPatterns = [
                ...new Set([...gitattributesPatterns, ...diskPatterns]),
            ];

            return allPatterns;
        } catch (error) {
            console.error("Failed to read .gitattributes settings:", error);
            return [];
        }
    }

    private removePatternsFromGitignore(
        gitignoreContent: string,
        patternsToRemove: string[]
    ): string {
        if (patternsToRemove.length === 0) {
            return gitignoreContent;
        }

        const lines = gitignoreContent.split("\n");
        const filteredLines = lines.filter((line) => {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith("#")) {
                return true;
            }

            // Check if this line matches any pattern we should remove
            for (const pattern of patternsToRemove) {
                const cleanPattern = pattern.trim();
                if (cleanPattern) {
                    // Remove exact matches
                    if (trimmedLine === cleanPattern) {
                        return false;
                    }
                    // Remove lines that start with the pattern (for patterns like "*.env")
                    if (
                        cleanPattern.includes("*") &&
                        trimmedLine.startsWith(cleanPattern)
                    ) {
                        return false;
                    }
                    // For non-wildcard patterns, also check if line contains the pattern
                    if (
                        !cleanPattern.includes("*") &&
                        trimmedLine.includes(cleanPattern)
                    ) {
                        return false;
                    }
                }
            }
            return true;
        });
        return filteredLines.join("\n");
    }

    public async updateGitattributes(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const gitattributesPatterns = config.get<string[]>(
                "gitattributesFilePatterns",
                []
            );

            if (gitattributesPatterns.length === 0) {
                return; // No patterns to add, skip gitattributes generation
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const gitattributesPath =
                workspaceFolder.uri.fsPath + "/.gitattributes";
            const fs = require("fs").promises;

            let currentContent = "";
            try {
                currentContent = await fs.readFile(gitattributesPath, "utf8");
            } catch (error) {
                // .gitattributes doesn't exist, start with empty content
                currentContent = "";
            }

            // Check which patterns are already in .gitattributes
            const existingLines = currentContent
                .split("\n")
                .map((line) => line.trim());
            const patternsToAdd = gitattributesPatterns.filter((pattern) => {
                const cleanPattern = pattern.trim();
                return cleanPattern && !existingLines.includes(cleanPattern);
            });

            if (patternsToAdd.length === 0) {
                return; // All patterns already in .gitattributes
            }

            // Add auto-committer section
            const newContent =
                currentContent +
                (currentContent.endsWith("\n") ? "" : "\n") +
                "\n# Auto-committer gitattributes\n" +
                patternsToAdd.map((pattern) => pattern).join("\n") +
                "\n";

            await fs.writeFile(gitattributesPath, newContent);

            // Add .gitattributes to git if not already tracked
            try {
                await git.add(".gitattributes");
            } catch (error) {
                // .gitattributes might not be in the repo yet, that's OK
            }
        } catch (error) {
            console.error("Failed to update .gitattributes:", error);
            // Don't fail the commit if .gitattributes update fails
        }
    }
}

export const commitService = new CommitService();
