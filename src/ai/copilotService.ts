import * as vscode from "vscode";
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
  return { message: repo.inputBox.value, repo };
}

function clearSourceControlMessage(repo: any): void {
  if (repo && repo.inputBox) {
    repo.inputBox.value = "";
  }
}

export async function generateWithCopilot(diff: string): Promise<string> {
  // First check source control message
  const { message: sourceControlMessage, repo } = getSourceControlMessage();

  if (sourceControlMessage) {
    // If there's a message in source control, use it and clear the box
    clearSourceControlMessage(repo);
    return sourceControlMessage;
  }

  // If no source control message, generate with Copilot
  return await generateCopilotMessage(diff);
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  return config.get<AIProvider>("preferredAIProvider", AIProvider.Gemini);
}
