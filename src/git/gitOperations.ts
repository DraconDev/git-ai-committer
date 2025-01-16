import * as vscode from "vscode";

export async function initializeGit(): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }
}

export async function getGitStatus(): Promise<{
    modified: string[];
    not_added: string[];
    deleted: string[];
}> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }

    const repo = api.repositories[0];
    const status = await repo.status();

    return {
        modified: status.state.workingTreeChanges.map(
            (change: vscode.SourceControlResourceState) =>
                change.resourceUri.fsPath
        ),
        not_added: status.state.untrackedChanges.map(
            (change: vscode.SourceControlResourceState) =>
                change.resourceUri.fsPath
        ),
        deleted: status.state.deletions.map(
            (change: vscode.SourceControlResourceState) =>
                change.resourceUri.fsPath
        ),
    };
}

export async function stageAllChanges(): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }

    const repo = api.repositories[0];
    await repo.add([]); // Empty array stages all changes
}

export async function commitChanges(message: string): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }

    const repo = api.repositories[0];
    await repo.commit(message);
}

export async function pushChanges(): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }

    const repo = api.repositories[0];
    await repo.push();
}

export async function getGitDiff(): Promise<string> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
        throw new Error("Git extension not available");
    }

    const api = gitExtension.getAPI(1);
    if (!api.repositories.length) {
        throw new Error("No Git repository found");
    }

    const repo = api.repositories[0];
    const diff = await repo.diff();
    return diff;
}
