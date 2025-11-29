import * as vscode from "vscode";

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case "getSettings":
                        this._sendSettings();
                        break;
                    case "updateSettings":
                        await this._updateSettings(message.settings);
                        break;
                    case "openApiKeyLink":
                        vscode.env.openExternal(
                            vscode.Uri.parse(
                                "https://aistudio.google.com/apikey"
                            )
                        );
                        break;
                }
            },
            null,
            this._disposables
        );

        // Send initial settings
        this._sendSettings();
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        // If we already have a panel, show it.
        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            "gitAiCommitterSettings",
            "Git AI Committer Settings",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
    }

    private _sendSettings() {
        const config = vscode.workspace.getConfiguration("gitAiCommitter");
        const settings = {
            preferredAIProvider: config.get<string>(
                "preferredAIProvider",
                "gemini"
            ),
            geminiApiKey: config.get<string>("geminiApiKey", ""),
            openRouterApiKey: config.get<string>("openRouterApiKey", ""),
            openRouterModel: config.get<string>("openRouterModel", ""),
            openaiApiKey: config.get<string>("openaiApiKey", ""),
            openaiModel: config.get<string>("openaiModel", ""),
            anthropicApiKey: config.get<string>("anthropicApiKey", ""),
            anthropicModel: config.get<string>("anthropicModel", ""),
            backupProvider1: config.get<string>(
                "backupProvider1",
                "openRouter"
            ),
            backupProvider2: config.get<string>("backupProvider2", "copilot"),
            inactivityDelay: config.get<number>("inactivityDelay", 5),
            minCommitDelay: config.get<number>("minCommitDelay", 15),
            ignoredFilePatterns: config.get<string[]>("ignoredFilePatterns", [
                "*.tmp",
                "*.temp",
                "*.log",
                "*.cache",
                "*.dll",
                "*.exe",
                "*.env",
            ]),
            versionBumpingEnabled: config.get<boolean>(
                "versionBumpingEnabled",
                false
            ),
        };

        this._panel.webview.postMessage({
            type: "settings",
            settings,
        });
    }

    private async _updateSettings(settings: any) {
        const config = vscode.workspace.getConfiguration("gitAiCommitter");

        try {
            if (settings.preferredAIProvider !== undefined) {
                await config.update(
                    "preferredAIProvider",
                    settings.preferredAIProvider,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.geminiApiKey !== undefined) {
                await config.update(
                    "geminiApiKey",
                    settings.geminiApiKey,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.openRouterApiKey !== undefined) {
                await config.update(
                    "openRouterApiKey",
                    settings.openRouterApiKey,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.openRouterModel !== undefined) {
                await config.update(
                    "openRouterModel",
                    settings.openRouterModel,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.openaiApiKey !== undefined) {
                await config.update(
                    "openaiApiKey",
                    settings.openaiApiKey,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.openaiModel !== undefined) {
                await config.update(
                    "openaiModel",
                    settings.openaiModel,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.anthropicApiKey !== undefined) {
                await config.update(
                    "anthropicApiKey",
                    settings.anthropicApiKey,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.anthropicModel !== undefined) {
                await config.update(
                    "anthropicModel",
                    settings.anthropicModel,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.backupProvider1 !== undefined) {
                await config.update(
                    "backupProvider1",
                    settings.backupProvider1,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.backupProvider2 !== undefined) {
                await config.update(
                    "backupProvider2",
                    settings.backupProvider2,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.inactivityDelay !== undefined) {
                await config.update(
                    "inactivityDelay",
                    settings.inactivityDelay,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.minCommitDelay !== undefined) {
                await config.update(
                    "minCommitDelay",
                    settings.minCommitDelay,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.ignoredFilePatterns !== undefined) {
                await config.update(
                    "ignoredFilePatterns",
                    settings.ignoredFilePatterns,
                    vscode.ConfigurationTarget.Global
                );
            }

            if (settings.versionBumpingEnabled !== undefined) {
                await config.update(
                    "versionBumpingEnabled",
                    settings.versionBumpingEnabled,
                    vscode.ConfigurationTarget.Global
                );
            }

            vscode.window.showInformationMessage(
                "Settings saved successfully!"
            );
            this._sendSettings();
        } catch (error: any) {
            vscode.window.showErrorMessage(
                `Failed to save settings: ${error.message}`
            );
        }
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git AI Committer Settings</title>
    <style>
        :root {
            --container-padding: 20px;
            --input-padding: 8px 12px;
            --section-spacing: 24px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: var(--container-padding);
            margin: 0;
            line-height: 1.6;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            color: var(--vscode-foreground);
            margin-bottom: 8px;
            font-size: 24px;
            font-weight: 600;
        }

        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 32px;
            font-size: 14px;
        }

        .section {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: var(--section-spacing);
        }

        .section-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-header::before {
            content: "";
            display: inline-block;
            width: 4px;
            height: 20px;
            background: var(--vscode-focusBorder);
            border-radius: 2px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group:last-child {
            margin-bottom: 0;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            line-height: 1.5;
        }

        input[type="text"],
        input[type="password"],
        input[type="number"],
        textarea,
        select {
            width: 100%;
            padding: var(--input-padding);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            outline: none;
        }

        input[type="text"]:focus,
        input[type="password"]:focus,
        input[type="number"]:focus,
        textarea:focus,
        select:focus {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }

        textarea {
            min-height: 120px;
            resize: vertical;
            font-family: var(--vscode-editor-font-family);
        }

        .radio-group {
            display: flex;
            gap: 20px;
            margin-top: 8px;
        }

        .radio-option {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        input[type="radio"] {
            cursor: pointer;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            transition: .3s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: var(--vscode-foreground);
            transition: .3s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: var(--vscode-button-background);
            border-color: var(--vscode-button-background);
        }

        input:checked + .slider:before {
            transform: translateX(20px);
            background-color: var(--vscode-button-foreground);
        }

        .toggle-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .range-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        input[type="range"] {
            flex: 1;
            -webkit-appearance: none;
            height: 6px;
            border-radius: 3px;
            background: var(--vscode-input-background);
            outline: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--vscode-button-background);
            cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--vscode-button-background);
            cursor: pointer;
            border: none;
        }

        .range-value {
            min-width: 60px;
            text-align: right;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            cursor: pointer;
        }

        .link:hover {
            text-decoration: underline;
        }

        .info-badge {
            display: inline-block;
            padding: 2px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Git AI Committer Settings</h1>
        <p class="subtitle">Configure your auto-commit preferences and AI provider settings</p>

        <!-- AI Provider Section -->
        <div class="section">
            <div class="section-header">AI Provider Configuration</div>
            
            <div class="form-group">
                <label>Preferred AI Provider</label>
                <div class="radio-group">
                    <div class="radio-option">
                        <input type="radio" id="provider-gemini" name="aiProvider" value="gemini">
                        <label for="provider-gemini" style="margin: 0;">Google Gemini</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="provider-openRouter" name="aiProvider" value="openRouter">
                        <label for="provider-openRouter" style="margin: 0;">OpenRouter</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="provider-openai" name="aiProvider" value="openai">
                        <label for="provider-openai" style="margin: 0;">OpenAI</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="provider-anthropic" name="aiProvider" value="anthropic">
                        <label for="provider-anthropic" style="margin: 0;">Anthropic</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="provider-copilot" name="aiProvider" value="copilot">
                        <label for="provider-copilot" style="margin: 0;">Editor Built-in AI</label>
                    </div>
                </div>
                <div class="description">Choose which AI service to use for generating commit messages</div>
            </div>

            <div class="form-group" id="gemini-key-group">
                <label for="gemini-api-key">Gemini API Key</label>
                <input type="password" id="gemini-api-key" placeholder="Enter your API key">
                <div class="description">
                    Get your free API key from 
                    <a href="#" class="link" id="api-key-link">Google AI Studio</a>
                </div>
            </div>

            <div id="openrouter-group" style="display: none;">
                <div class="form-group">
                    <label for="openrouter-api-key">OpenRouter API Key</label>
                    <input type="password" id="openrouter-api-key" placeholder="sk-or-...">
                    <div class="description">
                        Get your API key from <a href="https://openrouter.ai/keys" class="link">OpenRouter</a>
                    </div>
                </div>
                <div class="form-group">
                    <label for="openrouter-model">Model</label>
                    <input type="text" id="openrouter-model" placeholder="google/gemini-2.0-flash-lite-preview-02-05:free">
                    <div class="description">
                        Enter the model ID (e.g., anthropic/claude-3-opus, openai/gpt-4)
                    </div>
                </div>
            </div>

            <div id="openai-group" style="display: none;">
                <div class="form-group">
                    <label for="openai-api-key">OpenAI API Key</label>
                    <input type="password" id="openai-api-key" placeholder="sk-...">
                    <div class="description">
                        Get your API key from <a href="https://platform.openai.com/api-keys" class="link">OpenAI Platform</a>
                    </div>
                </div>
                <div class="form-group">
                    <label for="openai-model">Model</label>
                    <input type="text" id="openai-model" placeholder="gpt-4o">
                </div>
            </div>

            <div id="anthropic-group" style="display: none;">
                <div class="form-group">
                    <label for="anthropic-api-key">Anthropic API Key</label>
                    <input type="password" id="anthropic-api-key" placeholder="sk-ant-...">
                    <div class="description">
                        Get your API key from <a href="https://console.anthropic.com/settings/keys" class="link">Anthropic Console</a>
                    </div>
                </div>
                <div class="form-group">
                    <label for="anthropic-model">Model</label>
                    <input type="text" id="anthropic-model" placeholder="claude-3-5-sonnet-20240620">
                </div>
            </div>

            <div class="section-header" style="margin-top: 24px;">Failover Configuration</div>
            
            <div class="form-group">
                <label for="backup-provider-1">Backup Provider 1</label>
                <select id="backup-provider-1">
                    <option value="none">None</option>
                    <option value="copilot">Editor Built-in AI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openRouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                </select>
                <div class="description">First backup to try if the primary provider fails</div>
            </div>

            <div class="form-group">
                <label for="backup-provider-2">Backup Provider 2</label>
                <select id="backup-provider-2">
                    <option value="none">None</option>
                    <option value="copilot">Editor Built-in AI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openRouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                </select>
                <div class="description">Second backup to try if both primary and first backup fail</div>
            </div>
        </div>

        <!-- Auto-Commit Settings -->
        <div class="section">
            <div class="section-header">Timing & Behavior</div>
            
            <div class="form-group">
                <label for="inactivity-delay">
                    Inactivity Delay
                    <span class="info-badge">Auto-enabled</span>
                </label>
                <div class="range-container">
                    <input type="range" id="inactivity-delay" min="1" max="60" step="1">
                    <span class="range-value"><span id="inactivity-value">5</span>s</span>
                </div>
                <div class="description">
                    Seconds to wait after you stop typing before checking for changes to commit
                </div>
            </div>

            <div class="form-group">
                <label for="min-commit-delay">Minimum Time Between Commits</label>
                <div class="range-container">
                    <input type="range" id="min-commit-delay" min="5" max="120" step="5">
                    <span class="range-value"><span id="min-commit-value">15</span>s</span>
                </div>
                <div class="description">
                    Minimum seconds between actual commits to prevent rapid consecutive commits
                </div>
            </div>
        </div>

        <!-- Version Bumping -->
        <div class="section">
            <div class="section-header">Version Bumping</div>
            
            <div class="form-group">
                <label>Automatic Version Bumping</label>
                <div class="toggle-container">
                    <label class="toggle-switch">
                        <input type="checkbox" id="version-bumping">
                        <span class="slider"></span>
                    </label>
                    <span id="version-bumping-status">Disabled</span>
                </div>
                <div class="description">
                    Automatically increment version numbers in package.json on each commit
                </div>
            </div>
        </div>

        <!-- Ignored Files -->
        <div class="section">
            <div class="section-header">Ignored File Patterns</div>
            
            <div class="form-group">
                <label for="ignored-patterns">File Patterns to Ignore</label>
                <textarea id="ignored-patterns" placeholder="*.tmp&#10;*.log&#10;*.cache"></textarea>
                <div class="description">
                    One pattern per line. These files will be excluded from auto-commits. Use glob patterns like *.tmp or **/*.log
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="button-group">
            <button id="save-button">Save Settings</button>
            <button id="reset-button" class="secondary">Reset to Defaults</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentSettings = {};

        // Request initial settings
        vscode.postMessage({ type: 'getSettings' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'settings') {
                currentSettings = message.settings;
                populateSettings(message.settings);
            }
        });

            // AI Provider
            document.getElementById('provider-' + settings.preferredAIProvider).checked = true;
            document.getElementById('gemini-api-key').value = settings.geminiApiKey || '';
            document.getElementById('openrouter-api-key').value = settings.openRouterApiKey || '';
            document.getElementById('openrouter-model').value = settings.openRouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
            document.getElementById('openai-api-key').value = settings.openaiApiKey || '';
            document.getElementById('openai-model').value = settings.openaiModel || 'gpt-4o';
            document.getElementById('anthropic-api-key').value = settings.anthropicApiKey || '';
            document.getElementById('anthropic-model').value = settings.anthropicModel || 'claude-3-5-sonnet-20240620';
            
            document.getElementById('backup-provider-1').value = settings.backupProvider1 || 'openRouter';
            document.getElementById('backup-provider-2').value = settings.backupProvider2 || 'copilot';
            
            updateProviderVisibility(settings.preferredAIProvider);

            // Timing
            document.getElementById('inactivity-delay').value = settings.inactivityDelay;
            document.getElementById('inactivity-value').textContent = settings.inactivityDelay;
            document.getElementById('min-commit-delay').value = settings.minCommitDelay;
            document.getElementById('min-commit-value').textContent = settings.minCommitDelay;

            // Version Bumping
            document.getElementById('version-bumping').checked = settings.versionBumpingEnabled;
            updateVersionBumpingStatus(settings.versionBumpingEnabled);

            // Ignored Patterns
            document.getElementById('ignored-patterns').value = settings.ignoredFilePatterns.join('\n');
        }

        function updateProviderVisibility(provider) {
            const geminiGroup = document.getElementById('gemini-key-group');
            const openRouterGroup = document.getElementById('openrouter-group');
            const openaiGroup = document.getElementById('openai-group');
            const anthropicGroup = document.getElementById('anthropic-group');
            
            geminiGroup.style.display = provider === 'gemini' ? 'block' : 'none';
            openRouterGroup.style.display = provider === 'openRouter' ? 'block' : 'none';
            openaiGroup.style.display = provider === 'openai' ? 'block' : 'none';
            anthropicGroup.style.display = provider === 'anthropic' ? 'block' : 'none';
        }

        function updateVersionBumpingStatus(enabled) {
            document.getElementById('version-bumping-status').textContent = enabled ? 'Enabled' : 'Disabled';
        }

        // AI Provider change
        document.querySelectorAll('input[name="aiProvider"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                updateProviderVisibility(e.target.value);
            });
        });

        // Range sliders
        document.getElementById('inactivity-delay').addEventListener('input', (e) => {
            document.getElementById('inactivity-value').textContent = e.target.value;
        });

        document.getElementById('min-commit-delay').addEventListener('input', (e) => {
            document.getElementById('min-commit-value').textContent = e.target.value;
        });

        // Version bumping toggle
        document.getElementById('version-bumping').addEventListener('change', (e) => {
            updateVersionBumpingStatus(e.target.checked);
        });

        // API key link
        document.getElementById('api-key-link').addEventListener('click', (e) => {
            e.preventDefault();
            vscode.postMessage({ type: 'openApiKeyLink' });
        });

        // Save button
        document.getElementById('save-button').addEventListener('click', () => {
            const provider = document.querySelector('input[name="aiProvider"]:checked').value;
            const patterns = document.getElementById('ignored-patterns').value
                .split('\\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            const settings = {
                preferredAIProvider: provider,
                geminiApiKey: document.getElementById('gemini-api-key').value,
                openRouterApiKey: document.getElementById('openrouter-api-key').value,
                openRouterModel: document.getElementById('openrouter-model').value,
                openaiApiKey: document.getElementById('openai-api-key').value,
                openaiModel: document.getElementById('openai-model').value,
                anthropicApiKey: document.getElementById('anthropic-api-key').value,
                anthropicModel: document.getElementById('anthropic-model').value,
                backupProvider1: document.getElementById('backup-provider-1').value,
                backupProvider2: document.getElementById('backup-provider-2').value,
                inactivityDelay: parseInt(document.getElementById('inactivity-delay').value),
                minCommitDelay: parseInt(document.getElementById('min-commit-delay').value),
                versionBumpingEnabled: document.getElementById('version-bumping').checked,
                ignoredFilePatterns: patterns
            };

            vscode.postMessage({ 
                type: 'updateSettings',
                settings 
            });
        });

        // Reset button
        document.getElementById('reset-button').addEventListener('click', () => {
            const defaults = {
                preferredAIProvider: 'gemini',
                geminiApiKey: '',
                inactivityDelay: 5,
                minCommitDelay: 15,
                versionBumpingEnabled: false,
                ignoredFilePatterns: ['*.tmp', '*.temp', '*.log', '*.cache', '*.dll', '*.exe', '*.env']
            };
            populateSettings(defaults);
        });
    </script>
</body>
</html>`;
    }
}
