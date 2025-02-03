import * as vscode from "vscode";
import {
  generateWithCopilot,
  getPreferredAIProvider,
} from "../ai/copilotService";
import { git } from "../extension";
import {
  stageAllChanges,
  getGitDiff,
  commitChanges,
  pushChanges,
} from "../git/gitOperations";
import { updateVersion } from "../version/versionService";
import { generateCommitMessage } from "../ai/geminiService";

export class CommitService {
  private lastProcessedDiff = "";
  private isGeneratingMessage = false;

  async checkIfGenerating() {
    if (this.isGeneratingMessage) {
      vscode.window.showInformationMessage(
        "Commit message generation already in progress"
      );
      return true;
    }
  }

  checkIfDiffChanged(diff: string) {
    // Only compare the first 100 chars to avoid being too sensitive
    const currentDiff = diff.slice(0, 100);
    const lastDiff = this.lastProcessedDiff.slice(0, 100);

    if (currentDiff === lastDiff) {
      return false;
    }
    return true;
  }

  async handleCommitMessageGeneration(diff: string): Promise<string | null> {
    try {
      this.isGeneratingMessage = true;
      let commitMessage: string | null = null;
      const provider = await getPreferredAIProvider();
      if (!provider) {
        vscode.window.showErrorMessage("No AI provider selected");
        return null;
      } else if (provider === "gemini") {
        commitMessage = await generateCommitMessage(diff);
      } else if (provider === "copilot") {
        commitMessage = await generateWithCopilot(diff);
      }
      if (!commitMessage) {
        return null;
      }
      this.lastProcessedDiff = diff;
      return commitMessage;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to generate commit message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      // Check for changes first
      const diff = await getGitDiff();
      if (!diff || !(await this.checkIfDiffChanged(diff))) {
        return;
      }

      // Update version before generating commit message
      await updateVersion();

      const commitMessage = await this.handleCommitMessageGeneration(diff);
      if (!commitMessage) {
        vscode.window.showErrorMessage("Failed to generate commit message");
        return;
      }

      // Commit changes
      await commitChanges(commitMessage);

      // Push changes
      await pushChanges();
    } catch (error: any) {
      if (error.message === "No changes to commit") {
        return;
      }
      console.error("Commit failed:", error);
      vscode.window.showErrorMessage(
        `Failed to commit changes: ${error.message}`
      );
    }
  }
}

export const commitService = new CommitService();
