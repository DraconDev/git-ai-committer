import * as vscode from "vscode";
import { generateCommitMessage as generateWithGemini } from "./geminiService";
import { git } from "../extension";

enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

export async function checkCopilotAvailability(): Promise<boolean> {
  try {
    const extension = vscode.extensions.getExtension("GitHub.copilot");
    if (!extension) {
      return false;
    }

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

    // const response = await vscode.commands.executeCommand(
    //   "github.copilot.generate",
    //   {
    //     prompt,
    //     temperature: 0.3,
    //     maxTokens: 50,
    //   }
    // );

    // const response = await vscode.commands.executeCommand(
    //   "github.copilot.git.generateCommitMessage",
    //   {
    //     prompt,
    //     temperature: 0.3,
    //     maxTokens: 50,
    //   }
    // );

    const response = await vscode.commands.executeCommand(
      "github.copilot.git.generateCommitMessage"
    );

    if (!response || typeof response !== "string") {
      return null;
    }

    // Clean up the message - remove quotes and newlines
    const cleanMessage = response.replace(/["'\n\r]+/g, " ").trim();

    // Ensure conventional commit format
    if (!cleanMessage.match(/^[a-z]+(\([a-z-]+\))?: .+/)) {
      return null;
    }

    return cleanMessage;
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

    // Try preferred provider first
    if (preferredProvider === AIProvider.Copilot) {
      const copilotAvailable = await checkCopilotAvailability();
      if (!copilotAvailable) {
        const choice = await vscode.window.showWarningMessage(
          "Copilot is not available. Would you like to try using Gemini instead?",
          "Try Gemini",
          "Cancel"
        );

        if (choice === "Try Gemini") {
          const geminiApiKey = vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<string>("geminiApiKey");

          if (!geminiApiKey) {
            const setKey = await vscode.window.showWarningMessage(
              "Gemini requires an API key. Would you like to set it now?",
              "Set API Key",
              "Cancel"
            );

            if (setKey === "Set API Key") {
              await vscode.commands.executeCommand(
                "git-ai-committer.setGeminiApiKey"
              );
              // Try again after setting the key
              message = await generateWithGemini(diff);
            }
          } else {
            message = await generateWithGemini(diff);
          }
        }
      } else {
        message = await generateWithCopilot(diff);
        if (!message) {
          const choice = await vscode.window.showWarningMessage(
            "Failed to generate commit message with Copilot. Would you like to try using Gemini instead?",
            "Try Gemini",
            "Cancel"
          );

          if (choice === "Try Gemini") {
            const geminiApiKey = vscode.workspace
              .getConfiguration("gitAiCommitter")
              .get<string>("geminiApiKey");

            if (!geminiApiKey) {
              const setKey = await vscode.window.showWarningMessage(
                "Gemini requires an API key. Would you like to set it now?",
                "Set API Key",
                "Cancel"
              );

              if (setKey === "Set API Key") {
                await vscode.commands.executeCommand(
                  "git-ai-committer.setGeminiApiKey"
                );
                // Try again after setting the key
                message = await generateWithGemini(diff);
              }
            } else {
              message = await generateWithGemini(diff);
            }
          }
        }
      }
    } else {
      // Gemini is preferred
      const geminiApiKey = vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("geminiApiKey");

      if (!geminiApiKey) {
        const setKey = await vscode.window.showWarningMessage(
          "Gemini requires an API key. Would you like to set it now?",
          "Set API Key",
          "Try Copilot",
          "Cancel"
        );

        if (setKey === "Set API Key") {
          await vscode.commands.executeCommand(
            "git-ai-committer.setGeminiApiKey"
          );
          // Try again after setting the key
          message = await generateWithGemini(diff);
        } else if (setKey === "Try Copilot") {
          const copilotAvailable = await checkCopilotAvailability();
          if (copilotAvailable) {
            message = await generateWithCopilot(diff);
          } else {
            vscode.window.showErrorMessage("Copilot is not available");
          }
        }
      } else {
        message = await generateWithGemini(diff);
        if (!message) {
          const choice = await vscode.window.showWarningMessage(
            "Failed to generate commit message with Gemini. Would you like to try using Copilot instead?",
            "Try Copilot",
            "Cancel"
          );

          if (choice === "Try Copilot") {
            const copilotAvailable = await checkCopilotAvailability();
            if (copilotAvailable) {
              message = await generateWithCopilot(diff);
            } else {
              vscode.window.showErrorMessage("Copilot is not available");
            }
          }
        }
      }
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
