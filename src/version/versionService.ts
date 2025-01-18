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

    async bumpVersion(
        versionFile: string,
        currentVersion: string,
        isAutoCommit: boolean
    ): Promise<string | null> {
        const [major, minor, patch] = currentVersion.split(".").map(Number);

        if (isAutoCommit) {
            // AI-generated commits always bump patch version
            return `${major}.${minor}.${patch + 1}`;
        }

        // Manual commits can bump minor or major versions
        const prompt = `Given current version ${currentVersion}, suggest the next version number.
        This is a manual commit - consider if this should be a minor or major bump.
        Return just the new version number in semver format.`;

        try {
            const response = await generateCommitMessage(prompt);
            if (response) {
                return response.trim();
            }
        } catch (error) {
            console.error("Error bumping version:", error);
        }
        return null;
    }

    async updateVersionFile(
        versionFile: string,
        newVersion: string
    ): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return false;

        const prompt = `Update ${versionFile} to use version ${newVersion}.
        Return the complete updated file content.`;

        try {
            const response = await generateCommitMessage(prompt);
            if (response) {
                const filePath = path.join(
                    workspaceFolders[0].uri.fsPath,
                    versionFile
                );
                fs.writeFileSync(filePath, response);
                return true;
            }
        } catch (error) {
            console.error("Error updating version file:", error);
        }
        return false;
    }
}

export const versionService = VersionService.getInstance();
