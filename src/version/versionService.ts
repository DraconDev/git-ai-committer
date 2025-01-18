import * as vscode from "vscode";
import { generateCommitMessage } from "../ai/geminiService";
import * as fs from "fs";
import * as path from "path";

export class VersionService {
    private static instance: VersionService;

    private constructor() {}

    public static getInstance(): VersionService {
        if (!VersionService.instance) {
            VersionService.instance = new VersionService();
        }
        return VersionService.instance;
    }

    async detectVersionFile(): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        const prompt = `Analyze this project structure and determine the appropriate version file.
        Common version files include: package.json, pom.xml, build.gradle, pyproject.toml, Cargo.toml.
        Return just the filename.`;

        try {
            const response = await generateCommitMessage(prompt);
            if (response) {
                const versionFile = response.trim();
                const filePath = path.join(
                    workspaceFolders[0].uri.fsPath,
                    versionFile
                );
                if (fs.existsSync(filePath)) {
                    return versionFile;
                }
            }
        } catch (error) {
            console.error("Error detecting version file:", error);
        }
        return null;
    }

    async getCurrentVersion(versionFile: string): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        const prompt = `Read the current version from ${versionFile}.
        Return just the version number in semver format (e.g., 1.2.3).`;

        try {
            const response = await generateCommitMessage(prompt);
            if (response) {
                return response.trim();
            }
        } catch (error) {
            console.error("Error getting current version:", error);
        }
        return null;
    }

    bumpPatchVersion(currentVersion: string): string {
        const [major, minor, patch] = currentVersion.split(".").map(Number);
        return `${major}.${minor}.${patch + 1}`;
    }

    bumpMinorVersion(currentVersion: string): string {
        const [major, minor] = currentVersion.split(".").map(Number);
        return `${major}.${minor + 1}.0`;
    }

    bumpMajorVersion(currentVersion: string): string {
        const [major] = currentVersion.split(".").map(Number);
        return `${major + 1}.0.0`;
    }

    async updateVersionFile(
        versionFile: string,
        newVersion: string
    ): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return false;

        try {
            const filePath = path.join(
                workspaceFolders[0].uri.fsPath,
                versionFile
            );

            if (
                versionFile === "package.json" ||
                versionFile === "package-lock.json"
            ) {
                const fileContent = fs.readFileSync(filePath, "utf8");
                const packageData = JSON.parse(fileContent);

                // Update version in package.json
                packageData.version = newVersion;

                // For package-lock.json, also update the lockfileVersion if needed
                if (
                    versionFile === "package-lock.json" &&
                    packageData.lockfileVersion
                ) {
                    packageData.lockfileVersion = 3;
                }

                fs.writeFileSync(
                    filePath,
                    JSON.stringify(packageData, null, 2)
                );
                return true;
            }

            // Fallback to AI-based update for other file types
            const prompt = `Update ${versionFile} to use version ${newVersion}.
            Return the complete updated file content.`;

            const response = await generateCommitMessage(prompt);
            if (response) {
                fs.writeFileSync(filePath, response);
                return true;
            }
        } catch (error) {
            console.error("Error updating version file:", error);
        }
        return false;
    }

    async updateAllVersionFiles(newVersion: string): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return false;

        try {
            // Update package.json
            const packageJsonPath = path.join(
                workspaceFolders[0].uri.fsPath,
                "package.json"
            );
            if (fs.existsSync(packageJsonPath)) {
                await this.updateVersionFile("package.json", newVersion);
            }

            // Update package-lock.json
            const packageLockPath = path.join(
                workspaceFolders[0].uri.fsPath,
                "package-lock.json"
            );
            if (fs.existsSync(packageLockPath)) {
                await this.updateVersionFile("package-lock.json", newVersion);
            }

            return true;
        } catch (error) {
            console.error("Error updating version files:", error);
            return false;
        }
    }
}

export const versionService = VersionService.getInstance();
