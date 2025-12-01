import * as vscode from "vscode";

export enum AIProvider {
  Copilot = "copilot",
  Gemini = "gemini",
  OpenRouter = "openRouter",
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export interface ProviderConfig {
  provider: AIProvider;
  model?: string;
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

export async function getProviderConfigs(): Promise<ProviderConfig[]> {
  const config = vscode.workspace.getConfiguration("gitAiCommitter");

  // Get primary provider with model
  const primaryProvider = config.get<string>("preferredAIProvider", "");
  const primaryModel = config.get<string>("primaryProviderModel", "");

  // Get backup providers with models
  const backup1 = config.get<string>("backupProvider1", "none");
  const backup1Model = config.get<string>("backupProvider1Model", "");
  const backup2 = config.get<string>("backupProvider2", "none");
  const backup2Model = config.get<string>("backupProvider2Model", "");

  const configs: ProviderConfig[] = [];

  // Helper to convert string to AIProvider enum
  const getProviderEnum = (val: string): AIProvider | null => {
    if (val === "none") {
      return null;
    }
    return Object.values(AIProvider).find((p) => p === val) || null;
  };

  // Add primary provider
  if (primaryProvider) {
    const primaryProviderEnum = getProviderEnum(primaryProvider);
    if (primaryProviderEnum) {
      configs.push({
        provider: primaryProviderEnum,
        model: primaryModel || undefined,
      });
    }
  }

  // Add backup providers
  if (backup1 !== "none") {
    const backup1Provider = getProviderEnum(backup1);
    if (
      backup1Provider &&
      !configs.find((c) => c.provider === backup1Provider)
    ) {
      configs.push({
        provider: backup1Provider,
        model: backup1Model || undefined,
      });
    }
  }

  if (backup2 !== "none") {
    const backup2Provider = getProviderEnum(backup2);
    if (
      backup2Provider &&
      !configs.find((c) => c.provider === backup2Provider)
    ) {
      configs.push({
        provider: backup2Provider,
        model: backup2Model || undefined,
      });
    }
  }

  return configs;
}

export function getDefaultModelForProvider(provider: AIProvider): string {
  return ""; // Model selection is handled by user configuration
}
