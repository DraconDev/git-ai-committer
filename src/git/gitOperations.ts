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
    vscode.window.showErrorMessage(
      `Failed to commit changes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return false;
  }
}

export async function pushChanges(): Promise<boolean> {
  
    // First try to pull any remote changes
    try {
      await git.pull();
    } catch (pullError) {
      console.error("Pull failed:", pullError);
      // If pull fails, show error but continue with push attempt
      vscode.window.showErrorMessage(
        `Failed to pull latest changes: ${
          pullError instanceof Error ? pullError.message : "Unknown error"
        }`
      );
    }
    await git.push();

    // Attempt to push
    
}

export async function getGitDiff(): Promise<string> {
  try {
    return await git.diff();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to get diff: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return "";
  }
}
