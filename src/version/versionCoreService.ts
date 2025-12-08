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

    private static readonly VERSION_FILES = [
        "package.json", // Node.js
        "package-lock.json", // npm lock file (Supported)
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
        "wxt.config.ts", // WXT TypeScript configuration
        "wxt.config.js", // WXT JavaScript configuration
    ];

    public isVersionFile(filePath: string): boolean {
        const fileName = path.basename(filePath);
        return VersionService.VERSION_FILES.some((pattern) => {
            if (pattern.startsWith("*.")) {
                return fileName.endsWith(pattern.slice(1));
            }
            return fileName === pattern;
        });
    }

    async detectVersionFiles(repoPath: string): Promise<string[]> {
        // Common version files across different ecosystems
        const versionFiles = VersionService.VERSION_FILES;

        const detectedFiles: string[] = [];

        // Check for each version file in the repo root
        for (const filePattern of versionFiles) {
            try {
                if (filePattern.startsWith("*.")) {
                    // Start of rudimentary glob matching for extension
                    const entries = fs.readdirSync(repoPath);
                    const suffix = filePattern.slice(1);
                    for (const entry of entries) {
                        if (entry.endsWith(suffix)) {
                            detectedFiles.push(entry);
                        }
                    }
                } else {
                    const filePath = path.join(repoPath, filePattern);
                    if (fs.existsSync(filePath)) {
                        detectedFiles.push(filePattern);
                    }
                }
            } catch (error) {
                console.error(`Error searching for ${filePattern}:`, error);
            }
        }
        return detectedFiles;
    }

    async getCurrentVersion(
        repoPath: string,
        versionFile: string
    ): Promise<string | null> {
        try {
            const filePath = path.join(repoPath, versionFile);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs.readFileSync(filePath, "utf8");

            // Handle different file types
            switch (path.extname(versionFile)) {
                case ".json":
                    return this.getJsonVersion(fileContent);
                case ".yaml":
                case ".yml":
                    return this.getYamlVersion(fileContent);
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
                case ".ts":
                case ".js":
                    return this.getTsOrJsVersion(fileContent);
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

    private getYamlVersion(content: string): string | null {
        // Extract version from pnpm-lock.yaml or similar YAML files
        const match = content.match(/version:\s*["']?([^"'\s]+)["']?/);
        return match?.[1] || null;
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

    private getTsOrJsVersion(content: string): string | null {
        // Extract the version from the manifest object in the TS/JS file
        const match = content.match(/version:\s*["']([^"']+)["']/);
        return match?.[1] || null;
    }

    validateSemver(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }

    async updateVersionFiles(
        repoPath: string,
        newVersion: string
    ): Promise<string[]> {
        try {
            const versionFiles = await this.detectVersionFiles(repoPath);
            const updatedFiles: string[] = [];
            for (const versionFile of versionFiles) {
                const filePath = path.join(repoPath, versionFile);
                if (!fs.existsSync(filePath)) continue;

                const oldContent = fs.readFileSync(filePath, "utf8");
                let fileContent = oldContent;

                // Handle different file types for updating
                switch (path.extname(versionFile)) {
                    case ".json":
                        if (versionFile === "package-lock.json") {
                            // ... existing logic ...
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
                    case ".yaml":
                    case ".yml":
                        fileContent = this.updateYamlVersion(
                            fileContent,
                            newVersion
                        );
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
                    case ".ts":
                    case ".js":
                        fileContent = this.updateTsOrJsVersion(
                            fileContent,
                            newVersion
                        );
                        break;
                    default:
                        continue;
                }

                // Write new content only if it has changed
                if (fileContent !== oldContent) {
                    fs.writeFileSync(filePath, fileContent);
                    updatedFiles.push(filePath);
                }
            }
            return updatedFiles;
        } catch (error) {
            console.error("Error updating version files:", error);
            return [];
        }
    }

    private updateJsonVersion(content: string, newVersion: string): string {
        const json = JSON.parse(content);
        json.version = newVersion;
        return JSON.stringify(json, null, 2);
    }

    private updateYamlVersion(content: string, newVersion: string): string {
        // Update version in YAML files like pnpm-lock.yaml
        return content.replace(
            /(version:\s*["']?)[^"'\s]+(["']?)/,
            `$1${newVersion}$2`
        );
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

    private updateTsOrJsVersion(content: string, newVersion: string): string {
        // Update the version in the manifest object
        return content.replace(
            /(version:\s*["'])[^"']+(["'])/,
            `$1${newVersion}$2`
        );
    }
}

export const versionService = VersionService.getInstance();
