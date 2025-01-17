import * as vscode from "vscode";
import { pushChanges } from "../git/gitOperations";
import { performCommit } from "../commit/commitService";

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
        pushChanges();
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
        pushChanges();
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
        await performCommit();
    } catch (error: any) {
        console.error("Error committing changes", error);
    }
}
