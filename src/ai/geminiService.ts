import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";

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
    if (!model) {
        return "feat: update files";
    }

    try {
        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:

${diff}`;

        const result = await model.generateContent(prompt);
        if (!result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("No candidates in response from Gemini API");
        }

        const response = result.response.candidates[0].content.parts[0].text;

        // Clean up the message
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
