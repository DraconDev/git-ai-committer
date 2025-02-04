import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";
import { git } from "../extension";
import { updateVersion } from "../version/versionService";
import { error } from "console";

export let genAI: GoogleGenerativeAI;
export let model: any;

export function getApiKey(): string | undefined {
  return vscode.workspace
    .getConfiguration("gitAiCommitter")
    .get<string>("geminiApiKey");
}

export function initializeModel(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });
}

export async function generateCommitMessage(
  diff: string
): Promise<string | null> {
  try {
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

    if (!model) {
      const apiKey = getApiKey();
      if (!apiKey) {
        vscode.window.showErrorMessage("Gemini API key not configured");
        return null;
      }
      initializeModel(apiKey);
    }

    // Validate diff content
    if (!diff || diff.trim() === "") {
      throw new Error("No changes to commit");
    }

    // Generate prompt
    const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:\n\n${diff}`;

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

    // Clean up the message - remove quotes and newlines
    const cleanMessage = response.replace(/["'\n\r]+/g, " ").trim();

    // Ensure it follows conventional commit format
    if (!cleanMessage.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
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

    return cleanMessage;
  } catch (error: any) {
    console.error("Error generating commit message:", {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
    });
    vscode.window.showErrorMessage(
      `Failed to generate commit message: ${error.message}`
    );
    return null;
  }
}
