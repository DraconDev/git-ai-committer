import * as vscode from "vscode";
import { pushChanges } from "../git/gitOperations";
import { commitService } from "../commit/commitService";

let autoCommitInterval: NodeJS.Timeout | null = null;
let inactivityTimeout: NodeJS.Timeout | null = null;
const DEFAULT_INTERVAL = 120 * 1000; // 2 minutes
const INACTIVITY_DELAY = 10 * 1000; // 10 seconds
const MIN_COMMIT_DELAY = 20 * 1000; // Minimum 20 seconds between commits
let generatingMessage = false;
let lastCommitTime = 0;
let changeQueue: vscode.TextDocumentChangeEvent[] = [];
let isProcessingQueue = false;

function resetInactivityTimer(event?: vscode.TextDocumentChangeEvent) {
    if (event) {
        changeQueue.push(event);
    }

    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(() => {
        processChangeQueue();
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
    vscode.workspace.onDidChangeTextDocument((e) => resetInactivityTimer(e));
    vscode.window.onDidChangeActiveTextEditor(() => resetInactivityTimer());
    vscode.window.onDidChangeTextEditorSelection(() => resetInactivityTimer());

    // Start initial inactivity timer
    resetInactivityTimer();

    // Start regular interval commits
    autoCommitInterval = setInterval(async () => {
        if (generatingMessage || isProcessingQueue) {
            return;
        }
        await processChangeQueue();
    }, intervalMs ?? DEFAULT_INTERVAL);
}

async function processChangeQueue(): Promise<void> {
    if (isProcessingQueue || changeQueue.length === 0) {
        return;
    }

    const now = Date.now();
    if (now - lastCommitTime < MIN_COMMIT_DELAY) {
        return;
    }

    isProcessingQueue = true;
    try {
        await autoCommitChanges();
        await pushChanges();
        changeQueue = [];
        lastCommitTime = Date.now();
    } catch (error) {
        console.error("Error processing changes:", error);
        // Retry after delay
        setTimeout(() => processChangeQueue(), MIN_COMMIT_DELAY);
    } finally {
        isProcessingQueue = false;
    }
}

export function disableAutoCommit(): void {
    if (autoCommitInterval) {
        clearInterval(autoCommitInterval);
        autoCommitInterval = null;
    }
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    changeQueue = [];
    isProcessingQueue = false;
}

export async function autoCommitChanges(): Promise<void> {
    if (generatingMessage) {
        return;
    }

    generatingMessage = true;
    try {
        await commitService.performCommit();
    } catch (error: any) {
        console.error("Error committing changes", error);
        throw error;
    } finally {
        generatingMessage = false;
    }
}
