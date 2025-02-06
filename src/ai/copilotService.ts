import * as vscode from "vscode";
import { generateCommitMessage as generateWithGemini } from "./geminiService";
import { git } from "../extension";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

async function generateCopilotMessage(diff: string): Promise<string> {
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

function getSourceControlMessage(): { message: string | undefined; repo: any } {
  // Get Git extension
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    console.debug("Git extension not found");
    return { message: undefined, repo: null };
  }

  // Get first repository's source control
  const gitApi = gitExtension.exports.getAPI(1);
  const repo = gitApi.repositories[0];
  if (!repo) {
    console.debug("No Git repository found");
    return { message: undefined, repo: null };
  }

  // Get the message from the source control input box
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
