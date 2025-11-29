import * as vscode from "vscode";
import { AIProvider } from "./aiService";
import { generateWithCopilot } from "./copilotService";
import { generateGeminiMessage } from "./geminiService";

interface FailoverAttempt {
    provider: string;
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Generates commit message with automatic AI provider failover
 * Tries: Primary → Backup 1 → Backup 2 (simplified) → null
 */
export async function generateCommitMessageWithFailover(
    diff: string,
    primaryProvider: AIProvider
): Promise<string | null> {
    const attempts: FailoverAttempt[] = [];
    const startTime = Date.now();

    // Attempt 1: Primary provider
    let message = await tryProvider(primaryProvider, diff, attempts);
    if (message) {
        logSuccess(primaryProvider, attempts, startTime);
        return message;
    }

    // Attempt 2: Backup provider (opposite of primary)
    const backupProvider =
        primaryProvider === AIProvider.Gemini
            ? AIProvider.Copilot
            : AIProvider.Gemini;

    vscode.window.showInformationMessage(
        `Primary AI failed, trying backup provider...`
    );

    message = await tryProvider(backupProvider, diff, attempts);
    if (message) {
        logSuccess(backupProvider, attempts, startTime);
        vscode.window.showInformationMessage(
            `Backup AI provider generated commit message successfully`
        );
        return message;
    }

    // Attempt 3: Primary again with simplified prompt (2nd backup)
    vscode.window.showInformationMessage(
        `First backup failed, trying simplified prompt...`
    );

    message = await tryProviderSimplified(primaryProvider, diff, attempts);
    if (message) {
        logSuccess(primaryProvider, attempts, startTime);
        vscode.window.showInformationMessage(
            `Simplified AI prompt generated commit message successfully`
        );
        return message;
    }

    // All attempts failed
    logAllFailures(attempts, startTime);
    vscode.window
        .showWarningMessage(
            `Failed to generate commit message after ${attempts.length} attempts. Skipping commit.`,
            "View Details"
        )
        .then((selection) => {
            if (selection === "View Details") {
                showFailureDetails(attempts);
            }
        });

    return null;
}

async function tryProvider(
    provider: AIProvider,
    diff: string,
    attempts: FailoverAttempt[]
): Promise<string | null> {
    const providerName =
        provider === AIProvider.Gemini ? "Gemini" : "Editor Built-in AI";

    try {
        let message: string | null = null;

        if (provider === AIProvider.Gemini) {
            message = await generateGeminiMessage(diff);
        } else {
            message = await generateWithCopilot(diff);
        }

        if (message && validateCommitMessage(message)) {
            attempts.push({
                provider: providerName,
                success: true,
                message: message.substring(0, 100),
            });
            return message;
        }

        attempts.push({
            provider: providerName,
            success: false,
            error: "Invalid message format",
        });
        return null;
    } catch (error: any) {
        attempts.push({
            provider: providerName,
            success: false,
            error: error.message || "Unknown error",
        });
        return null;
    }
}

async function tryProviderSimplified(
    provider: AIProvider,
    diff: string,
    attempts: FailoverAttempt[]
): Promise<string | null> {
    const providerName =
        provider === AIProvider.Gemini
            ? "Gemini (Simplified)"
            : "Editor Built-in AI (Simplified)";

    try {
        // Create a much simpler prompt
        const simplifiedDiff = diff.split("\n").slice(0, 50).join("\n"); // Limit diff size

        let message: string | null = null;

        if (provider === AIProvider.Gemini) {
            message = await generateGeminiMessage(simplifiedDiff);
        } else {
            message = await generateWithCopilot(simplifiedDiff);
        }

        if (message && validateCommitMessage(message)) {
            attempts.push({
                provider: providerName,
                success: true,
                message: message.substring(0, 100),
            });
            return message;
        }

        attempts.push({
            provider: providerName,
            success: false,
            error: "Invalid message format",
        });
        return null;
    } catch (error: any) {
        attempts.push({
            provider: providerName,
            success: false,
            error: error.message || "Unknown error",
        });
        return null;
    }
}

/**
 * Validates commit message follows conventional commit format
 * Format: type(scope): description
 * - type: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert
 * - scope: optional, alphanumeric with dashes/underscores
 * - description: at least 10 characters
 */
function validateCommitMessage(message: string): boolean {
    if (!message || message.trim().length === 0) {
        return false;
    }

    // Improved regex for conventional commits
    const conventionalCommitRegex =
        /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([a-z0-9_-]+\))?: .{10,}/i;

    return conventionalCommitRegex.test(message.trim());
}

function logSuccess(
    provider: AIProvider,
    attempts: FailoverAttempt[],
    startTime: number
) {
    const duration = Date.now() - startTime;
    const providerName =
        provider === AIProvider.Gemini ? "Gemini" : "Editor Built-in AI";

    console.log(`✓ Commit message generated successfully`, {
        provider: providerName,
        attempts: attempts.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
    });
}

function logAllFailures(attempts: FailoverAttempt[], startTime: number) {
    const duration = Date.now() - startTime;

    console.error(`✗ All AI providers failed to generate commit message`, {
        totalAttempts: attempts.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        attempts: attempts.map((a) => ({
            provider: a.provider,
            success: a.success,
            error: a.error,
        })),
    });
}

function showFailureDetails(attempts: FailoverAttempt[]) {
    const details = attempts
        .map((attempt, index) => {
            return (
                `Attempt ${index + 1}: ${attempt.provider}\n` +
                `  Status: ${attempt.success ? "✓ Success" : "✗ Failed"}\n` +
                `  ${
                    attempt.error
                        ? `Error: ${attempt.error}`
                        : `Message: ${attempt.message}`
                }`
            );
        })
        .join("\n\n");

    vscode.window.showInformationMessage(`AI Failover Details:\n\n${details}`, {
        modal: true,
    });
}
