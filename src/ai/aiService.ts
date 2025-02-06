import * as vscode from "vscode";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
}

export async function getPreferredAIProvider(): Promise<AIProvider> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");
  return config.get<AIProvider>("preferredAIProvider", AIProvider.Gemini);
}
