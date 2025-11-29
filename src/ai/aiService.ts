import * as vscode from "vscode";

export enum AIProvider {
    Copilot = "copilot",
    Gemini = "gemini",
    OpenRouter = "openRouter",
    OpenAI = "openai",
    Anthropic = "anthropic",
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
    const config = vscode.workspace.getConfiguration("gitAiCommitter");
    return config.get<AIProvider>("preferredAIProvider", AIProvider.Copilot);
}
