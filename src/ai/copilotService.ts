import * as vscode from "vscode";
import { git } from "../extension";

async function generateCopilotMessage(diff: string): Promise<string> {
  try {
    // Trigger Copilot's commit message generation
    await vscode.commands.executeCommand(
      "github.copilot.git.generateCommitMessage"
    );
    
    // Since Copilot updates the source control box, get the message from there
    const { message, repo } = getSourceControlMessage();
    if (message) {
      // Clear the source control box since we're getting the message
      clearSourceControlMessage(repo);
      return message;
    }
    
    return "";
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
  // First check if there's already a message in source control
  const { message: sourceControlMessage, repo } = getSourceControlMessage();
  
  if (sourceControlMessage) {
    // If there's a message in source control, use it and clear the box
    clearSourceControlMessage(repo);
    return sourceControlMessage;
  }

  // If no source control message, generate with Copilot
  const generatedMessage = await generateCopilotMessage(diff);
  if (generatedMessage) {
    return generatedMessage;
  }

  // If generation fails, show error
  vscode.window.showErrorMessage("Failed to generate commit message with Copilot");
  return "";
}
