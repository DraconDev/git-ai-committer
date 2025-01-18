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
        if (!workspaceFolders) {
            return null;
        }

        // Common version files across different ecosystems
        const versionFiles = [
            "package.json", // Node.js
            "package-lock.json", // Node.js lock file
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
        if (!workspaceFolders) {
            return null;
        }

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

    async updateVersionFile(
        versionFile: string,
        newVersion: string
    ): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return false;
        }

        try {
            const filePath = path.join(
                workspaceFolders[0].uri.fsPath,
                versionFile
            );
            let fileContent = fs.readFileSync(filePath, "utf8");

            // Handle different file types
            switch (path.extname(versionFile)) {
                case ".json":
                    if (versionFile === "package-lock.json") {
                        const json = JSON.parse(fileContent);
                        if (json.packages && json.packages[""]) {
                            json.packages[""].version = newVersion;
                        }
                        if (json.version) {
                            json.version = newVersion;
                        }
                        fileContent = JSON.stringify(json, null, 2);
                    } else {
                        fileContent = this.updateJsonVersion(
                            fileContent,
                            newVersion
                        );
                    }
                    break;
                case ".toml":
                    fileContent = this.updateTomlVersion(
                        fileContent,
                        newVersion
                    );
                    break;
                case ".xml":
                    fileContent = this.updateXmlVersion(
                        fileContent,
                        newVersion
                    );
                    break;
                case ".gradle":
                    fileContent = this.updateGradleVersion(
                        fileContent,
                        newVersion
                    );
                    break;
                case ".py":
                    fileContent = this.updatePythonVersion(
                        fileContent,
                        newVersion
                    );
                    break;
                case ".txt":
                case "":
                    fileContent = this.updatePlainTextVersion(
                        fileContent,
                        newVersion
                    );
                    break;
                default:
                    return false;
            }

            fs.writeFileSync(filePath, fileContent);
            return true;
        } catch (error) {
            console.error("Error updating version file:", error);
            return false;
        }
    }

    private updateJsonVersion(content: string, newVersion: string): string {
        const json = JSON.parse(content);
        json.version = newVersion;
        return JSON.stringify(json, null, 2);
    }

    private updateTomlVersion(content: string, newVersion: string): string {
        return content.replace(
            /(version\s*=\s*["'])[^"']+(["'])/,
            `$1${newVersion}$2`
        );
    }

    private updateXmlVersion(content: string, newVersion: string): string {
        return content.replace(
            /(<version>)[^<]+(<\/version>)/,
            `$1${newVersion}$2`
        );
    }

    private updateGradleVersion(content: string, newVersion: string): string {
        return content.replace(
            /(version\s*=\s*['"])[^'"]+(['"])/,
            `$1${newVersion}$2`
        );
    }

    private updatePythonVersion(content: string, newVersion: string): string {
        return content.replace(
            /(version\s*=\s*['"])[^'"]+(['"])/,
            `$1${newVersion}$2`
        );
    }

    private updatePlainTextVersion(
        content: string,
        newVersion: string
    ): string {
        return newVersion;
    }
}

export const versionService = VersionService.getInstance();
