import * as vscode from "vscode";
import {
    getGitStatus,
    stageAllChanges,
    commitChanges,
    getGitDiff,
} from "../git/gitOperations";
import { generateCommitMessage, validateApiKey } from "../ai/geminiService";

let autoCommitInterval: NodeJS.Timeout | null = null;
let inactivityTimeout: NodeJS.Timeout | null = null;
const DEFAULT_INTERVAL = 60 * 1000; // 1 minute
const INACTIVITY_DELAY = 10 * 1000; // 10 seconds

function resetInactivityTimer() {
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(() => {
        autoCommitChanges();
    }, INACTIVITY_DELAY);
}

export function enableAutoCommit(intervalMs?: number): void {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
    }
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }

    // Setup activity monitoring
    vscode.workspace.onDidChangeTextDocument(() => resetInactivityTimer());
    vscode.window.onDidChangeActiveTextEditor(() => resetInactivityTimer());
    vscode.window.onDidChangeTextEditorSelection(() => resetInactivityTimer());

    // Start initial inactivity timer
    resetInactivityTimer();

    // Start regular interval commits
    autoCommitInterval = setInterval(async () => {
        await autoCommitChanges();
    }, intervalMs ?? DEFAULT_INTERVAL);
}

export function disableAutoCommit(): void {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
        autoCommitInterval = null;
    }
}

export async function autoCommitChanges(): Promise<void> {
    try {
        // Validate API key first
        const isValid = await validateApiKey();
        if (!isValid) {
            return;
        }

        // Check for changes
        const status = await getGitStatus();
        if (
            status.modified.length === 0 &&
            status.not_added.length === 0 &&
            status.deleted.length === 0
        ) {
            vscode.window.showInformationMessage("No changes to commit");
            return;
        }

        // Get diff and generate commit message
        const diff = await getGitDiff();
        const message = await generateCommitMessage(diff);
        if (!message) {
            vscode.window.showErrorMessage("Failed to generate commit message");
            return;
        }

        // Stage and commit changes
        await stageAllChanges();
        await commitChanges(message);

        vscode.window.showInformationMessage(`Changes committed: ${message}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Auto-commit failed: ${error.message}`);
    }
}
