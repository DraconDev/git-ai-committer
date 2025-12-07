import * as vscode from "vscode";

export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export function getOpenAIApiKey(): string | undefined {
    return vscode.workspace
        .getConfiguration("gitAiCommitter")
        .get<string>("openaiApiKey");
}

export function getOpenAIModel(): string {
    return (
        vscode.workspace
            .getConfiguration("gitAiCommitter")
            .get<string>("openaiModel") || DEFAULT_OPENAI_MODEL
    );
}

export async function generateOpenAIMessage(
    diff: string,
    modelOverride?: string
): Promise<string | null> {
    try {
        const apiKey = getOpenAIApiKey();
        if (!apiKey) {
            // Don't show error - let failover handle it
            return null;
        }

        const model = modelOverride || getOpenAIModel();

        if (!diff || diff.trim() === "") {
            throw new Error("No changes to commit");
        }

        const prompt = `Generate a concise commit message for the following git diff. Use conventional commit format (type(scope): description). Keep it short and descriptive. Focus on the code changes. Do not mention version bumps or lockfile updates unless they are the ONLY changes. If you must mention them, put them at the very end. Do not include any other text, explanation, or prefixes like 'commit:' or 'text:'. Output ONLY the commit message itself. Here's the diff:\n\n${diff}`;

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
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
                `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const data = (await response.json()) as any;

        if (
            !data.choices ||
            !data.choices[0] ||
            !data.choices[0].message ||
            !data.choices[0].message.content
        ) {
            throw new Error("Invalid response format from OpenAI API");
        }

        const message = data.choices[0].message.content.trim();
        // Clean up the message - remove quotes and newlines, and strip common hallucinations
        return message
            .replace(/["'\n\r]+/g, " ")
            .replace(/^(text|commit|git|output)\s*[:]?\s*/i, "")
            .trim();
    } catch (error: any) {
        console.error("Error generating commit message with OpenAI:", error);
        return null;
    }
}
