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

export async function stageAllChanges(): Promise<void> {
    await git.add(".");
}

export async function commitChanges(message: string): Promise<void> {
    await git.commit(message);
}

export async function pushChanges(): Promise<void> {
    await git.push();
}

export async function getGitDiff(): Promise<string> {
    return await git.diff();
}
