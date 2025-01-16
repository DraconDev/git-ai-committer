import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";
import { git } from "../extension";

let genAI: GoogleGenerativeAI;
let model: any;

export function getApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("geminiApiKey");
}

export async function validateApiKey(): Promise<boolean> {
    const currentKey = getApiKey();
    if (!currentKey) {
        vscode.window.showErrorMessage(
            "Please set your Gemini API key in the extension settings."
        );
        return false;
    }

    try {
        const testAI = new GoogleGenerativeAI(currentKey);
        const testModel = testAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
        });
        await testModel.generateContent("Test");
        return true;
    } catch (error) {
        console.error("API key validation failed:", error);
        vscode.window.showErrorMessage(
            "Invalid API key. Please check your key and try again."
        );
        return false;
    }
}

export function initializeModel(apiKey: string) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
    });
}

export async function generateCommitMessage(diff: string): Promise<string> {
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
        const status = await git.status();
        const changedFiles = [
            ...status.modified,
            ...status.not_added,
            ...status.deleted,
        ];
        const timestamp = new Date().toISOString().split("T")[1].slice(0, 5);
        return `feat: update ${changedFiles.length} files (${changedFiles
            .slice(0, 3)
            .join(", ")}) at ${timestamp}`;
    }

    try {
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
            const status = await git.status();
            const changedFiles = [
                ...status.modified,
                ...status.not_added,
                ...status.deleted,
            ];
            const timestamp = new Date()
                .toISOString()
                .split("T")[1]
                .slice(0, 5);
            return `feat: update ${changedFiles.length} files (${changedFiles
                .slice(0, 3)
                .join(", ")}) at ${timestamp}`;
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

        // Get git diff and generate commit message
        const diff = await git.diff();
        const commitMessage = await generateCommitMessage(diff);
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
