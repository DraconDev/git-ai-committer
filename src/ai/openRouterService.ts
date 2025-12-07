import * as vscode from "vscode";

export const DEFAULT_OPENROUTER_MODEL =
    "google/gemini-2.0-flash-lite-preview-02-05:free";

export function getOpenRouterApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("openRouterApiKey");
}

export function getOpenRouterModel(): string {
    return (
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<string>("openRouterModel") || DEFAULT_OPENROUTER_MODEL
    );
}

export async function generateOpenRouterMessage(
    diff: string,
    modelOverride?: string
): Promise<string | null> {
    try {
        const apiKey = getOpenRouterApiKey();
        if (!apiKey) {
            // Don't show error - let failover handle it
            return null;
        }

        const model = modelOverride || getOpenRouterModel();

        // Validate diff content
        if (!diff || diff.trim() === "") {
            throw new Error("No changes to commit");
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Focus on the code changes. Do not mention version bumps or lockfile updates unless they are the ONLY changes. If you must mention them, put them at the very end. Here's the diff:\n\n${diff}`;

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer":
                        "https://github.com/dracon/git-ai-committer", // Required by OpenRouter
                    "X-Title": "Git AI Committer", // Optional
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const data = (await response.json()) as any;

        if (
            !data.choices ||
            !data.choices[0] ||
            !data.choices[0].message ||
            !data.choices[0].message.content
        ) {
            throw new Error("Invalid response format from OpenRouter API");
        }

        const message = data.choices[0].message.content.trim();

        // Clean up the message - remove quotes and newlines
        return message.replace(/["'\n\r]+/g, " ").trim();
    } catch (error: any) {
        console.error(
            "Error generating commit message with OpenRouter:",
            error
        );
        // Don't show error message here to allow failover to handle it silently if needed
        // But we might want to log it or show it if it's the primary provider?
        // For now, let failover handle user feedback
        return null;
    }
}
