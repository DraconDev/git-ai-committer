import * as vscode from "vscode";
import {
    getGitStatus,
    stageAllChanges,
    commitChanges,
    pushChanges,
    getGitDiff,
} from "../git/gitOperations";
import { generateCommitMessage } from "../ai/geminiService";

export async function performCommit() {
    try {
        const status = await getGitStatus();

        // Check if there are any changes to commit
        if (
            !status.modified.length &&
            !status.not_added.length &&
            !status.deleted.length
        ) {
            console.log("No changes to commit");
            return;
        }

        // Stage all changes
        await stageAllChanges();

        // Get git diff
        const diff = await getGitDiff();

        // Generate commit message
        const commitMessage = await generateCommitMessage(diff);
        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        // Commit changes
        await commitChanges(commitMessage);
        vscode.window.showInformationMessage(
            `Changes committed: ${commitMessage}`
        );

        // Push changes
        try {
            await pushChanges();
            vscode.window.showInformationMessage("Changes pushed successfully");
        } catch (error: any) {
            console.error("Push failed:", error);
            vscode.window.showErrorMessage(
                `Failed to push changes: ${error.message}`
            );
        }
    } catch (error: any) {
        if (error.message === "No changes to commit") {
            vscode.window.showInformationMessage("No changes to commit");
            return;
        }
        console.error("Commit failed:", error);
        vscode.window.showErrorMessage(
            `Failed to commit changes: ${error.message}`
        );
    }
}
