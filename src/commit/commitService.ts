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

      // 3. Auto-manage .gitignore
      await this.updateGitignore();

      // 4. Bump version
      const versionUpdateResult = await updateVersion();
      if (versionUpdateResult === false) {
        vscode.window.showErrorMessage("Failed to update version");
        return;
      }

      // 5. Stage all changes
      const stagedAll = await stageAllChanges();
      if (!stagedAll) {
        vscode.window.showErrorMessage("Failed to stage changes");
        return;
      }

      // 6. Commit all and push
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

  private async updateGitignore(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("gitAiCommitter");
      const ignoredPatterns = config.get<string[]>("ignoredFilePatterns", [
        "*.tmp", "*.temp", "*.log", "*.cache", "*.dll", "*.exe", "*.env"
      ]);

      if (ignoredPatterns.length === 0) {
        return; // No patterns to add
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return;
      }

      const gitignorePath = workspaceFolder.uri.fsPath + '/.gitignore';
      const fs = require('fs').promises;
      
      let currentContent = '';
      try {
        currentContent = await fs.readFile(gitignorePath, 'utf8');
      } catch (error) {
        // .gitignore doesn't exist, start with empty content
        currentContent = '';
      }

      // Check which patterns are already in .gitignore
      const existingLines = currentContent.split('\n').map(line => line.trim());
      const patternsToAdd = ignoredPatterns.filter(pattern => {
        const cleanPattern = pattern.trim();
        return cleanPattern && !existingLines.includes(cleanPattern);
      });

      if (patternsToAdd.length === 0) {
        return; // All patterns already in .gitignore
      }

      // Add auto-committer section
      const newContent = currentContent + (currentContent.endsWith('\n') ? '' : '\n') +
        '\n# Auto-committer ignored files\n' +
        patternsToAdd.map(pattern => pattern).join('\n') + '\n';

      await fs.writeFile(gitignorePath, newContent);
      
      // Add .gitignore to git if not already tracked
      try {
        await git.add('.gitignore');
      } catch (error) {
        // .gitignore might not be in the repo yet, that's OK
      }
    } catch (error) {
      console.error('Failed to update .gitignore:', error);
      // Don't fail the commit if .gitignore update fails
    }
  }
}

export const commitService = new CommitService();
