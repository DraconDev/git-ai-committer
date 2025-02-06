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
  try {
    // First try to pull any remote changes
    try {
      const pullResult = await git.pull();
      
      // Check if there are merge conflicts
      const status = await git.status();
      if (status.conflicted.length > 0) {
        vscode.window.showErrorMessage(
          `Merge conflicts detected in: ${status.conflicted.join(", ")}. Please resolve conflicts before pushing.`
        );
        return false;
      }
      
    } catch (pullError) {
      // Check if error is due to local changes that would be overwritten
      if (pullError instanceof Error && pullError.message.includes("local changes")) {
        vscode.window.showErrorMessage(
          "Cannot pull updates: You have local changes that would be overwritten. Please commit or stash your changes first."
        );
        return false;
      }

      console.error("Pull failed:", pullError);
      vscode.window.showErrorMessage(
        `Failed to pull latest changes: ${
          pullError instanceof Error ? pullError.message : "Unknown error"
        }`
      );
    }

    // Attempt to push
    await git.push();
    return true;
  } catch (error) {
    // Handle specific push errors
    if (error instanceof Error) {
      if (error.message.includes("ref")) {
        vscode.window.showErrorMessage(
          "Failed to push: Remote has changes that need to be pulled first. Please try committing again."
        );
      } else {
        vscode.window.showErrorMessage(`Failed to push changes: ${error.message}`);
      }
    } else {
      vscode.window.showErrorMessage("Failed to push changes: Unknown error");
    }
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
