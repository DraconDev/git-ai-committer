import * as vscode from "vscode";

import { generateWithCopilot } from "../ai/copilotService";
import { getPreferredAIProvider, AIProvider } from "../ai/aiService";
import { git } from "../extension";
import {
  stageAllChanges,
  getGitDiff,
  commitChanges,
  pushChanges,
} from "../git/gitOperations";
import { updateVersion } from "../version/versionService";
import { generateGeminiMessage } from "../ai/geminiService";

export class CommitService {
  private lastProcessedDiff = "";
  private isGeneratingMessage = false;
  private lastCommitAttemptTime = 0;
  private readonly retryDelay = 60000; // 1 minute

  async checkIfGenerating() {
    if (this.isGeneratingMessage) {
      vscode.window.showInformationMessage(
        "Commit message generation already in progress"
      );
      return true;
    }
  }

  async handleCommitMessageGeneration(diff: string): Promise<string | null> {
    try {
      this.isGeneratingMessage = true;
      
      // Check if we need to wait (backoff)
      const now = Date.now();
      if (now - this.lastCommitAttemptTime < this.retryDelay) {
        return null; // Skip during backoff period
      }

      try {
        const commitMessage = await generateGeminiMessage(diff);
        if (commitMessage) {
          this.lastProcessedDiff = diff;
          this.lastCommitAttemptTime = 0; // Reset on success
          return commitMessage;
        }
      } catch (error) {
        this.lastCommitAttemptTime = now; // Record failure time
        vscode.window.showErrorMessage(
          `Failed to generate commit message: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return null;
      }

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
      // 1. Get all changes
      const fullDiff = await getGitDiff();
      if (!fullDiff) {
        return;
      }

      // 2. Generate commit message from all changes
      let commitMessage = "";
      const provider = await getPreferredAIProvider();

      if (!provider) {
        vscode.window.showErrorMessage("No AI provider selected");
        return;
      }

      if (provider === AIProvider.Gemini) {
        const geminiMessage = await this.handleCommitMessageGeneration(fullDiff);
        if (!geminiMessage) {
          vscode.window.showErrorMessage("Failed to generate message with Gemini");
          return;
        }
        commitMessage = geminiMessage;
      } else if (provider === AIProvider.Copilot) {
        commitMessage = await generateWithCopilot(fullDiff);
        if (!commitMessage) {
          vscode.window.showErrorMessage("Failed to generate message with Copilot");
          return;
        }
      }

      // 3. Bump version
      const versionUpdateResult = await updateVersion();
      if (versionUpdateResult === false) {
        vscode.window.showErrorMessage("Failed to update version");
        return;
      }

      // 4. Stage all changes
      const stagedAll = await stageAllChanges();
      if (!stagedAll) {
        vscode.window.showErrorMessage("Failed to stage changes");
        return;
      }

      // 5. Commit all and push
      await commitChanges(commitMessage);
      await pushChanges();
      
      // Reset failure state on successful commit
      this.lastCommitAttemptTime = 0;
    } catch (error: any) {
      if (error.message === "No changes to commit") {
        return;
      }
      vscode.window.showErrorMessage(`Failed to commit changes: ${error.message}`);
    }
  }
}

export const commitService = new CommitService();
