import * as vscode from "vscode";
import { commitService } from "../commit/commitService";
import { pushChanges } from "../git/gitOperations";
import { versionService } from "../version/versionCoreService";

let inactivityTimeout: NodeJS.Timeout | null = null;
let generatingMessage = false;
let lastCommitAttemptTime = 0;
let changeQueue: vscode.TextDocumentChangeEvent[] = [];
let isProcessingQueue = false;

function getConfig() {
  return vscode.workspace.getConfiguration("gitAiCommitter");
}

function getInactivityDelay() {
  return (getConfig().get<number>("inactivityDelay") || 5) * 1000;
}

function getMinCommitDelay() {
  return (getConfig().get<number>("minCommitDelay") || 15) * 1000;
}

function resetInactivityTimer(event?: vscode.TextDocumentChangeEvent) {
  if (event) {
    // Ignore changes to version files to prevent infinite loops
    if (versionService.isVersionFile(event.document.fileName)) {
      return;
    }
    changeQueue.push(event);
  }

  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
  inactivityTimeout = setTimeout(() => {
    processChangeQueue();
  }, getInactivityDelay());
}

export function enableAutoCommit(): void {
  // Clear any existing timers
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }

  // Setup activity monitoring
  vscode.workspace.onDidChangeTextDocument((e) => resetInactivityTimer(e));
  vscode.window.onDidChangeActiveTextEditor(() => resetInactivityTimer());
  vscode.window.onDidChangeTextEditorSelection(() => resetInactivityTimer());

  // Start initial inactivity timer
  resetInactivityTimer();
}

async function processChangeQueue(): Promise<void> {
  if (isProcessingQueue || changeQueue.length === 0) {
    return;
  }

  const now = Date.now();
  if (now - lastCommitAttemptTime < getMinCommitDelay()) {
    return;
  }

  isProcessingQueue = true;
  lastCommitAttemptTime = Date.now(); // Update time before attempting commit
  try {
    await autoCommitChanges();
    await pushChanges();
    changeQueue = [];
  } catch (error) {
    // Error processing changes
    // Retry after delay
    setTimeout(() => processChangeQueue(), getMinCommitDelay());
  } finally {
    isProcessingQueue = false;
  }
}

export function disableAutoCommit(): void {
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
    // Check if we're in a version bump cycle to prevent infinite loops
    if (commitService.versionBumpInProgress) {
      console.log("Skipping auto-commit during version bump cycle");
      return;
    }
    await commitService.performCommit();
  } catch (error: any) {
    // Error committing changes
    throw error;
  } finally {
    generatingMessage = false;
  }
}
