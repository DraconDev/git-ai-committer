import * as vscode from "vscode";
import { versionService } from "./versionCoreService";
import simpleGit from "simple-git";

let configListener: vscode.Disposable;

export function initializeVersionBumping(): void {
  // Listen for config changes
  configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("gitAiCommitter.versionBumpingEnabled")) {
      // Configuration change handler
    }
  });
}

export function disposeVersionBumping(): void {
  configListener?.dispose();
}

export type VersionIncrementType = "patch" | "minor";

export function enableVersionBumping(): void {
  vscode.workspace
    .getConfiguration("gitAiCommitter")
    .update("versionBumpingEnabled", true, vscode.ConfigurationTarget.Global);
}

export function disableVersionBumping(): void {
  vscode.workspace
    .getConfiguration("gitAiCommitter")
    .update("versionBumpingEnabled", false, vscode.ConfigurationTarget.Global);
}

export function isVersionBumpingEnabled(): boolean {
  return vscode.workspace
    .getConfiguration("gitAiCommitter")
    .get("versionBumpingEnabled", false);
}

export async function updateVersion(
  incrementType: VersionIncrementType = "patch"
): Promise<string | null> {
  if (!isVersionBumpingEnabled()) {
    // Return null to explicitly indicate version bumping is disabled
    return null;
  }

  try {
    // Detect version files
    const versionFiles = await versionService.detectVersionFiles();
    if (versionFiles.length === 0) {
      console.log("No version files found");
      return null;
    }

    // Get current version from first detected file
    const currentVersion = await versionService.getCurrentVersion(
      versionFiles[0]
    );
    if (!currentVersion) {
      console.log("Could not determine current version");
      return null;
    }

    // Increment version based on type
    const newVersion = incrementVersion(currentVersion, incrementType);
    if (!newVersion) {
      console.log("Could not increment version");
      return null;
    }

    // Update all version files
    const files = await versionService.updateVersionFiles(newVersion);
    if (files.length === 0) {
      console.log("No version files were updated");
      return null;
    } else {
      // Stage the updated files immediately
      await stageUpdatedFiles(files);
      console.log(`Version updated to ${newVersion} and files staged`);
    }

    return newVersion;
  } catch (error) {
    console.error("Error updating version:", error);
    return null;
  }
}

function incrementVersion(
  version: string,
  incrementType: VersionIncrementType
): string | null {
  if (!versionService.validateSemver(version)) {
    return null;
  }

  const versionParts = version.split(".");

  if (incrementType === "patch") {
    const patch = parseInt(versionParts[2]);
    versionParts[2] = (patch + 1).toString();
  } else if (incrementType === "minor") {
    const minor = parseInt(versionParts[1]);
    versionParts[1] = (minor + 1).toString();
    versionParts[2] = "0"; // Reset patch version
  }

  return versionParts.join(".");
}

async function stageUpdatedFiles(updatedFiles: string[]): Promise<void> {
  if (!updatedFiles.length) {
    return;
  }
  
  const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const git = simpleGit(workspacePath);
  
  try {
    await git.add(updatedFiles);
    console.log("Staged updated version files:", updatedFiles);
  } catch (err) {
    console.error("Error staging files with simple-git:", err);
    
    // Try alternative staging method if simple-git fails
    try {
      // Use VS Code's git extension API as a fallback
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        const repository = api.repositories[0];
        
        if (repository) {
          await Promise.all(updatedFiles.map(file => repository.add(file)));
          console.log("Staged files using VS Code API:", updatedFiles);
        }
      }
    } catch (fallbackErr) {
      console.error("Error with fallback staging method:", fallbackErr);
    }
  }
}
