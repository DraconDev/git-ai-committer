import * as vscode from "vscode";

import { generateWithCopilot } from "../ai/copilotService";
import { getPreferredAIProvider, AIProvider } from "../ai/aiService";
import { git } from "../extension";
import {
  stageAllChanges,
  getGitDiff,
  commitChanges,
  pushChanges,
  getGitStatus,
} from "../git/gitOperations";
import { updateVersion, isVersionBumpingEnabled } from "../version/versionService";
import { generateGeminiMessage } from "../ai/geminiService";

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

    try {
      // First check if there are any changes to commit
      const status = await git.status();
      if (
        !status.modified.length &&
        !status.not_added.length &&
        !status.deleted.length
      ) {
        return;
      }
      
      // First update version if enabled, this creates new changes
      if (isVersionBumpingEnabled()) {
        await updateVersion();
      }
      
      // Stage all changes including version updates
      await stageAllChanges();
      
      // Get diff AFTER staging all changes to capture everything including version updates
      const diff = await getGitDiff();
      if (!diff) {
        console.debug("No diff found after staging");
        return;
      }

      // Generate commit message
      let commitMessage = "";
      const provider = await getPreferredAIProvider();
      
      if (!provider) {
        vscode.window.showErrorMessage("No AI provider selected");
        return;
      }

      if (provider === AIProvider.Gemini) {
        const geminiMessage = await this.handleCommitMessageGeneration(diff);
        if (!geminiMessage) {
          // Fall back to a simple commit message if generation fails
          commitMessage = this.generateSimpleCommitMessage(status);
        } else {
          commitMessage = geminiMessage;
        }
      } else if (provider === AIProvider.Copilot) {
        commitMessage = await generateWithCopilot(diff);
        if (!commitMessage) {
          // Fall back to a simple commit message if generation fails
          commitMessage = this.generateSimpleCommitMessage(status);
        }
      }

      // Commit the staged changes
      await commitChanges(commitMessage);

      // Push changes immediately
      await pushChanges();
      
      // Check if there are still uncommitted changes after push (might happen with version bumping)
      const afterStatus = await git.status();
      if (
        afterStatus.modified.length ||
        afterStatus.not_added.length ||
        afterStatus.deleted.length
      ) {
        await stageAllChanges();
        await commitChanges("chore: commit remaining changes after push");
        await pushChanges();
      }
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
  
  // Simple fallback commit message generator
  private generateSimpleCommitMessage(status: any): string {
    const changedFiles = [...status.modified, ...status.not_added, ...status.deleted];
    const fileCount = changedFiles.length;
    const sampleFiles = changedFiles.slice(0, 3).join(", ");
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 5);
    
    return `chore: update ${fileCount} files (${sampleFiles}${fileCount > 3 ? '...' : ''}) at ${timestamp}`;
  }
}

export const commitService = new CommitService();
