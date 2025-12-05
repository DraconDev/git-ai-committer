import simpleGit from "simple-git";
import * as vscode from "vscode";
import { versionService } from "./versionCoreService";

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

export type VersionIncrementType = "patch" | "minor" | "major";

export function enableVersionBumping(): void {
    vscode.workspace
        .getConfiguration("gitAiCommitter")
        .update(
            "versionBumpingEnabled",
            true,
            vscode.ConfigurationTarget.Global
        );
}

export function disableVersionBumping(): void {
    vscode.workspace
        .getConfiguration("gitAiCommitter")
        .update(
            "versionBumpingEnabled",
            false,
            vscode.ConfigurationTarget.Global
        );
}

export function isVersionBumpingEnabled(): boolean {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get("versionBumpingEnabled", false);
}

export async function updateVersion(
    incrementType: VersionIncrementType = "patch"
): Promise<string | false | null> {
    // string: success, false: staging failed, null: other error/disabled
    if (!isVersionBumpingEnabled()) {
        // Return null to explicitly indicate version bumping is disabled
        return null;
    }

    try {
        // Detect version files
        const versionFiles = await versionService.detectVersionFiles();
        if (versionFiles.length === 0) {
            throw new Error("No version files found");
        }

        // Get current versions from all detected files to find the highest one
        // This ensures we don't accidentally downgrade if one file (like package-lock) is ahead
        let maxVersion: string | null = null;

        for (const file of versionFiles) {
            const v = await versionService.getCurrentVersion(file);
            if (v) {
                if (!maxVersion || compareVersions(v, maxVersion) > 0) {
                    maxVersion = v;
                }
            }
        }

        if (!maxVersion) {
            throw new Error(
                "Could not determine current version from any file"
            );
        }
        const currentVersion = maxVersion;

        // Increment version based on type
        const newVersion = incrementVersion(currentVersion, incrementType);
        if (!newVersion) {
            throw new Error("Could not increment version");
        }

        // Update all version files
        const files = await versionService.updateVersionFiles(newVersion);
        if (files.length === 0) {
            throw new Error("Could not update version file");
        } else {
            const staged = await stageUpdatedFiles(files);
            if (!staged) {
                console.error("Failed to stage updated version files.");
                return false; // Indicate staging failure
            }
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
    const versionParts = version.split(".");
    if (versionParts.length !== 3) {
        return null;
    }

    const [major, minor, patch] = versionParts.map((part) =>
        parseInt(part, 10)
    );

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
        return null;
    }

    switch (incrementType) {
        case "major":
            return `${major + 1}.0.0`;
        case "minor":
            return `${major}.${minor + 1}.0`;
        case "patch":
            return `${major}.${minor}.${patch + 1}`;
        default:
            return null;
    }
}

async function stageUpdatedFiles(updatedFiles: string[]): Promise<boolean> {
    if (!updatedFiles.length) {
        return true; // Nothing to stage, technically success
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        console.error("No workspace folder found to stage version files.");
        return false;
    }
    const workspacePath = workspaceFolder.uri.fsPath;
    const git = simpleGit(workspacePath);
    try {
        await git.add(updatedFiles);
        console.log("Staged updated version files:", updatedFiles);
        return true; // Staging successful
    } catch (err) {
        console.error("Error staging files with simple-git:", err);
        return false; // Staging failed
    }
}

function compareVersions(v1: string, v2: string): number {
    const p1 = v1.split(".").map((p) => parseInt(p, 10));
    const p2 = v2.split(".").map((p) => parseInt(p, 10));

    for (let i = 0; i < 3; i++) {
        const num1 = isNaN(p1[i]) ? 0 : p1[i];
        const num2 = isNaN(p2[i]) ? 0 : p2[i];

        if (num1 > num2) {
            return 1;
        }
        if (num1 < num2) {
            return -1;
        }
    }
    return 0;
}
