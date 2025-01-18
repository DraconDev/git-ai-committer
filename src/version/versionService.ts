import * as vscode from "vscode";
import { versionService } from "./versionCoreService";

let versionBumpingEnabled = false;
let configListener: vscode.Disposable;

export function initializeVersionBumping(): void {
    // Initialize from config
    versionBumpingEnabled = vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get("versionBumpingEnabled", false);

    // Listen for config changes
    configListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("gitAiCommitter.versionBumpingEnabled")) {
            versionBumpingEnabled = vscode.workspace
                .getConfiguration("gitAiCommitter")
                .get("versionBumpingEnabled", false);
        }
    });
}

export function disposeVersionBumping(): void {
    configListener?.dispose();
}

export type VersionIncrementType = "patch" | "minor";

export function enableVersionBumping(): void {
    versionBumpingEnabled = true;
    vscode.workspace
        .getConfiguration("gitAiCommitter")
        .update(
            "versionBumpingEnabled",
            true,
            vscode.ConfigurationTarget.Global
        );
}

export function disableVersionBumping(): void {
    versionBumpingEnabled = false;
    vscode.workspace
        .getConfiguration("gitAiCommitter")
        .update(
            "versionBumpingEnabled",
            false,
            vscode.ConfigurationTarget.Global
        );
}

export function isVersionBumpingEnabled(): boolean {
    return (
        versionBumpingEnabled &&
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get("versionBumpingEnabled", false)
    );
}

export async function updateVersion(
    incrementType: VersionIncrementType = "patch"
): Promise<string | null> {
    if (!versionBumpingEnabled) {
        // Return null to explicitly indicate version bumping is disabled
        return null;
    }

    try {
        // Detect version file
        const versionFile = await versionService.detectVersionFile();
        if (!versionFile) {
            throw new Error("No version file found");
        }

        // Get current version
        const currentVersion = await versionService.getCurrentVersion(
            versionFile
        );
        if (!currentVersion) {
            throw new Error("Could not determine current version");
        }

        // Increment version based on type
        const newVersion = incrementVersion(currentVersion, incrementType);
        if (!newVersion) {
            throw new Error("Could not increment version");
        }

        // Update version file
        const success = await versionService.updateVersionFile(
            versionFile,
            newVersion
        );
        if (!success) {
            throw new Error("Could not update version file");
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
