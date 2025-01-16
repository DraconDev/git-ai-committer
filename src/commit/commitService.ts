import * as vscode from "vscode";
import { git } from "../extension";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, validateApiKey } from "../ai/geminiService";

export async function generateCommitMessage(): Promise<string> {
    if (!(await validateApiKey())) {
        throw new Error("API key not valid");
    }

    const status = await git.status();
    if (
        !status.modified.length &&
        !status.not_added.length &&
        !status.deleted.length
    ) {
        throw new Error("No changes to commit");
    }

    if (!model) {
        return "feat: update files";
    }

    try {
        const diff = await git.diff();
        if (!diff || diff === "") {
            throw new Error("No changes to commit");
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:

${diff}`;

        const result = await model.generateContent(prompt);
        if (!result || !result.response) {
            throw new Error("Empty response from Gemini API");
        }

        if (
            !result.response.candidates ||
            !result.response.candidates[0] ||
            !result.response.candidates[0].content ||
            !result.response.candidates[0].content.parts ||
            !result.response.candidates[0].content.parts[0] ||
            !result.response.candidates[0].content.parts[0].text
        ) {
            throw new Error("No candidates in response from Gemini API");
        }

        const response = result.response.candidates[0].content.parts[0].text;

        // Clean up the message - remove quotes and newlines
        const cleanMessage = response.replace(/["'\n\r]+/g, " ").trim();

        // Ensure it follows conventional commit format
        if (!cleanMessage.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
            return "feat: update files";
        }

        return cleanMessage;
    } catch (error) {
        console.error("Error generating commit message:", error);
        throw error;
    }
}

export async function performCommit() {
    try {
        const status = await git.status();

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
        await git.add(".");

        // Generate commit message
        const commitMessage = await generateCommitMessage();
        if (!commitMessage) {
            console.log("No commit message generated");
            return;
        }

        // Commit changes
        await git.commit(commitMessage);
        vscode.window.showInformationMessage(
            `Changes committed: ${commitMessage}`
        );

        // Push changes
        try {
            await git.push();
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
