import * as vscode from "vscode";

const PROVIDERS = [
    { label: "$(sparkle) Google Gemini", value: "gemini" },
    { label: "$(globe) OpenRouter", value: "openRouter" },
    { label: "$(code) OpenAI", value: "openai" },
    { label: "$(hubot) Anthropic", value: "anthropic" },
    { label: "$(copilot) Copilot", value: "copilot" },
];

const PROVIDERS_WITH_NONE = [
    { label: "$(close) None", value: "none" },
    ...PROVIDERS,
];

function getConfig() {
    return vscode.workspace.getConfiguration("gitAiCommitter");
}

async function updateSetting(key: string, value: any) {
    await getConfig().update(key, value, vscode.ConfigurationTarget.Global);
}

// Main menu
export async function showSettingsMenu() {
    const config = getConfig();

    const primaryProvider =
        config.get<string>("preferredAIProvider", "") || "Not set";
    const backup1 = config.get<string>("backupProvider1", "none");
    const backup2 = config.get<string>("backupProvider2", "none");
    const inactivity = config.get<number>("inactivityDelay", 5);
    const minCommit = config.get<number>("minCommitDelay", 15);
    const versionBump = config.get<boolean>("versionBumpingEnabled", false);
    const smartGitignore = config.get<boolean>("smartGitignore", false);
    const ignorePatterns = config.get<string[]>("ignoredFilePatterns", []);
    const gitattributes = config.get<string[]>("gitattributesFilePatterns", []);

    const items: vscode.QuickPickItem[] = [
        {
            label: "$(key) API Keys & Models",
            description: "Configure provider credentials",
        },
        {
            label: "$(list-ordered) Provider Priority",
            description: `Primary: ${primaryProvider}, Backups: ${backup1}, ${backup2}`,
        },
        {
            label: "$(clock) Timing",
            description: `Inactivity: ${inactivity}s, Min Commit: ${minCommit}s`,
        },
        {
            label: `$(package) Version Bumping`,
            description: versionBump ? "Enabled" : "Disabled",
        },
        {
            label: `$(file-symlink-directory) Smart Gitignore`,
            description: smartGitignore ? "Enabled" : "Disabled",
        },
        {
            label: "$(exclude) Ignore Patterns",
            description: `${ignorePatterns.length} patterns`,
        },
        {
            label: "$(file-code) Gitattributes Patterns",
            description: `${gitattributes.length} patterns`,
        },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        {
            label: "$(settings-gear) Open VS Code Settings",
            description: "Full settings in JSON",
        },
    ];

    const selection = await vscode.window.showQuickPick(items, {
        title: "Git AI Committer Settings",
        placeHolder: "Select a category to configure",
    });

    if (!selection) return;

    switch (selection.label) {
        case "$(key) API Keys & Models":
            await showApiKeysMenu();
            break;
        case "$(list-ordered) Provider Priority":
            await showProviderPriorityMenu();
            break;
        case "$(clock) Timing":
            await showTimingMenu();
            break;
        case "$(package) Version Bumping":
            await toggleSetting("versionBumpingEnabled", "Version Bumping");
            break;
        case "$(file-symlink-directory) Smart Gitignore":
            await toggleSetting("smartGitignore", "Smart Gitignore");
            break;
        case "$(exclude) Ignore Patterns":
            await showPatternsEditor("ignoredFilePatterns", "Ignore Patterns");
            break;
        case "$(file-code) Gitattributes Patterns":
            await showPatternsEditor(
                "gitattributesFilePatterns",
                "Gitattributes Patterns"
            );
            break;
        case "$(settings-gear) Open VS Code Settings":
            vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "gitAiCommitter"
            );
            return;
    }

    // Return to main menu after action
    showSettingsMenu();
}

