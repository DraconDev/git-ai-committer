import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "./ai/geminiService";
import {
  initializeVersionBumping,
  disposeVersionBumping,
} from "./version/versionService";
import {
  enableAutoCommit,
  disableAutoCommit,
} from "./autoCommit/autoCommitService";
import {
  initializeGit,
  getGitStatus,
  stageAllChanges,
  commitChanges,
  pushChanges,
  getGitDiff,
} from "./git/gitOperations";
import { registerCommands } from "./commands/commands";
import simpleGit from "simple-git";
import { commitService } from "./commit/commitService";

let gitInitialized = false;
let genAI: GoogleGenerativeAI;
let model: any;
export let git: ReturnType<typeof simpleGit>;

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    "Git AI Auto Committer is now active! Starting to register commands..."
  );
  // vscode.window.showInformationMessage("Git AI Auto Committer activated!");

  // Initialize Git
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  git = simpleGit(workspaceFolders[0].uri.fsPath);

  // Check if repository exists
  try {
    await git.checkIsRepo();
    gitInitialized = true;
  } catch (error) {
    vscode.window.showWarningMessage(
      "No Git repository found in the current workspace. Auto-commit will be enabled but won't work until a Git repository is initialized."
    );
    gitInitialized = false;
  }

  // Check for Gemini API key
  const apiKey = getApiKey();
  if (!apiKey) {
    vscode.window.showWarningMessage(
      "Gemini API key is not set. Please set it in the extension settings to use Git AI Auto Committer."
    );
    vscode.env.openExternal(
      vscode.Uri.parse("https://aistudio.google.com/apikey")
    );
    return;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
  // }

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("gitAiCommitter.geminiApiKey")) {
        const apiKey = getApiKey();
        if (apiKey) {
          genAI = new GoogleGenerativeAI(apiKey);
          model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
          });
          vscode.window.showInformationMessage(
            "Gemini API Key has been updated and validated successfully!"
          );
        }
      }

      if (e.affectsConfiguration("gitAiCommitter.enabled")) {
        const enabled = vscode.workspace
          .getConfiguration("gitAiCommitter")
          .get<boolean>("enabled");

        if (enabled) {
          await enableAutoCommit();
        } else {
          disableAutoCommit();
        }
      }
    })
  );

  // Enable auto-commit by default
  try {
    enableAutoCommit();
    // Periodically check for git repo initialization
    setInterval(async () => {
      if (!gitInitialized) {
        try {
          await git.checkIsRepo();
          gitInitialized = true;
          vscode.window.showInformationMessage(
            "Git repository detected! Auto-commit is now active."
          );
        } catch (error) {
          // Still no git repo
        }
      }
    }, 10000); // Check every 10 seconds
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(
        `Failed to enable auto-commit: ${error.message}`
      );
    }
  }

  // Initialize version bumping
  initializeVersionBumping();

  // Register commands and settings view
  registerCommands(context);
}

export function deactivate() {
  disableAutoCommit();
  disposeVersionBumping();
}
