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
  private maxRetries = 2;
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

  checkIfDiffChanged(diff: string) {
    // Compare full diff content but normalize whitespace
    const normalizedCurrent = diff.replace(/\s+/g, " ").trim();
    const normalizedLast = this.lastProcessedDiff.replace(/\s+/g, " ").trim();

    return normalizedCurrent !== normalizedLast;
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

  private async hasRealChanges(status: any): Promise<boolean> {
    // Check if there are changes to non-version files
    const versionFiles = this.getVersionFiles();
    const allChangedFiles = [
      ...status.modified,
      ...status.not_added,
      ...status.deleted
    ];
    
    // Filter out version files to see if there are real changes
    const realChanges = allChangedFiles.filter(file => 
      !versionFiles.some(versionFile => file.includes(versionFile))
    );
    
    return realChanges.length > 0;
  }

  private getVersionFiles(): string[] {
    const versionFiles = [
      "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
      "pyproject.toml", "build.gradle", "pom.xml", "Cargo.toml", "composer.json",
      "project.clj", "*.csproj", "setup.py", "version.txt", "VERSION",
      "wxt.config.ts", "wxt.config.js"
    ];
    return versionFiles;
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
          // No changes to commit
          return;
        }

        // 2. Stage all existing changes (excluding potential version files initially)
        const stagedAll = await stageAllChanges();
        if (!stagedAll) {
          vscode.window.showErrorMessage("Failed to stage changes. Aborting commit.");
          return;
        }
 
        // 3. Check if we have real changes (not just version files)
        const hasRealChanges = await this.hasRealChanges(status);
        if (!hasRealChanges) {
          // No real code changes, only version file changes or nothing meaningful
          return;
        }
  
        // 4. Generate commit message based on the staged changes
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
  
        // 5. Update version and stage version files (if enabled)
        const versionUpdateResult = await updateVersion();
        // Check if version update failed specifically due to staging
        if (versionUpdateResult === false) {
          vscode.window.showErrorMessage("Failed to stage version files. Aborting commit.");
          return;
        }
        // Allow proceeding if version bumping is disabled (null) or succeeded (string)
  
        // 6. Commit all staged changes (original + version files)
        await commitChanges(commitMessage);
  
        // 7. Push changes
        await pushChanges();
        
        // Reset failure state on successful commit
        this.lastCommitAttemptTime = 0; // Reset on successful commit
      } catch (error: any) {
        if (error.message === "No changes to commit") {
          return;
        }
        // Commit failed
        vscode.window.showErrorMessage(
          `Failed to commit changes: ${error.message}`
        );
      }
    }
}

export const commitService = new CommitService();
