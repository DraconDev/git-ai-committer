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
              vscode.Uri.parse("https://aistudio.google.com/apikey")
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
      preferredAIProvider: config.get<string>("preferredAIProvider", ""),
      geminiModel: config.get<string>("geminiModel", ""),
      geminiApiKey: config.get<string>("geminiApiKey", ""),
      openRouterApiKey: config.get<string>("openRouterApiKey", ""),
      openRouterModel: config.get<string>("openRouterModel", ""),
      openaiApiKey: config.get<string>("openaiApiKey", ""),
      openaiModel: config.get<string>("openaiModel", ""),
      anthropicApiKey: config.get<string>("anthropicApiKey", ""),
      anthropicModel: config.get<string>("anthropicModel", ""),
      backupProvider1: config.get<string>("backupProvider1", "none"),
      backupProvider2: config.get<string>("backupProvider2", "none"),
      primaryProviderModel: config.get<string>("primaryProviderModel", ""),
      backupProvider1Model: config.get<string>("backupProvider1Model", ""),
      backupProvider2Model: config.get<string>("backupProvider2Model", ""),
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
        ".vscode/**",
        ".idea/**",
        ".vs/**",
        "node_modules/**",
        ".git/**",
        "dist/**",
        "build/**",
        "*.swp",
        "*.swo",
        ".DS_Store",
        "Thumbs.db",
      ]),
      versionBumpingEnabled: config.get<boolean>(
        "versionBumpingEnabled",
        false
      ),
      featureSummaryDefaultCount: config.get<number>(
        "featureSummary.defaultCommitCount",
        25
      ),
      featureSummaryAutoVersionBump: config.get<boolean>(
        "featureSummary.autoVersionBump",
        false
      ),
      featureSummaryIncludeFiles: config.get<boolean>(
        "featureSummary.includeFileList",
        true
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

      if (settings.primaryProviderModel !== undefined) {
        await config.update(
          "primaryProviderModel",
          settings.primaryProviderModel,
          vscode.ConfigurationTarget.Global
        );
      }

      if (settings.backupProvider1Model !== undefined) {
        await config.update(
          "backupProvider1Model",
          settings.backupProvider1Model,
          vscode.ConfigurationTarget.Global
        );
      }

      if (settings.backupProvider2Model !== undefined) {
        await config.update(
          "backupProvider2Model",
          settings.backupProvider2Model,
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

      if (settings.featureSummaryDefaultCount !== undefined) {
        await config.update(
          "featureSummary.defaultCommitCount",
          settings.featureSummaryDefaultCount,
          vscode.ConfigurationTarget.Global
        );
      }

      if (settings.featureSummaryAutoVersionBump !== undefined) {
        await config.update(
          "featureSummary.autoVersionBump",
          settings.featureSummaryAutoVersionBump,
          vscode.ConfigurationTarget.Global
        );
      }

      if (settings.featureSummaryIncludeFiles !== undefined) {
        await config.update(
          "featureSummary.includeFileList",
          settings.featureSummaryIncludeFiles,
          vscode.ConfigurationTarget.Global
        );
      }

      vscode.window.showInformationMessage("Settings saved successfully!");
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

        .number-input {
            width: 80px !important;
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

        .api-provider-block {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-bottom: 12px;
        }
        
        .api-provider-block:last-child {
            margin-bottom: 0;
        }
        
        .api-provider-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            cursor: pointer;
            user-select: none;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .api-provider-header:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .api-provider-title {
            font-weight: 600;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .chevron {
            width: 16px;
            height: 16px;
            transition: transform 0.2s;
        }
        
        .chevron.expanded {
            transform: rotate(90deg);
        }
        
        .api-provider-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            padding: 0 16px;
        }
        
        .api-provider-content.expanded {
            max-height: 500px;
            padding: 16px;
            transition: max-height 0.3s ease-in;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Git AI Committer Settings</h1>
        <p class="subtitle">Configure your auto-commit preferences and AI provider settings</p>

        <!-- API Configuration Section -->
        <div class="section">
            <div class="section-header">API Configuration</div>
            
            <div class="api-provider-block">
                <div class="api-provider-header" data-provider="gemini">
                    <div class="api-provider-title">
                        <span class="chevron">▶</span>
                        <span>Google Gemini</span>
                    </div>
                </div>
                <div class="api-provider-content" id="gemini-content">
                    <div class="form-group">
                        <label for="gemini-api-key">API Key</label>
                        <input type="password" id="gemini-api-key" placeholder="Enter your API key">
                        <div class="description">
                            Get your free API key from <a href="#" class="link" id="api-key-link">Google AI Studio</a>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="gemini-model">Model</label>
                        <input type="text" id="gemini-model" placeholder="gemini-1.5-flash-latest">
                        <div class="description">
                            Enter the Gemini model ID (e.g., gemini-1.5-flash-latest, gemini-1.5-pro)
                        </div>
                    </div>
                </div>
            </div>

            <div class="api-provider-block">
                <div class="api-provider-header" data-provider="openrouter">
                    <div class="api-provider-title">
                        <span class="chevron">▶</span>
                        <span>OpenRouter</span>
                    </div>
                </div>
                <div class="api-provider-content" id="openrouter-content">
                    <div class="form-group">
                        <label for="openrouter-api-key">API Key</label>
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
            </div>

            <div class="api-provider-block">
                <div class="api-provider-header" data-provider="openai">
                    <div class="api-provider-title">
                        <span class="chevron">▶</span>
                        <span>OpenAI</span>
                    </div>
                </div>
                <div class="api-provider-content" id="openai-content">
                    <div class="form-group">
                        <label for="openai-api-key">API Key</label>
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
            </div>

            <div class="api-provider-block">
                <div class="api-provider-header" data-provider="anthropic">
                    <div class="api-provider-title">
                        <span class="chevron">▶</span>
                        <span>Anthropic</span>
                    </div>
                </div>
                <div class="api-provider-content" id="anthropic-content">
                    <div class="form-group">
                        <label for="anthropic-api-key">API Key</label>
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
            </div>
        </div>

        <!-- Provider Priority Section -->
        <div class="section">
            <div class="section-header">Provider Priority</div>
            
            <div class="form-group">
                <label for="primary-provider">Primary Provider</label>
                <select id="primary-provider">
                    <option value="">None (Explicit Selection Required)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openRouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="copilot">Editor Built-in AI</option>
                </select>
                <div class="description">Your main AI service for generating commit messages</div>
            </div>

            <div class="form-group">
                <label for="primary-provider-model">Primary Provider Model (Optional)</label>
                <input type="text" id="primary-provider-model" placeholder="e.g., gemini-flash-lite-latest, gpt-4o, claude-3-5-sonnet-20240620">
                <div class="description">Specific model to use with primary provider (optional, leave empty to use provider default)</div>
            </div>

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
                <label for="backup-provider-1-model">Backup Provider 1 Model (Optional)</label>
                <input type="text" id="backup-provider-1-model" placeholder="e.g., x-ai/grok-4.1-fast:free, gpt-4o-mini, claude-3-5-sonnet-20240620">
                <div class="description">Specific model to use with backup provider 1 (optional, leave empty to use provider default)</div>
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

            <div class="form-group">
                <label for="backup-provider-2-model">Backup Provider 2 Model (Optional)</label>
                <input type="text" id="backup-provider-2-model" placeholder="e.g., x-ai/grok-4.1-fast:free, gpt-4o-mini, claude-3-5-sonnet-20240620">
                <div class="description">Specific model to use with backup provider 2 (optional, leave empty to use provider default)</div>
            </div>
        </div>

        <!-- Auto-Commit Settings -->
        <div class="section">
            <div class="section-header">Timing & Behavior</div>
            
            <div class="form-group">
                <label for="inactivity-delay">
                    Inactivity Delay (seconds)
                    <span class="info-badge">Auto-enabled</span>
                </label>
                <div class="range-container">
                    <input type="range" id="inactivity-delay" min="1" max="300" step="1">
                    <input type="number" id="inactivity-input" class="number-input" min="1" max="300">
                </div>
                <div class="description">
                    Seconds to wait after you stop typing before checking for changes to commit
                </div>
            </div>

            <div class="form-group">
                <label for="min-commit-delay">Minimum Time Between Commits (seconds)</label>
                <div class="range-container">
                    <input type="range" id="min-commit-delay" min="5" max="300" step="5">
                    <input type="number" id="min-commit-input" class="number-input" min="5" max="300">
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

        function populateSettings(settings) {
            // API Keys & Models
            document.getElementById('gemini-api-key').value = settings.geminiApiKey || '';
            document.getElementById('openrouter-api-key').value = settings.openRouterApiKey || '';
            document.getElementById('openrouter-model').value = settings.openRouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
            document.getElementById('openai-api-key').value = settings.openaiApiKey || '';
            document.getElementById('openai-model').value = settings.openaiModel || 'gpt-4o';
            document.getElementById('anthropic-api-key').value = settings.anthropicApiKey || '';
            document.getElementById('anthropic-model').value = settings.anthropicModel || 'claude-3-5-sonnet-20240620';
            
            // Provider Priority
            document.getElementById('primary-provider').value = settings.preferredAIProvider || '';
            document.getElementById('backup-provider-1').value = settings.backupProvider1 || 'none';
            document.getElementById('backup-provider-2').value = settings.backupProvider2 || 'none';
            
            // Provider Models
            document.getElementById('primary-provider-model').value = settings.primaryProviderModel || '';
            document.getElementById('backup-provider-1-model').value = settings.backupProvider1Model || '';
            document.getElementById('backup-provider-2-model').value = settings.backupProvider2Model || '';
            
            // Timing
            document.getElementById('inactivity-delay').value = settings.inactivityDelay;
            document.getElementById('inactivity-input').value = settings.inactivityDelay;
            
            document.getElementById('min-commit-delay').value = settings.minCommitDelay;
            document.getElementById('min-commit-input').value = settings.minCommitDelay;

            // Version Bumping
            document.getElementById('version-bumping').checked = settings.versionBumpingEnabled;
            updateVersionBumpingStatus(settings.versionBumpingEnabled);

            // Ignored Patterns
            const patterns = settings.ignoredFilePatterns || [];
            document.getElementById('ignored-patterns').value = patterns.join('\\n');
        }

        function updateVersionBumpingStatus(enabled) {
            document.getElementById('version-bumping-status').textContent = enabled ? 'Enabled' : 'Disabled';
        }

        // Sync Range and Number inputs
        function syncInputs(sourceId, targetId) {
            const source = document.getElementById(sourceId);
            const target = document.getElementById(targetId);
            
            source.addEventListener('input', (e) => {
                target.value = e.target.value;
            });
        }

        syncInputs('inactivity-delay', 'inactivity-input');
        syncInputs('inactivity-input', 'inactivity-delay');
        syncInputs('min-commit-delay', 'min-commit-input');
        syncInputs('min-commit-input', 'min-commit-delay');

        // Accordion toggle functionality for API providers
        document.querySelectorAll('.api-provider-header').forEach(header => {
            header.addEventListener('click', () => {
                const provider = header.getAttribute('data-provider');
                const content = document.getElementById(provider + '-content');
                const chevron = header.querySelector('.chevron');
                
                // Toggle the content
                if (content.classList.contains('expanded')) {
                    content.classList.remove('expanded');
                    chevron.classList.remove('expanded');
                } else {
                    content.classList.add('expanded');
                    chevron.classList.add('expanded');
                }
            });
        });

        document.getElementById('version-bumping').addEventListener('change', (e) => {
            updateVersionBumpingStatus(e.target.checked);
        });

        document.getElementById('save-button').addEventListener('click', () => {
            const settings = {
                preferredAIProvider: document.getElementById('primary-provider').value,
                geminiApiKey: document.getElementById('gemini-api-key').value,
                openRouterApiKey: document.getElementById('openrouter-api-key').value,
                openRouterModel: document.getElementById('openrouter-model').value,
                openaiApiKey: document.getElementById('openai-api-key').value,
                openaiModel: document.getElementById('openai-model').value,
                anthropicApiKey: document.getElementById('anthropic-api-key').value,
                anthropicModel: document.getElementById('anthropic-model').value,
                backupProvider1: document.getElementById('backup-provider-1').value,
                backupProvider2: document.getElementById('backup-provider-2').value,
                primaryProviderModel: document.getElementById('primary-provider-model').value,
                backupProvider1Model: document.getElementById('backup-provider-1-model').value,
                backupProvider2Model: document.getElementById('backup-provider-2-model').value,
                inactivityDelay: parseInt(document.getElementById('inactivity-input').value),
                minCommitDelay: parseInt(document.getElementById('min-commit-input').value),
                versionBumpingEnabled: document.getElementById('version-bumping').checked,
                ignoredFilePatterns: document.getElementById('ignored-patterns').value
                    .split('\\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
            };

            vscode.postMessage({
                type: 'updateSettings',
                settings
            });
        });

        document.getElementById('reset-button').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                const defaults = {
                    preferredAIProvider: '',
                    geminiApiKey: '',
                    openRouterApiKey: '',
                    openRouterModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
                    openaiApiKey: '',
                    openaiModel: 'gpt-4o',
                    anthropicApiKey: '',
                    anthropicModel: 'claude-3-5-sonnet-20240620',
                    backupProvider1: 'none',
                    backupProvider2: 'none',
                    primaryProviderModel: '',
                    backupProvider1Model: '',
                    backupProvider2Model: '',
                    inactivityDelay: 5,
                    minCommitDelay: 15,
                    versionBumpingEnabled: false,
                    ignoredFilePatterns: [
                        "*.tmp", "*.temp", "*.log", "*.cache", "*.dll", "*.exe", "*.env",
                        ".vscode/**", ".idea/**", ".vs/**", "node_modules/**", ".git/**",
                        "dist/**", "build/**", "*.swp", "*.swo", ".DS_Store", "Thumbs.db"
                    ]
                };
                populateSettings(defaults);
                // Auto-save defaults
                vscode.postMessage({
                    type: 'updateSettings',
                    settings: defaults
                });
            }
        });

        document.getElementById('api-key-link').addEventListener('click', () => {
            vscode.postMessage({ type: 'openApiKeyLink' });
        });
    </script>
</body>
</html>`;
  }
}
