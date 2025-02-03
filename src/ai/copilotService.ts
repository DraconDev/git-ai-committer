import * as vscode from "vscode";
import { git } from "../extension";

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

    // Use the Copilot API to generate commit message
    // const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Don't mention version changes unless they are major. Here's the diff:\n\n${diff}`;

    // const response = await vscode.commands.executeCommand(
    //   "github.copilot.generate",
    //   {
    //     prompt,
    //     temperature: 0.3, // Lower temperature for more focused responses
    //     maxTokens: 50, // Limit response length for concise commit messages
    //   }
    // );

    const response = await vscode.commands.executeCommand(
      "github.copilot.git.generateCommitMessage"
    );

    if (!response || typeof response !== "string") {
      throw new Error("Failed to generate commit message with Copilot");
    }

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
    throw error;
  }
}
