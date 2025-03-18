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

export async function pushChanges() {
  try {
    // Check for any staged or unstaged changes before pull
    const preStatus = await git.status();
    const hasChanges = preStatus.staged.length > 0 || 
                        preStatus.modified.length > 0 || 
                        preStatus.not_added.length > 0;
    
    // If we have any changes, stage them first
    if (hasChanges) {
      await stageAllChanges();
      await git.commit("chore: pre-push changes", { "--allow-empty": null });
    }

    // First try to pull any remote changes
    try {
      await git.pull();
    } catch (pullError) {
      console.error("Pull failed:", pullError);
      // If pull fails, show error but continue with push attempt
    }

    // Attempt to push
    await git.push();
    
    // Check if we still have changes after push
    const postStatus = await git.status();
    if (postStatus.modified.length || postStatus.not_added.length || postStatus.deleted.length) {
      console.log("Changes detected after push, staging them for next commit");
      await stageAllChanges();
    }
  } catch (error) {
    console.error("Push failed:", error);
    vscode.window.showErrorMessage(
      `Failed to push changes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
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
