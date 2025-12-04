import * as vscode from "vscode";
import { AIProvider, getProviderConfigs, ProviderConfig } from "./aiService";
import { generateAnthropicMessage } from "./anthropicService";
import { generateWithCopilot } from "./copilotService";
import { generateGeminiMessage } from "./geminiService";
import { generateOpenRouterMessage } from "./openRouterService";
import { generateOpenAIMessage } from "./openaiService";

interface FailoverAttempt {
    provider: string;
    model?: string;
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Generates commit message with automatic AI provider failover
 * Only attempts failover if providers are explicitly configured
 */
export async function generateCommitMessageWithFailover(
    diff: string,
    primaryProvider: AIProvider | null
): Promise<string | null> {
    const attempts: FailoverAttempt[] = [];
    const startTime = Date.now();

    // If no primary provider is set, don't attempt AI generation
    if (!primaryProvider) {
        vscode.window.showErrorMessage(
            "No AI provider selected. Please configure an AI provider in settings to generate commit messages."
        );
        return null;
    }

    // Get all configured provider configs (with models)
    const providerConfigs = await getProviderConfigs();

    if (providerConfigs.length === 0) {
        vscode.window.showErrorMessage(
            "No AI provider selected. Please configure an AI provider in settings to generate commit messages."
        );
        return null;
    }

    // Use simplified diff (first 50 lines) for all attempts to improve reliability
    const simplifiedDiff = diff.split("\n").slice(0, 50).join("\n");

    // Attempt 1-3: Try each provider in order with their configured models
    for (const config of providerConfigs) {
        const message = await tryProvider(config, simplifiedDiff, attempts);
        if (message) {
            logSuccess(config.provider, attempts, startTime);
            if (config.provider !== primaryProvider) {
                vscode.window.showInformationMessage(
                    `Primary AI failed, switched to ${getProviderName(
                        config.provider
                    )}`
                );
            }
            return message;
        }
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
    config: ProviderConfig,
    diff: string,
    attempts: FailoverAttempt[]
): Promise<string | null> {
    const providerName = getProviderName(config.provider);
    const modelInfo = config.model ? ` (${config.model})` : "";

    try {
        let message: string | null = null;

        if (config.provider === AIProvider.Gemini) {
            message = await generateGeminiMessage(diff);
        } else if (config.provider === AIProvider.OpenRouter) {
            message = await generateOpenRouterMessage(diff, config.model);
        } else if (config.provider === AIProvider.OpenAI) {
            message = await generateOpenAIMessage(diff, config.model);
        } else if (config.provider === AIProvider.Anthropic) {
            message = await generateAnthropicMessage(diff, config.model);
        } else {
            message = await generateWithCopilot(diff);
        }

        if (message && message.trim().length > 0) {
            attempts.push({
                provider: providerName,
                model: config.model,
                success: true,
                message: message.substring(0, 100),
            });
            return message;
        }

        attempts.push({
            provider: providerName,
            model: config.model,
            success: false,
            error: "Empty response from AI",
        });
        return null;
    } catch (error: any) {
        attempts.push({
            provider: providerName,
            model: config.model,
            success: false,
            error: error.message || "Unknown error",
        });
        return null;
    }
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
            model: a.model,
            success: a.success,
            error: a.error,
        })),
    });
}

function showFailureDetails(attempts: FailoverAttempt[]) {
    const details = attempts
        .map((attempt, index) => {
            const modelInfo = attempt.model ? ` [${attempt.model}]` : "";
            return (
                `Attempt ${index + 1}: ${attempt.provider}${modelInfo}\n` +
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
