import * as vscode from "vscode";
import * as simpleGit from "simple-git";
import { StatusResult } from "simple-git";

let git: simpleGit.SimpleGit | undefined;

export async function initializeGit(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath) {
        throw new Error("No workspace folder open");
    }

    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    git = simpleGit(workspacePath);

    try {
        await git.status();
    } catch (error: any) {
        if (error.message.includes("not a git repository")) {
            throw new Error(
                "Not a git repository. Please initialize git first."
            );
        }
        throw error;
    }
}

export async function getGitStatus(): Promise<StatusResult> {
    if (!git) {
        throw new Error("Git not initialized");
    }
    return await git.status();
}

export async function stageAllChanges(): Promise<void> {
    if (!git) {
        throw new Error("Git not initialized");
    }
    await git.add(".");
}

export async function commitChanges(message: string): Promise<void> {
    if (!git) {
        throw new Error("Git not initialized");
    }
    await git.commit(message);
}

export async function pushChanges(): Promise<void> {
    if (!git) {
        throw new Error("Git not initialized");
    }
    await git.push();
}

export async function getGitDiff(): Promise<string> {
    if (!git) {
        throw new Error("Git not initialized");
    }
    return await git.diff();
}
