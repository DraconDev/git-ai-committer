import * as vscode from "vscode";
import { performCommit } from "../commands/commands";

let autoCommitInterval: NodeJS.Timeout | undefined;
let inactivityTimeout: NodeJS.Timeout | undefined;
let lastActivityTime: number = Date.now();

export function setupActivityMonitoring() {
    vscode.workspace.onDidChangeTextDocument(() => resetInactivityTimer());
}

export function resetInactivityTimer() {
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const inactivityTimeoutValue =
        config.get<number>("inactivityTimeout") || 10;

    lastActivityTime = Date.now();

    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }

    if (inactivityTimeoutValue > 0) {
        inactivityTimeout = setTimeout(async () => {
            const timeSinceLastActivity =
                (Date.now() - lastActivityTime) / 1000;
            if (timeSinceLastActivity >= inactivityTimeoutValue) {
                try {
                    await performCommit();
                } catch (error: any) {
                    console.error("Inactivity commit failed:", error);
                }
            }
        }, inactivityTimeoutValue * 1000);
    }
}

export async function enableAutoCommit() {
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    await config.update("enabled", true, vscode.ConfigurationTarget.Global);

    const commitInterval = config.get<number>("commitInterval") || 60;
    const inactivityTimeoutValue =
        config.get<number>("inactivityTimeout") || 10;

    disableAutoCommit();

    if (commitInterval > 0) {
        autoCommitInterval = setInterval(async () => {
            try {
                await performCommit();
            } catch (error: any) {
                console.error("Auto-commit failed:", error);
            }
        }, commitInterval * 1000);
    }

    if (inactivityTimeoutValue > 0) {
        resetInactivityTimer();
    }

    vscode.window.showInformationMessage(
        `Auto-commit enabled (interval: ${commitInterval}s, inactivity: ${inactivityTimeoutValue}s)`
    );
}

export function disableAutoCommit() {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
        autoCommitInterval = undefined;
    }
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = undefined;
    }

    vscode.window.showInformationMessage("Auto-commit disabled");
}
