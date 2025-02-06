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

  private getSourceControlMessage(): string | undefined {
    // Get Git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      console.debug("Git extension not found");
      return undefined;
    }

    // Get first repository's source control
    const gitApi = gitExtension.exports.getAPI(1);
    const repo = gitApi.repositories[0];
    if (!repo) {
      console.debug("No Git repository found");
      return undefined;
    }

    // Get the message from the source control input box
    return repo.inputBox.value;
  }

  async handleCommitMessageGeneration(diff: string): Promise<string | null> {
    try {
      this.isGeneratingMessage = true;
      let attempt = 0;
      let error: any;

      // Try multiple times if generation fails
      while (attempt < this.maxRetries) {
        try {
          const commitMessage = await generateCommitMessage(diff);
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
      // Check for changes first
      const diff = await getGitDiff();
      if (!diff) {
        console.debug("No diff found");
        return;
      }
      await stageAllChanges();

      // if (!(await this.checkIfDiffChanged(diff))) {
      //   console.debug("Diff hasn't changed");
      //   return;
      // }
      // // Stage all changes
      // const staged = await stageAllChanges();
      // if (!staged) {
      //   vscode.window.showErrorMessage("Failed to stage changes");
      //   return;
      // }

      // Update version before generating commit message

      const provider = await getPreferredAIProvider();
      if (!provider) {
        vscode.window.showErrorMessage("No AI provider selected");
        return null;
      }

      let commitMessage: string | null = null;

      if (provider === "gemini") {
        commitMessage = await this.handleCommitMessageGeneration(diff);
      } else if (provider === "copilot") {
        commitMessage = await generateWithCopilot(diff);
        if (!commitMessage) {
          // vscode.window.showErrorMessage("Failed to generate message with Copilot");
          return;
        }
      }

      if (!commitMessage) {
        vscode.window.showErrorMessage(
          `Failed to get commit message from ${provider}`
        );
        return;
      }

      await updateVersion();

      // Commit the changes
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
