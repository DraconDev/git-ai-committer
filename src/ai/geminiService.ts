import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";
import { git } from "../extension";

// Shared Gemini model configuration
export const GEMINI_MODEL_NAME = "gemini-flash-lite-latest";

export let genAI: GoogleGenerativeAI;
export let model: any;

export function getApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("geminiApiKey");
}

export function getGeminiModel(): string {
    return (
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<string>("geminiModel") || GEMINI_MODEL_NAME
    );
}

export function initializeModel(apiKey: string, modelName?: string) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: modelName || getGeminiModel(),
    });
}

export async function generateGeminiMessage(
    diff: string,
    modelOverride?: string
): Promise<string | null> {
    // Validate input
    if (typeof diff !== "string") {
        throw new TypeError("diff must be a string");
    }

    // Check git status
    const status = await git.status();
    if (!status || typeof status !== "object") {
        throw new Error("Invalid git status response");
    }

    if (
        !status.modified.length &&
        !status.not_added.length &&
        !status.deleted.length
    ) {
        throw new Error("No changes to commit");
    }

    if (!model || modelOverride) {
        const apiKey = getApiKey();
        if (!apiKey) {
            // Don't show error - let failover handle it
            return null;
        }
        initializeModel(apiKey, modelOverride);
    }

    // Validate diff content
    if (!diff || diff.trim() === "") {
        throw new Error("No changes to commit");
    }

    // Generate prompt
    const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Focus on the code changes. Do not mention version bumps or lockfile updates unless they are the ONLY changes. If you must mention them, put them at the very end. Do not include any other text, explanation, or prefixes like 'commit:' or 'text:'. Output ONLY the commit message itself. Here's the diff:\n\n${diff}`;

    // Get API response
    const result = await model.generateContent(prompt);

    // Validate API response structure
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

    // Clean up the message - remove quotes and newlines, and strip common hallucinations
    return response
        .replace(/["'\n\r]+/g, " ")
        .replace(/^(text|commit|git|output)\s*[:]?\s*/i, "")
        .trim();
}
