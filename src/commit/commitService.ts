import * as vscode from "vscode";
import {
    getApiKey,
    initializeModel,
    generateCommitMessage,
} from "../ai/geminiService";
import {
    commitChanges,
    getGitDiff,
    git,
    stageAllChanges,
} from "../git/gitOperations";

export async function performCommit() {
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

        // Initialize model with API key
        const apiKey = getApiKey();
        if (apiKey) {
            initializeModel(apiKey);
        }

        // Stage all changes
        await stageAllChanges();

        // Generate commit message
        const diff = await getGitDiff();

        const commitMessage = await generateCommitMessage(diff);

        vscode.window.showErrorMessage(commitMessage);
        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        // Commit changes
        if (!(await commitChanges(commitMessage))) {
            return;
        }
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
