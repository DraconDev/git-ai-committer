import * as vscode from "vscode";
import { AIProvider } from "./aiService";
import { generateAnthropicMessage } from "./anthropicService";
import { generateWithCopilot } from "./copilotService";
import { generateGeminiMessage } from "./geminiService";
import { generateOpenRouterMessage } from "./openRouterService";
import { generateOpenAIMessage } from "./openaiService";

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

    // Get backup providers from config
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    const backup1 = config.get<string>("backupProvider1", "openRouter");
    const backup2 = config.get<string>("backupProvider2", "copilot");

    // Helper to convert string to AIProvider enum
    const getProviderEnum = (val: string): AIProvider | null => {
        if (val === "none") return null;
        return Object.values(AIProvider).find((p) => p === val) || null;
    };

    const backupProvider1 = getProviderEnum(backup1);
    const backupProvider2 = getProviderEnum(backup2);

    // Build unique provider order
    const order = [primaryProvider];
    if (backupProvider1 && !order.includes(backupProvider1)) {
        order.push(backupProvider1);
    }
    if (backupProvider2 && !order.includes(backupProvider2)) {
        order.push(backupProvider2);
    }

    providerOrder = order;

    // Attempt 1-3: Try each provider in order
    for (const provider of providerOrder) {
        const message = await tryProvider(provider, diff, attempts);
        if (message) {
            logSuccess(provider, attempts, startTime);
            if (provider !== primaryProvider) {
                vscode.window.showInformationMessage(
                    `Primary AI failed, switched to ${getProviderName(
                        provider
                    )}`
                );
            }
            return message;
        }
    }

    // Attempt 4: Primary again with simplified prompt (last resort)
    vscode.window.showInformationMessage(
        `All providers failed, trying simplified prompt with primary AI...`
    );

    const message = await tryProviderSimplified(
        primaryProvider,
        diff,
        attempts
    );
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

function getProviderName(provider: AIProvider): string {
    switch (provider) {
        case AIProvider.Gemini:
            return "Gemini";
        case AIProvider.OpenRouter:
            return "OpenRouter";
        case AIProvider.OpenAI:
            return "OpenAI";
        case AIProvider.Anthropic:
            return "Anthropic";
        case AIProvider.Copilot:
            return "Editor Built-in AI";
        default:
            return "Unknown Provider";
    }
}

async function tryProvider(
    provider: AIProvider,
    diff: string,
    attempts: FailoverAttempt[]
): Promise<string | null> {
    const providerName = getProviderName(provider);

    try {
        let message: string | null = null;

        if (provider === AIProvider.Gemini) {
            message = await generateGeminiMessage(diff);
        } else if (provider === AIProvider.OpenRouter) {
            message = await generateOpenRouterMessage(diff);
        } else if (provider === AIProvider.OpenAI) {
            message = await generateOpenAIMessage(diff);
        } else if (provider === AIProvider.Anthropic) {
            message = await generateAnthropicMessage(diff);
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
            error: "Invalid message format or empty response",
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
    const providerName = `${getProviderName(provider)} (Simplified)`;

    try {
        // Create a much simpler prompt
        const simplifiedDiff = diff.split("\n").slice(0, 50).join("\n"); // Limit diff size

        let message: string | null = null;

        if (provider === AIProvider.Gemini) {
            message = await generateGeminiMessage(simplifiedDiff);
        } else if (provider === AIProvider.OpenRouter) {
            message = await generateOpenRouterMessage(simplifiedDiff);
        } else if (provider === AIProvider.OpenAI) {
            message = await generateOpenAIMessage(simplifiedDiff);
        } else if (provider === AIProvider.Anthropic) {
            message = await generateAnthropicMessage(simplifiedDiff);
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
    const providerName = getProviderName(provider);

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
