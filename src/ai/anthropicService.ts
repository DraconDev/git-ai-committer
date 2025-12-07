import * as vscode from "vscode";

export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";

export function getAnthropicApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("anthropicApiKey");
}

export function getAnthropicModel(): string {
    return (
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<string>("anthropicModel") || DEFAULT_ANTHROPIC_MODEL
    );
}

export async function generateAnthropicMessage(
    diff: string,
    modelOverride?: string
): Promise<string | null> {
    try {
        const apiKey = getAnthropicApiKey();
        if (!apiKey) {
            // Don't show error - let failover handle it
            return null;
        }

        const model = modelOverride || getAnthropicModel();

        if (!diff || diff.trim() === "") {
            throw new Error("No changes to commit");
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Focus on the code changes. Do not mention version bumps or lockfile updates unless they are the ONLY changes. If you must mention them, put them at the very end. Here's the diff:\n\n${diff}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const data = (await response.json()) as any;

        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error("Invalid response format from Anthropic API");
        }

        const message = data.content[0].text.trim();
        // Clean up the message - remove quotes and newlines
        return message.replace(/["'\n\r]+/g, " ").trim();
    } catch (error: any) {
        console.error("Error generating commit message with Anthropic:", error);
        return null;
    }
}
