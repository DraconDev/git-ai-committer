import * as vscode from "vscode";
import { generateCommitMessage as generateWithGemini } from "./geminiService";
import { git } from "../extension";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

export async function generateWithCopilot(diff: string): Promise<string> {
  try {
    const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:\n\n${diff}`;

    // Use Copilot to generate commit message and return it directly
    const message = await vscode.commands.executeCommand<string>(
      "github.copilot.git.generateCommitMessage",
      prompt
    );
    return message || "";
  } catch (error) {
    console.error("Error generating commit message with Copilot:", error);
    vscode.window.showErrorMessage(
      `Error generating commit message: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return "";
  }
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  return config.get<AIProvider>("preferredAIProvider", AIProvider.Gemini);
}
