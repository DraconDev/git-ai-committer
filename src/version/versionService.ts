import { versionService } from "./versionCoreService";

export type VersionIncrementType = "patch" | "minor";

export async function updateVersion(
    incrementType: VersionIncrementType = "patch"
): Promise<string | null> {
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
