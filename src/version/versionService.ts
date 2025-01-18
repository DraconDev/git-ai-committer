import { VersionService } from "./versionAIService";

export async function updateVersion(): Promise<string | null> {
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

        // Increment version
        const newVersion = incrementVersion(currentVersion);
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

function incrementVersion(version: string): string | null {
    if (!versionService.validateSemver(version)) {
        return null;
    }

    const versionParts = version.split(".");
    const patch = parseInt(versionParts[2]);
    versionParts[2] = (patch + 1).toString();
    return versionParts.join(".");
}

export const versionService = VersionService.getInstance();
