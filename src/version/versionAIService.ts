import { AIBaseService } from "../ai/aiBaseService";
import * as vscode from "vscode";

export class VersionAIService extends AIBaseService {
    private static instance: VersionAIService;

    private constructor() {
        super();
    }

    public static getInstance(): VersionAIService {
        if (!VersionAIService.instance) {
            VersionAIService.instance = new VersionAIService();
        }
        return VersionAIService.instance;
    }

    async detectVersionFile(): Promise<string | null> {
        const prompt = `Analyze this project structure and determine the appropriate version file.
        Consider these common patterns:
        - package.json for Node.js
        - pyproject.toml for Python
        - build.gradle for Gradle
        - pom.xml for Maven
        - Cargo.toml for Rust
        - composer.json for PHP
        - project.clj for Clojure
        - *.csproj for .NET
        - setup.py for Python
        - version.txt or VERSION for generic projects
        
        Return just the filename.`;

        try {
            const response = await this.generateResponse(prompt);
            return response?.trim() || null;
        } catch (error) {
            console.error("AI error detecting version file:", error);
            return null;
        }
    }

    async getCurrentVersion(versionFile: string): Promise<string | null> {
        const prompt = `Read the current version from ${versionFile}.
        Return just the version number in semver format (e.g., 1.2.3).
        If no version is found, return null.`;

        try {
            const response = await this.generateResponse(prompt);
            const version = response?.trim();
            return version && this.validateSemver(version) ? version : null;
        } catch (error) {
            console.error("AI error getting current version:", error);
            return null;
        }
    }

    async updateVersionFileContent(
        versionFile: string,
        newVersion: string
    ): Promise<string | null> {
        const prompt = `Update ${versionFile} to use version ${newVersion}.
        Return the complete updated file content.
        Maintain the original file format and structure.`;

        try {
            const response = await this.generateResponse(prompt);
            return response || null;
        } catch (error) {
            console.error("AI error updating version file:", error);
            return null;
        }
    }

    private validateSemver(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }
}

export const versionAIService = VersionAIService.getInstance();
