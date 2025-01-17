import * as vscode from "vscode";
import {
    getApiKey,
    validateApiKey,
    initializeModel,
    generateCommitMessage,
} from "../ai/geminiService";
import { git } from "../git/gitOperations";

export async function performCommit() {
    try {
        if (!(await validateApiKey())) {
            throw new Error("API key not valid");
        }

        // Initialize model with API key
        const apiKey = getApiKey();
        if (apiKey) {
            initializeModel(apiKey);
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

        // Stage all changes
        await git.add(".");

        // Generate commit message
        const diff = await git.diff();
        if (!diff || diff === "") {
            throw new Error("No changes to commit");
        }

        const commitMessage = await generateCommitMessage(diff);
        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        // Commit changes
        await git.commit(commitMessage);
        // vscode.window.showInformationMessage(
        //     `Changes committed: ${commitMessage}`
        // );

        // Push changes
        try {
            await git.push();
            // vscode.window.showInformationMessage("Changes pushed successfully");
        } catch (error: any) {
            console.error("Push failed:", error);
            vscode.window.showErrorMessage(
                `Failed to push changes: ${error.message}`
            );
        }
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