// API Keys submenu
async function showApiKeysMenu() {
    const items: vscode.QuickPickItem[] = [
        { label: "$(arrow-left) Back", description: "" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        {
            label: "$(sparkle) Google Gemini",
            description: getConfig().get<string>("geminiApiKey")
                ? "API key set"
                : "Not configured",
        },
        {
            label: "$(globe) OpenRouter",
            description: getConfig().get<string>("openRouterApiKey")
                ? "API key set"
                : "Not configured",
        },
        {
            label: "$(code) OpenAI",
            description: getConfig().get<string>("openaiApiKey")
                ? "API key set"
                : "Not configured",
        },
        {
            label: "$(hubot) Anthropic",
            description: getConfig().get<string>("anthropicApiKey")
                ? "API key set"
                : "Not configured",
        },
    ];

    const selection = await vscode.window.showQuickPick(items, {
        title: "API Keys & Models",
        placeHolder: "Select a provider to configure",
    });

    if (!selection || selection.label === "$(arrow-left) Back") return;

    switch (selection.label) {
        case "$(sparkle) Google Gemini":
            await configureProvider(
                "gemini",
                "geminiApiKey",
                "geminiModel",
                "gemini-flash-lite-latest"
            );
            break;
        case "$(globe) OpenRouter":
            await configureProvider(
                "openRouter",
                "openRouterApiKey",
                "openRouterModel",
                "google/gemini-2.0-flash-lite-preview-02-05:free"
            );
            break;
        case "$(code) OpenAI":
            await configureProvider(
                "openai",
                "openaiApiKey",
                "openaiModel",
                "gpt-4o"
            );
            break;
        case "$(hubot) Anthropic":
            await configureProvider(
                "anthropic",
                "anthropicApiKey",
                "anthropicModel",
                "claude-3-5-sonnet-20240620"
            );
            break;
    }

    // Return to API keys menu
    await showApiKeysMenu();
}

async function configureProvider(
    name: string,
    keyConfig: string,
    modelConfig: string,
    defaultModel: string
) {
    const config = getConfig();
    const currentKey = config.get<string>(keyConfig, "");
    const currentModel = config.get<string>(modelConfig, defaultModel);

    const items: vscode.QuickPickItem[] = [
        {
            label: "$(key) Set API Key",
            description: currentKey ? "••••••••" : "Not set",
        },
        {
            label: "$(symbol-method) Set Model",
            description: currentModel || defaultModel,
        },
    ];

    const selection = await vscode.window.showQuickPick(items, {
        title: `Configure ${name}`,
        placeHolder: "What would you like to configure?",
    });

    if (!selection) return;

    if (selection.label === "$(key) Set API Key") {
        const newKey = await vscode.window.showInputBox({
            title: `${name} API Key`,
            prompt: "Enter your API key",
            password: true,
            value: currentKey,
        });
        if (newKey !== undefined) {
            await updateSetting(keyConfig, newKey);
            vscode.window.showInformationMessage(`${name} API key updated!`);
        }
    } else if (selection.label === "$(symbol-method) Set Model") {
        const newModel = await vscode.window.showInputBox({
            title: `${name} Model`,
            prompt: "Enter the model name",
            value: currentModel || defaultModel,
        });
        if (newModel !== undefined) {
            await updateSetting(modelConfig, newModel);
            vscode.window.showInformationMessage(`${name} model updated!`);
        }
    }
}

// Provider Priority submenu
async function showProviderPriorityMenu() {
    const config = getConfig();

    const items: vscode.QuickPickItem[] = [
        { label: "$(arrow-left) Back", description: "" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        {
            label: "$(star-full) Primary Provider",
            description:
                config.get<string>("preferredAIProvider", "") || "Not set",
        },
        {
            label: "$(star-half) Backup Provider 1",
            description: config.get<string>("backupProvider1", "none"),
        },
        {
            label: "$(star-empty) Backup Provider 2",
            description: config.get<string>("backupProvider2", "none"),
        },
    ];

    const selection = await vscode.window.showQuickPick(items, {
        title: "Provider Priority",
        placeHolder: "Configure failover order",
    });

    if (!selection || selection.label === "$(arrow-left) Back") return;

    if (selection.label === "$(star-full) Primary Provider") {
        await selectProvider(
            "preferredAIProvider",
            "Primary Provider",
            PROVIDERS
        );
    } else if (selection.label === "$(star-half) Backup Provider 1") {
        await selectProvider(
            "backupProvider1",
            "Backup Provider 1",
            PROVIDERS_WITH_NONE
        );
    } else if (selection.label === "$(star-empty) Backup Provider 2") {
        await selectProvider(
            "backupProvider2",
            "Backup Provider 2",
            PROVIDERS_WITH_NONE
        );
    }

    await showProviderPriorityMenu();
}

async function selectProvider(
    configKey: string,
    title: string,
    providers: { label: string; value: string }[]
) {
    const current = getConfig().get<string>(configKey, "");
    const items = providers.map((p) => ({
        label: p.label,
        description: p.value === current ? "(current)" : "",
        value: p.value,
    }));

    const selection = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: "Select a provider",
    });

    if (selection) {
        await updateSetting(configKey, (selection as any).value);
        vscode.window.showInformationMessage(
            `${title} set to ${selection.label}`
        );
    }
}

