import simpleGit from "simple-git";
import * as vscode from "vscode";

export const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);

export async function initializeGit(): Promise<void> {
    try {
        await git.checkIsRepo();
    } catch (error) {
        throw new Error("No Git repository found");
    }
}

export async function getGitStatus(): Promise<{
    modified: string[];
    not_added: string[];
    deleted: string[];
}> {
    const status = await git.status();
    return {
        modified: status.modified,
        not_added: status.not_added,
        deleted: status.deleted,
    };
}

export async function stageAllChanges(): Promise<boolean> {
    try {
        await git.add(".");
        return true;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to stage changes: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return false;
    }
}

export async function commitChanges(message: string): Promise<boolean> {
    try {
        await git.commit(message);
        return true;
    } catch (error) {
        // If commit fails because there are no changes, just return false silently
        // This can happen if we race condition with other tools
        if (
            error instanceof Error &&
            error.message.includes("nothing to commit")
        ) {
            return false;
        }

        vscode.window.showErrorMessage(
            `Failed to commit changes: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return false;
    }
}

export async function amendCommit(message: string): Promise<boolean> {
    try {
        // --amend replaces the last commit with the staged changes and new message
        // --no-edit would keep the old message, but we want to update it
        await git.commit(message, { "--amend": null });
        return true;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to amend commit: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return false;
    }
}

export async function commitReset(): Promise<void> {
    try {
        // Reset the last commit and keep all changes staged
        await git.reset(["--soft", "HEAD^"]);
    } catch (error) {
        console.error("Failed to reset commit:", error);
        throw error;
    }
}

export async function pushChanges(force: boolean = false) {
    const options = force ? ["--force-with-lease"] : [];
    try {
        await git.push(options);
    } catch (error: any) {
        if (error.message && error.message.includes("no upstream branch")) {
            try {
                // Try to get current branch
                const branchSummary = await git.branchLocal();
                const currentBranch = branchSummary.current;

                if (currentBranch) {
                    vscode.window.showInformationMessage(
                        `Setting upstream for branch '${currentBranch}' and pushing...`
                    );
                    await git.push([
                        "--set-upstream",
                        "origin",
                        currentBranch,
                        ...options,
                    ]);
                    return;
                }
            } catch (innerError) {
                console.error("Failed to set upstream:", innerError);
            }
        }
        // Re-throw if it wasn't the upstream issue or if recovery failed
        console.error("Failed to push:", error);
        throw error;
    }
}

export async function getGitDiff(): Promise<string> {
    try {
        // We want the diff of staged changes because we stage everything before generating the message
        return await git.diff(["--cached"]);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to get diff: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return "";
    }
}

export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: string;
    files: string[];
}

export async function getCommitHistory(count: number): Promise<CommitInfo[]> {
    try {
        const log = await git.log({ n: count });

        const commits: CommitInfo[] = await Promise.all(
            log.all.map(async (commit) => {
                const files = await getCommitFiles(commit.hash);
                return {
                    hash: commit.hash,
                    message: commit.message,
                    author: commit.author_name,
                    date: commit.date,
                    files,
                };
            })
        );

        return commits;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to get commit history: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return [];
    }
}

export async function getCommitFiles(hash: string): Promise<string[]> {
    try {
        const result = await git.show(["--name-only", "--format=", hash]);
        return result.split("\n").filter((line) => line.trim().length > 0);
    } catch (error) {
        console.error(`Failed to get files for commit ${hash}:`, error);
        return [];
    }
}
