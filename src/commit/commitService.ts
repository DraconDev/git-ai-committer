import * as vscode from "vscode";
import {
    getApiKey,
    initializeModel,
    generateCommitMessage,
} from "../ai/geminiService";
import { git } from "../extension";
import {
    stageAllChanges,
    getGitDiff,
    commitChanges,
    pushChanges,
} from "../git/gitOperations";

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
            vscode.window.showInformationMessage(
                "No changes since last commit"
            );
            return false;
        }
        return true;
    }

    async handleCommitMessageGeneration(diff: string): Promise<string | null> {
        try {
            const commitMessage = await generateCommitMessage(diff);
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
            // console.log("No changes to commit");
            return;
        }
        try {
            // if (!(await validateApiKey())) {
            //     vscode.window.showErrorMessage(
            //         "Invalid API key. Please check your settings."
            //     );
            //     return;
            // }

            // Check for changes first
            const diff = await getGitDiff();
            if (!diff || !(await this.checkIfDiffChanged(diff))) {
                return;
            }

            // Initialize model with API key
            const apiKey = getApiKey();
            if (apiKey) {
                initializeModel(apiKey);
            }

            // Stage changes only after confirming we have a valid diff
            await stageAllChanges();

            // Generate commit message
            const commitMessage = await this.handleCommitMessageGeneration(
                diff
            );
            if (!commitMessage) {
                return;
            }

            if (!commitMessage) {
                vscode.window.showErrorMessage("No commit message generated");
                return;
            }

            // Commit changes
            await commitChanges(commitMessage);

            // vscode.window.showInformationMessage(
            //     `Changes committed: ${commitMessage}`
            // );

            // Push changes
            await pushChanges();

            this.isGeneratingMessage = false;
        } catch (error: any) {
            if (error.message === "No changes to commit") {
                // vscode.window.showInformationMessage("No changes to commit");
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
