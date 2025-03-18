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
    // Check if there are any unstaged changes before pushing
    const statusBeforePush = await git.status();
    if (statusBeforePush.modified.length || statusBeforePush.not_added.length) {
      // If there are unstaged changes, stage and commit them first
      await stageAllChanges();
      await git.commit("chore: commit changes before push");
    }
    
    // Push changes
    await git.push();
    
    // Check for changes that may have been created during the push process
    const statusAfterPush = await git.status();
    if (statusAfterPush.modified.length || statusAfterPush.not_added.length || statusAfterPush.deleted.length) {
      console.log("Changes detected after push:", statusAfterPush);
      // These will be handled in the next commit cycle
    }
    
    return true;
  } catch (error) {
    console.error("Push failed:", error);
    vscode.window.showErrorMessage(
      `Failed to push changes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return false;
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
