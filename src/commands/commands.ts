import * as vscode from "vscode";
import {
  disableAutoCommit,
  enableAutoCommit,
} from "../autoCommit/autoCommitService";

import { git } from "../extension";
import {
  disableVersionBumping,
  enableVersionBumping,
  updateVersion,
} from "../version/versionService";

export function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "git-ai-committer.enableAutoCommit",
      async () => {
        try {
          enableAutoCommit();
        } catch (error: any) {
          vscode.window.showErrorMessage(
            "Failed to enable auto-commit: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.disableAutoCommit",
      async () => {
        try {
          disableAutoCommit();
        } catch (error: any) {
          vscode.window.showErrorMessage(
            "Failed to disable auto-commit: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand("git-ai-committer.commitNow", async () => {
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
      "git-ai-committer.setInactivityDelay",
      async () => {
        const delay = await vscode.window.showInputBox({
          prompt:
            "Enter inactivity delay in seconds (when to check for commits)",
          placeHolder: "e.g. 5",
          validateInput: (value) => {
            const num = Number(value);
            if (isNaN(num) || num < 1 || num > 3600) {
              return "Please enter a number between 1 and 3600";
            }
            return null;
          },
        });

        if (delay) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update(
              "inactivityDelay",
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
      "git-ai-committer.setMinTimeBetweenCommits",
      async () => {
        const delay = await vscode.window.showInputBox({
          prompt: "Enter minimum time between commits in seconds",
          placeHolder: "e.g. 15",
          validateInput: (value) => {
            const num = Number(value);
            if (isNaN(num) || num < 5 || num > 3600) {
              return "Please enter a number between 5 and 3600";
            }
            return null;
          },
        });

        if (delay) {
          await vscode.workspace
            .getConfiguration("gitAiCommitter")
            .update(
              "minCommitDelay",
              Number(delay),
              vscode.ConfigurationTarget.Global
            );
          vscode.window.showInformationMessage(
            `Minimum commit delay set to ${delay} seconds`
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.enableVersionBumping",
      async () => {
        try {
          enableVersionBumping();
          vscode.window.showInformationMessage("Version bumping enabled");
        } catch (error: any) {
          vscode.window.showErrorMessage(
            "Failed to enable version bumping: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.disableVersionBumping",
      async () => {
        try {
          disableVersionBumping();
          vscode.window.showInformationMessage("Version bumping disabled");
        } catch (error: any) {
          vscode.window.showErrorMessage(
            "Failed to disable version bumping: " + error.message
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "git-ai-committer.manageIgnoredFiles",
      async () => {
        const currentPatterns = vscode.workspace
          .getConfiguration("gitAiCommitter")
          .get<string[]>("ignoredFilePatterns", [
            "*.tmp",
            "*.temp",
            "*.log",
            "*.cache",
            "*.dll",
            "*.exe",
            "*.env",
            "node_modules/**",
            "*.vsix",
            "*.kilocode",
          ]);

        const patternsText = currentPatterns.join(", ");

        const choice = await vscode.window.showQuickPick(
          [
            {
              label: `View Current Patterns: ${patternsText}`,
              description: "Show all ignored file patterns",
            },
            {
              label: "Edit Patterns",
              description: "Modify the ignored file patterns",
            },
            {
              label: "Open Settings",
              description: "Open VS Code settings for this extension",
            },
          ],
          { placeHolder: "Choose an action" }
        );

        if (choice?.label === "Edit Patterns") {
          const patternsInput = await vscode.window.showInputBox({
            prompt: "Enter file patterns to ignore (comma-separated)",
            placeHolder: "*.tmp, *.log, *.cache, .env, *.exe",
            value: patternsText,
          });

          if (patternsInput) {
            const patterns = patternsInput
              .split(",")
              .map((p) => p.trim())
              .filter((p) => p.length > 0);
            await vscode.workspace
              .getConfiguration("gitAiCommitter")
              .update(
                "ignoredFilePatterns",
                patterns,
                vscode.ConfigurationTarget.Global
              );

            vscode.window.showInformationMessage(
              `Ignored file patterns updated: ${patterns.join(", ")}`
            );
          }
        } else if (choice?.label?.includes("Open Settings")) {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "gitAiCommitter"
          );
        } else if (choice) {
          vscode.window.showInformationMessage(
            `Current ignored patterns: ${patternsText}`
          );
        }
      }
    )
  );
}
