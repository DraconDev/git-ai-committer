import * as path from "path";
import simpleGit from "simple-git";
import * as vscode from "vscode";

import { generateCommitMessageWithFailover } from "../ai/aiFailover";
import { getPreferredAIProvider } from "../ai/aiService";
import { versionService } from "../version/versionCoreService";
import { updateVersion } from "../version/versionService";

export class CommitService {
    // Public flags for version bump state - accessible by auto-commit service
    public versionBumpInProgress = false;
    public versionBumpCompleted = false;

    async performCommit(repoPath: string) {
        // Create a local git instance for this specific repo
        const git = simpleGit(repoPath);

        // 0. Force add files present in .gitattributes IF smartGitignore is enabled
        // We do this BEFORE detecting status so ignored files are staged and detected
        const config = vscode.workspace.getConfiguration("gitAiCommitter");
        const smartGitignore = config.get<boolean>("smartGitignore", false);

        if (smartGitignore) {
            try {
                const attributedPatterns =
                    await this.getPatternsFromGitattributes(repoPath);
                if (attributedPatterns.length > 0) {
                    await git.raw([
                        "add",
                        "--force",
                        "--",
                        ...attributedPatterns,
                    ]);
                }
            } catch (error) {
                console.log(
                    "Note: Force adding attributed files dealt with strict pathspec or missing files."
                );
            }
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
            await this.updateGitignore(repoPath, git);

            // 2. Auto-manage .gitattributes if patterns are configured
            await this.updateGitattributes(repoPath, git);

            // Re-verify that we still have changes to commit.
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

            // Define variables needed later
            const allChangedFiles = [
                ...reCheckStatus.modified,
                ...reCheckStatus.staged,
                ...reCheckStatus.created,
                ...reCheckStatus.renamed.map((f) => f.to),
                ...reCheckStatus.not_added,
            ];

            const onlyVersionFiles =
                allChangedFiles.length > 0 &&
                allChangedFiles.every(
                    (file) =>
                        versionService.isVersionFile(file) ||
                        file.endsWith(".gitignore") ||
                        file.endsWith(".gitattributes")
                );

            // Skip if only version/config files are staged (likely leftover from previous bump)
            if (onlyVersionFiles) {
                console.log(
                    "Skipping commit: only version/config files detected"
                );
                return;
            }

            // 3. Stage ALL changes
            await git.add(".");

            // 5. Get diff AFTER staging (moved logic from here)

            // 5. Get diff AFTER staging
            const currentDiff = await git.diff(["--cached"]);
            if (!currentDiff) {
                return;
            }

            // 6. Generate AI message synchronously
            // We get the provider first
            const provider = await getPreferredAIProvider();
            let commitMessage: string | null = null;
            if (provider) {
                commitMessage = await generateCommitMessageWithFailover(
                    currentDiff,
                    provider
                );
            }

            if (!commitMessage) {
                // If generation fails (or no provider), we can fall back to a default message
                // or abort? The user requested "no empty version bump commits".
                // If we abort here, the user needs to know why.
                commitMessage = `Updates: ${new Date().toISOString()}`; // Fallback
                vscode.window.showWarningMessage(
                    "AI generation failed, using timestamp as commit message."
                );
            }

            // 7. Bump version AFTER generating message (so it's not in the diff for AI)
            if (!this.versionBumpInProgress && !this.versionBumpCompleted) {
                this.versionBumpInProgress = true;
                const versionUpdateResult = await updateVersion();

                if (versionUpdateResult === false) {
                    vscode.window.showErrorMessage("Failed to update version");
                    this.versionBumpInProgress = false;
                    return;
                }

                // Stabilization Delay
                await new Promise((resolve) => setTimeout(resolve, 2000));
                this.versionBumpCompleted = true;
            }

            // 8. Stage ALL changes AGAIN (to include the new version bump)
            await git.add(".");

            // 9. Commit & Push
            await git.commit(commitMessage);
            await git.push();
            vscode.window.setStatusBarMessage(
                `Committed in ${path.basename(repoPath)}`,
                5000
            );
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

    private async updateGitignore(
        repoPath: string,
        git: ReturnType<typeof simpleGit>
    ): Promise<void> {
        try {
            const gitignorePath = path.join(repoPath, ".gitignore");
            const fs = require("fs").promises;

            let currentContent = "";
            try {
                currentContent = await fs.readFile(gitignorePath, "utf8");
            } catch (error) {
                currentContent = "";
            }

            const config = vscode.workspace.getConfiguration("gitAiCommitter");

            const patternsInGitattributes =
                await this.getPatternsFromGitattributes(repoPath);

            let patternsToRemoveFromGitignore: string[] = [];

            let updatedContent = this.removePatternsFromGitignore(
                currentContent,
                patternsToRemoveFromGitignore
            );

            const ignoredPatterns = config.get<string[]>(
                "ignoredFilePatterns",
                []
            );

            if (ignoredPatterns.length > 0) {
                const existingLines = updatedContent
                    .split("\n")
                    .map((line) => line.trim());
                const patternsToAdd = ignoredPatterns.filter((pattern) => {
                    const cleanPattern = pattern.trim();
                    if (patternsInGitattributes.includes(cleanPattern)) {
                        return false;
                    }
                    return (
                        cleanPattern && !existingLines.includes(cleanPattern)
                    );
                });

                if (patternsToAdd.length > 0) {
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

            if (updatedContent !== currentContent) {
                await fs.writeFile(gitignorePath, updatedContent);
                try {
                    await git.add(".gitignore");
                } catch (error) {
                    // OK if not tracked
                }
            }
        } catch (error) {
            console.error("Failed to update .gitignore:", error);
        }
    }

    private async getPatternsFromGitattributes(
        repoPath: string
    ): Promise<string[]> {
        try {
            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const gitattributesPatterns = config.get<string[]>(
                "gitattributesFilePatterns",
                []
            );

            const gitattributesPath = path.join(repoPath, ".gitattributes");
            const fs = require("fs").promises;

            let gitattributesContent = "";
            try {
                gitattributesContent = await fs.readFile(
                    gitattributesPath,
                    "utf8"
                );
            } catch (error) {
                return gitattributesPatterns;
            }

            const diskPatterns = gitattributesContent
                .split("\n")
                .map((line: string) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#")) {
                        return null;
                    }
                    const parts = trimmed.split(/\s+/);
                    return parts[0];
                })
                .filter(
                    (pattern: string | null): pattern is string =>
                        pattern !== null && pattern.length > 0
                );

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

    public async updateGitattributes(
        repoPath?: string,
        git?: ReturnType<typeof simpleGit>
    ): Promise<void> {
        try {
            // Use provided repoPath or fallback to first workspace folder
            const targetPath =
                repoPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!targetPath) {
                return;
            }

            const config = vscode.workspace.getConfiguration("gitAiCommitter");
            const gitattributesPatterns = config.get<string[]>(
                "gitattributesFilePatterns",
                []
            );

            if (gitattributesPatterns.length === 0) {
                return;
            }

            const gitattributesFilePath = path.join(
                targetPath,
                ".gitattributes"
            );
            const fs = require("fs").promises;

            let currentContent = "";
            try {
                currentContent = await fs.readFile(
                    gitattributesFilePath,
                    "utf8"
                );
            } catch (error) {
                currentContent = "";
            }

            const existingLines = currentContent
                .split("\n")
                .map((line: string) => line.trim());
            const patternsToAdd = gitattributesPatterns.filter(
                (pattern: string) => {
                    const cleanPattern = pattern.trim();
                    return (
                        cleanPattern && !existingLines.includes(cleanPattern)
                    );
                }
            );

            if (patternsToAdd.length === 0) {
                return;
            }

            const newContent =
                currentContent +
                (currentContent.endsWith("\n") ? "" : "\n") +
                "\n# Auto-committer gitattributes\n" +
                patternsToAdd.map((pattern: string) => pattern).join("\n") +
                "\n";

            await fs.writeFile(gitattributesFilePath, newContent);

            if (git) {
                try {
                    await git.add(".gitattributes");
                } catch (error) {
                    // OK if not tracked
                }
            }
        } catch (error) {
            console.error("Failed to update .gitattributes:", error);
        }
    }
}

export const commitService = new CommitService();