// Timing submenu
async function showTimingMenu() {
    const config = getConfig();

    const items: vscode.QuickPickItem[] = [
        { label: "$(arrow-left) Back", description: "" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        {
            label: "$(watch) Inactivity Delay",
            description: `${config.get<number>("inactivityDelay", 5)} seconds`,
        },
        {
            label: "$(history) Minimum Commit Delay",
            description: `${config.get<number>("minCommitDelay", 15)} seconds`,
        },
    ];

    const selection = await vscode.window.showQuickPick(items, {
        title: "Timing Settings",
        placeHolder: "Configure timing",
    });

    if (!selection || selection.label === "$(arrow-left) Back") return;

    if (selection.label === "$(watch) Inactivity Delay") {
        await setNumberSetting(
            "inactivityDelay",
            "Inactivity Delay (seconds)",
            1,
            300
        );
    } else if (selection.label === "$(history) Minimum Commit Delay") {
        await setNumberSetting(
            "minCommitDelay",
            "Minimum Commit Delay (seconds)",
            5,
            300
        );
    }

    await showTimingMenu();
}

async function setNumberSetting(
    configKey: string,
    title: string,
    min: number,
    max: number
) {
    const current = getConfig().get<number>(configKey, min);

    const input = await vscode.window.showInputBox({
        title,
        prompt: `Enter a value between ${min} and ${max}`,
        value: String(current),
        validateInput: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num < min || num > max) {
                return `Please enter a number between ${min} and ${max}`;
            }
            return null;
        },
    });

    if (input !== undefined) {
        await updateSetting(configKey, parseInt(input, 10));
        vscode.window.showInformationMessage(`${title} updated!`);
    }
}

// Toggle setting
async function toggleSetting(configKey: string, name: string) {
    const current = getConfig().get<boolean>(configKey, false);
    await updateSetting(configKey, !current);
    vscode.window.showInformationMessage(
        `${name} ${!current ? "enabled" : "disabled"}`
    );
}

// Pattern editor
async function showPatternsEditor(configKey: string, title: string) {
    const config = getConfig();
    const patterns = config.get<string[]>(configKey, []);

    const items: vscode.QuickPickItem[] = [
        { label: "$(arrow-left) Back", description: "" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        { label: "$(add) Add Pattern", description: "" },
        { label: "$(trash) Remove Pattern", description: "" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        ...patterns.map((p) => ({ label: p, description: "" })),
    ];

    if (patterns.length === 0) {
        items.push({
            label: "$(info) No patterns configured",
            description: "",
        });
    }

    const selection = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: `${patterns.length} patterns configured`,
    });

    if (!selection || selection.label === "$(arrow-left) Back") return;

    if (selection.label === "$(add) Add Pattern") {
        const newPattern = await vscode.window.showInputBox({
            title: "Add Pattern",
            prompt: "Enter a file pattern (e.g., *.log, node_modules/**)",
        });
        if (newPattern) {
            await updateSetting(configKey, [...patterns, newPattern]);
            vscode.window.showInformationMessage(
                `Pattern "${newPattern}" added`
            );
        }
    } else if (selection.label === "$(trash) Remove Pattern") {
        const toRemove = await vscode.window.showQuickPick(
            patterns.map((p) => ({ label: p })),
            { title: "Remove Pattern", placeHolder: "Select pattern to remove" }
        );
        if (toRemove) {
            await updateSetting(
                configKey,
                patterns.filter((p) => p !== toRemove.label)
            );
            vscode.window.showInformationMessage(
                `Pattern "${toRemove.label}" removed`
            );
        }
    }

    await showPatternsEditor(configKey, title);
}

// Backward compatibility: keep the class but have it just call the menu
export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;

    public static createOrShow(_extensionUri: vscode.Uri) {
        showSettingsMenu();
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined;
    }
}
