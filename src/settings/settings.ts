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

export function registerSettingsView(context: vscode.ExtensionContext) {
    // Register settings view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "git-ai-commiter.settingsView",
            {
                resolveWebviewView(webviewView) {
                    webviewView.webview.options = {
                        enableScripts: true,
                    };

                    webviewView.webview.html = getWebviewContent();

                    webviewView.webview.onDidReceiveMessage((message) => {
                        switch (message.command) {
                            case "saveSettings":
                                const config =
                                    vscode.workspace.getConfiguration(
                                        "gitAiCommitter"
                                    );
                                config.update(
                                    "autoCommitInterval",
                                    message.interval,
                                    vscode.ConfigurationTarget.Global
                                );
                                config.update(
                                    "inactivityDelay",
                                    message.inactivity,
                                    vscode.ConfigurationTarget.Global
                                );
                                config.update(
                                    "minCommitDelay",
                                    message.minDelay,
                                    vscode.ConfigurationTarget.Global
                                );
                                break;
                        }
                    });
                },
            }
        )
    );
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Git AI Committer Settings</title>
    </head>
    <body>
        <h1>Git AI Committer Settings</h1>
        <form id="settings-form">
            <div>
                <label for="interval">Auto Commit Interval (minutes):</label>
                <input type="number" id="interval" name="interval" min="1" max="60" required>
            </div>
            <div>
                <label for="inactivity">Inactivity Delay Before Commit (seconds):</label>
                <input type="number" id="inactivity" name="inactivity" min="5" max="300" required>
            </div>
            <div>
                <label for="minDelay">Minimum Time Between Commits (seconds):</label>
                <input type="number" id="minDelay" name="minDelay" min="10" max="600" required>
            </div>
            <button type="submit">Save</button>
        </form>
        <script>
            const vscode = acquireVsCodeApi();
            
            // Load current settings
            vscode.postMessage({ command: 'getSettings' });
            
            // Handle form submission
            document.getElementById('settings-form').addEventListener('submit', (event) => {
                event.preventDefault();
                const interval = document.getElementById('interval').value;
                const inactivity = document.getElementById('inactivity').value;
                const minDelay = document.getElementById('minDelay').value;
                vscode.postMessage({ 
                    command: 'saveSettings',
                    interval: parseInt(interval),
                    inactivity: parseInt(inactivity),
                    minDelay: parseInt(minDelay)
                });
            });
            
            // Handle incoming messages
            window.addEventListener('message', (event) => {
                const message = event.data;
                switch (message.command) {
                    case 'updateSettings':
                        document.getElementById('interval').value = message.interval;
                        document.getElementById('inactivity').value = message.inactivity;
                        document.getElementById('minDelay').value = message.minDelay;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}
