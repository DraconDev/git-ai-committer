import * as vscode from "vscode";

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
                                vscode.workspace
                                    .getConfiguration("gitAiCommitter")
                                    .update(
                                        "autoCommitInterval",
                                        message.interval,
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
                vscode.postMessage({ 
                    command: 'saveSettings',
                    interval: parseInt(interval)
                });
            });
            
            // Handle incoming messages
            window.addEventListener('message', (event) => {
                const message = event.data;
                switch (message.command) {
                    case 'updateSettings':
                        document.getElementById('interval').value = message.interval;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}
