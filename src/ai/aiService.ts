import * as vscode from "vscode";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
  OpenRouter = "openRouter",
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export async function getPreferredAIProvider(): Promise<AIProvider | null> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  const provider = config.get<string>("preferredAIProvider", "");

  if (!provider) {
    return null;
  }

  const providerEnum = Object.values(AIProvider).find((p) => p === provider);
  return providerEnum || null;
}
