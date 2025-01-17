import * as vscode from "vscode";
import { pushChanges } from "../git/gitOperations";
import { commitService } from "../commit/commitService";

let autoCommitInterval: NodeJS.Timeout | null = null;
let inactivityTimeout: NodeJS.Timeout | null = null;

function getConfig() {
    return vscode.workspace.getConfiguration("gitAiCommitter");
}

function getAutoCommitInterval() {
    return (getConfig().get<number>("autoCommitInterval") || 2) * 60 * 1000;
}

function getInactivityDelay() {
    return (getConfig().get<number>("inactivityDelay") || 10) * 1000;
}

function getMinCommitDelay() {
    return (getConfig().get<number>("minCommitDelay") || 20) * 1000;
}
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
    }, getInactivityDelay());
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
    }, intervalMs ?? getAutoCommitInterval());
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
