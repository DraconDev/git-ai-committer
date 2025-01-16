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
const INACTIVITY_DELAY = 5 * 60 * 1000; // 5 minutes

function resetInactivityTimer() {
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(() => {
        autoCommitChanges();
    }, INACTIVITY_DELAY);
}

export function enableAutoCommit(intervalMinutes?: number): void {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
    }

    // Setup activity monitoring
    vscode.workspace.onDidChangeTextDocument(() => resetInactivityTimer());

    autoCommitInterval = setInterval(async () => {
        await autoCommitChanges();
    }, intervalMinutes ?? 1 * 60 * 1000);
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
