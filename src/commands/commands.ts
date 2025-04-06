import * as vscode from "vscode";
import {
  enableAutoCommit,
  disableAutoCommit,
} from "../autoCommit/autoCommitService";

import { commitService } from "../commit/commitService";
import { git } from "../extension";
import {
  updateVersion,
  enableVersionBumping,
  disableVersionBumping,
} from "../version/versionService";

export function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "git-ai-committer.enableAutoCommit",
      async () => {
        console.log("enableAutoCommit command triggered");
        try {
          const interval = vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<number>("commitInterval", 60000);
          await enableAutoCommit(interval);
        } catch (error: any) {
          console.error("Error enabling auto-commit:", error);
          vscode.window.showErrorMessage(
            "Failed to enable auto-commit: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.disableAutoCommit",
      async () => {
        console.log("disableAutoCommit command triggered");
        try {
          await disableAutoCommit();
        } catch (error: any) {
          console.error("Error disabling auto-commit:", error);
          vscode.window.showErrorMessage(
            "Failed to disable auto-commit: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand("git-ai-committer.commitNow", async () => {
      console.log("commitNow command triggered");
      try {
        const message = await vscode.window.showInputBox({
          prompt: "Enter commit message",
        });

        if (message) {
          await updateVersion("minor");
          await git.commit(message, [], {
            "--allow-empty": null,
          });
          await git.push();
        }
      } catch (error: any) {
        console.error("Error performing commit:", error);
        vscode.window.showErrorMessage("Failed to commit: " + error.message);
      }
    }),
    vscode.commands.registerCommand(
      "git-ai-committer.setGeminiApiKey",
      async () => {
        const apiKey = await vscode.window.showInputBox({
          prompt: "Enter your Gemini API Key",
          placeHolder: "Paste your API key here",
          password: true,
        });

        if (apiKey) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update("geminiApiKey", apiKey, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage("API Key saved successfully!");
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.setPreferredAIProvider",
      async () => {
        const provider = await vscode.window.showQuickPick(
          [
            {
              label: "GitHub Copilot",
              description: "Use Copilot for commit messages",
              value: "copilot",
            },
            {
              label: "Google Gemini",
              description: "Use Gemini for commit messages (requires API key)",
              value: "gemini",
            },
          ],
          {
            placeHolder: "Select preferred AI provider",
          }
        );

        if (provider) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update(
              "preferredAIProvider",
              provider.value,
              vscode.ConfigurationTarget.Global
            );
          vscode.window.showInformationMessage(
            `AI provider set to ${provider.label}`
          );

          if (
            provider.value === "gemini" &&
            !vscode.workspace
              .getConfiguration("gitAiCommitter")
              .get("geminiApiKey")
          ) {
            const setKey = await vscode.window.showInformationMessage(
              "Gemini requires an API key. Would you like to set it now?",
              "Yes",
              "No"
            );
            if (setKey === "Yes") {
              await vscode.commands.executeCommand(
                "git-ai-committer.setGeminiApiKey"
              );
            }
          }
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.setCommitInterval",
      async () => {
        const interval = await vscode.window.showInputBox({
          prompt: "Enter commit interval in seconds (0 to disable)",
          placeHolder: "e.g. 60",
          validateInput: (value) => {
            const num = Number(value);
            if (isNaN(num) || num < 0 || num > 3600) {
              return "Please enter a number between 0 and 3600";
            }
            return null;
          },
        });

        if (interval) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update(
              "commitInterval",
              Number(interval),
              vscode.ConfigurationTarget.Global
            );
          vscode.window.showInformationMessage(
            `Commit interval set to ${interval} seconds`
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.setInactivityDelay",
      async () => {
        const delay = await vscode.window.showInputBox({
          prompt: "Enter inactivity delay in seconds (0 to disable)",
          placeHolder: "e.g. 10",
          validateInput: (value) => {
            const num = Number(value);
            if (isNaN(num) || num < 0 || num > 3600) {
              return "Please enter a number between 0 and 3600";
            }
            return null;
          },
        });

        if (delay) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update(
              "inactivityTimeout",
              Number(delay),
              vscode.ConfigurationTarget.Global
            );
          vscode.window.showInformationMessage(
            `Inactivity delay set to ${delay} seconds`
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.enableVersionBumping",
      async () => {
        console.log("enableVersionBumping command triggered");
        try {
          enableVersionBumping();
          vscode.window.showInformationMessage("Version bumping enabled");
        } catch (error: any) {
          console.error("Error enabling version bumping:", error);
          vscode.window.showErrorMessage(
            "Failed to enable version bumping: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.disableVersionBumping",
      async () => {
        console.log("disableVersionBumping command triggered");
        try {
          disableVersionBumping();
          vscode.window.showInformationMessage("Version bumping disabled");
        } catch (error: any) {
          console.error("Error disabling version bumping:", error);
          vscode.window.showErrorMessage(
            "Failed to disable version bumping: " + error.message
          );
        }
      }
    )
  );
}
