import * as vscode from "vscode";
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

        // Common version files across different ecosystems
        const versionFiles = [
            "package.json", // Node.js
            "pyproject.toml", // Python
            "build.gradle", // Gradle
            "pom.xml", // Maven
            "Cargo.toml", // Rust
            "composer.json", // PHP
            "project.clj", // Clojure
            "*.csproj", // .NET
            "setup.py", // Python
            "version.txt", // Generic
            "VERSION", // Generic
        ];

        // Check for each version file in the workspace
        for (const filePattern of versionFiles) {
            try {
                const files = await vscode.workspace.findFiles(filePattern);
                if (files.length > 0) {
                    return path.basename(files[0].fsPath);
                }
            } catch (error) {
                console.error(`Error searching for ${filePattern}:`, error);
            }
        }
        return null;
    }

    async getCurrentVersion(versionFile: string): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        try {
            const filePath = path.join(
                workspaceFolders[0].uri.fsPath,
                versionFile
            );
            const fileContent = fs.readFileSync(filePath, "utf8");

            // Handle different file types
            switch (path.extname(versionFile)) {
                case ".json":
                    return this.getJsonVersion(fileContent);
                case ".toml":
                    return this.getTomlVersion(fileContent);
                case ".xml":
                    return this.getXmlVersion(fileContent);
                case ".gradle":
                    return this.getGradleVersion(fileContent);
                case ".py":
                    return this.getPythonVersion(fileContent);
                case ".txt":
                case "":
                    return this.getPlainTextVersion(fileContent);
                default:
                    return null;
            }
        } catch (error) {
            console.error("Error getting current version:", error);
            return null;
        }
    }

    private getJsonVersion(content: string): string | null {
        try {
            const json = JSON.parse(content);
            return json.version || null;
        } catch (error) {
            console.error("Error parsing JSON version:", error);
            return null;
        }
    }

    private getTomlVersion(content: string): string | null {
        const match = content.match(/version\s*=\s*["']([^"']+)["']/);
        return match?.[1] || null;
    }

    private getXmlVersion(content: string): string | null {
        const match = content.match(/<version>([^<]+)<\/version>/);
        return match?.[1] || null;
    }

    private getGradleVersion(content: string): string | null {
        const match = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
        return match?.[1] || null;
    }

    private getPythonVersion(content: string): string | null {
        const match = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
        return match?.[1] || null;
    }

    private getPlainTextVersion(content: string): string | null {
        return content.trim();
    }

    validateSemver(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }
}

export const versionService = VersionService.getInstance();
