import * as vscode from "vscode";
import { generateCommitMessage as generateWithGemini } from "./geminiService";
import { git } from "../extension";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

export async function generateWithCopilot(diff: string): Promise<boolean> {
  try {
    // Get Git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      vscode.window.showErrorMessage("Git extension not found");
      return false;
    }

    // Get first repository's source control
    const gitApi = gitExtension.exports.getAPI(1);
    const repo = gitApi.repositories[0];
    if (!repo) {
      vscode.window.showErrorMessage("No Git repository found");
      return false;
    }

    const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Here's the diff:\n\n${diff}`;

    // Try to generate commit message with Copilot
    await vscode.commands.executeCommand(
      "github.copilot.git.generateCommitMessage",
      prompt
    );

    // Wait for Copilot to update the source control input box
    // Increased timeout to give Copilot more time to respond
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify that we got a valid message in the input box
    const message = repo.inputBox.value;
    if (!message || message.length === 0) {
      vscode.window.showErrorMessage(
        "Copilot failed to generate a commit message"
      );
      return false;
    }

    // Validate conventional commit format
    const conventionalCommitRegex = /^[a-z]+(\([a-z-]+\))?: .+/;
    if (!conventionalCommitRegex.test(message)) {
      vscode.window.showWarningMessage(
        "Generated message doesn't follow conventional commit format"
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error generating commit message with Copilot:", error);
    vscode.window.showErrorMessage(
      `Error generating commit message: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return false;
  }
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  return config.get<AIProvider>("preferredAIProvider", AIProvider.Copilot);
}
