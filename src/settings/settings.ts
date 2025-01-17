import * as vscode from "vscode";

export class SettingsService {
    private static instance: SettingsService;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration("gitAiCommitter");
    }

    public static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    public get enabled(): boolean {
        return this.config.get<boolean>("enabled", true);
    }

    public get geminiApiKey(): string {
        return this.config.get<string>("geminiApiKey", "");
    }

    public get commitInterval(): number {
        return this.config.get<number>("commitInterval", 60);
    }

    public get inactivityTimeout(): number {
        return this.config.get<number>("inactivityTimeout", 10);
    }

    public async setCommitInterval(seconds: number): Promise<void> {
        await this.config.update(
            "commitInterval",
            seconds,
            vscode.ConfigurationTarget.Global
        );
    }

    public async setInactivityTimeout(seconds: number): Promise<void> {
        await this.config.update(
            "inactivityTimeout",
            seconds,
            vscode.ConfigurationTarget.Global
        );
    }

    public async setEnabled(enabled: boolean): Promise<void> {
        await this.config.update(
            "enabled",
            enabled,
            vscode.ConfigurationTarget.Global
        );
    }

    public async setGeminiApiKey(apiKey: string): Promise<void> {
        await this.config.update(
            "geminiApiKey",
            apiKey,
            vscode.ConfigurationTarget.Global
        );
    }
}
