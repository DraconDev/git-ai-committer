import * as vscode from "vscode";
import { generateCommitMessage as generateWithGemini } from "./geminiService";
import { git } from "../extension";

enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

export async function checkCopilotAvailability(): Promise<boolean> {
  try {
    // Check if Copilot extension is installed and authenticated
    const extension = vscode.extensions.getExtension("GitHub.copilot");
    if (!extension) {
      return false;
    }

    // Try to execute a simple Copilot command to verify API access
    const result = await vscode.commands.executeCommand(
      "github.copilot.generate",
      {
        prompt: "test",
        temperature: 0.3,
        maxTokens: 5,
      }
    );

    return result !== undefined;
  } catch {
    return false;
  }
}

async function generateWithCopilot(diff: string): Promise<string | null> {
  try {
    const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Don't mention version changes unless they are major. Here's the diff:\n\n${diff}`;

    const response = await vscode.commands.executeCommand(
      "github.copilot.generate",
      {
        prompt,
        temperature: 0.3,
        maxTokens: 50,
      }
    );

    if (!response || typeof response !== "string") {
      return null;
    }

    // Clean up the message - remove quotes and newlines
    return response.replace(/["'\n\r]+/g, " ").trim();
  } catch {
    return null;
  }
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  return config.get<AIProvider>("preferredAIProvider", AIProvider.Copilot);
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

    // Validate diff content
    if (!diff || diff.trim() === "") {
      throw new Error("No changes to commit");
    }

    const preferredProvider = await getPreferredAIProvider();
    let message: string | null = null;

    if (preferredProvider === AIProvider.Copilot) {
      // Try Copilot first if it's preferred
      const copilotAvailable = await checkCopilotAvailability();
      if (copilotAvailable) {
        message = await generateWithCopilot(diff);
      }

      // Fallback to Gemini if Copilot fails or isn't available
      if (!message) {
        message = await generateWithGemini(diff);
      }
    } else {
      // Try Gemini first
      message = await generateWithGemini(diff);

      // Fallback to Copilot if Gemini fails
      if (!message) {
        const copilotAvailable = await checkCopilotAvailability();
        if (copilotAvailable) {
          message = await generateWithCopilot(diff);
        }
      }
    }

    if (!message) {
      // If both services fail, generate a basic commit message
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

    // Ensure it follows conventional commit format
    if (!message.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
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

    return message;
  } catch (error: any) {
    console.error("Error generating commit message:", {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
    });
    throw error;
  }
}
