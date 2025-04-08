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
import { error } from "console";

export class CommitService {
  private lastProcessedDiff = "";
  private isGeneratingMessage = false;
  private maxRetries = 2;

  async checkIfGenerating() {
    if (this.isGeneratingMessage) {
      vscode.window.showInformationMessage(
        "Commit message generation already in progress"
      );
      return true;
    }
  }

  checkIfDiffChanged(diff: string) {
    // Compare full diff content but normalize whitespace
    const normalizedCurrent = diff.replace(/\s+/g, " ").trim();
    const normalizedLast = this.lastProcessedDiff.replace(/\s+/g, " ").trim();

    return normalizedCurrent !== normalizedLast;
  }

  async handleCommitMessageGeneration(diff: string): Promise<string | null> {
    try {
      this.isGeneratingMessage = true;
      let attempt = 0;
      let error: any;

      // Try multiple times if generation fails
      while (attempt < this.maxRetries) {
        try {
          const commitMessage = await generateGeminiMessage(diff);
          if (commitMessage) {
            this.lastProcessedDiff = diff;
            return commitMessage;
          }
        } catch (e) {
          error = e;
          attempt++;
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s between retries
          }
        }
      }

      // If all retries failed, throw the last error
      if (error) {
        throw error;
      }

      return null;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to generate commit message with Gemini: ${
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
        // 1. Check for changes first
        const diff = await getGitDiff();
        if (!diff) {
          console.debug("No diff found");
          return;
        }

        // 2. Stage all existing changes (excluding potential version files initially)
        const stagedAll = await stageAllChanges();
        if (!stagedAll) {
          vscode.window.showErrorMessage("Failed to stage changes. Aborting commit.");
          return;
        }

        // 3. Generate commit message based on the staged changes
        let commitMessage = "";
        const provider = await getPreferredAIProvider();

        if (!provider) {
        vscode.window.showErrorMessage("No AI provider selected");
        return;
      }

      if (provider === AIProvider.Gemini) {
        const geminiMessage = await this.handleCommitMessageGeneration(diff);
        if (!geminiMessage) {
          vscode.window.showErrorMessage(
            "Failed to generate message with Gemini"
          );
          return;
        }
        commitMessage = geminiMessage;
      } else if (provider === AIProvider.Copilot) {
        commitMessage = await generateWithCopilot(diff);
        if (!commitMessage) {
          vscode.window.showErrorMessage(
            "Failed to generate message with Copilot"
          );
          return;
        }
      }

      // 4. Update version and stage version files (if enabled)
      const versionUpdateResult = await updateVersion();
      // Check if version update failed specifically due to staging
      if (versionUpdateResult === false) {
        vscode.window.showErrorMessage("Failed to stage version files. Aborting commit.");
        // Note: We might want to unstage the previously staged changes here,
        // but for now, we'll leave them staged and abort.
        return;
      }
      // Allow proceeding if version bumping is disabled (null) or succeeded (string)

      // 5. Commit all staged changes (original + version files)
      await commitChanges(commitMessage);

      // 6. Push changes
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
