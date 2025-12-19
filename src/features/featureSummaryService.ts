import * as vscode from "vscode";
import { generateCommitMessageWithFailover } from "../ai/aiFailover";
import { getPreferredAIProvider } from "../ai/aiService";
import {
    commitChanges,
    getCommitHistory,
    type CommitInfo,
} from "../git/gitOperations";

export interface FeatureSummary {
    type: string;
    scope?: string;
    subject: string;
    body: string;
    breaking: boolean;
    breakingDescription?: string;
    versionBump: "major" | "minor" | "patch" | "none";
    commitRange: string;
    includeFiles: boolean;
    fileList?: string[];
}

export async function analyzeCommitsForFeature(
    commitCount: number
): Promise<FeatureSummary | null> {
    try {
        // Fetch commit history
        const commits = await getCommitHistory(commitCount);

        if (commits.length === 0) {
            vscode.window.showWarningMessage("No commits found to analyze");
            return null;
        }

        // Build AI prompt
        const prompt = buildAnalysisPrompt(commits);

        // Get AI analysis - use primary provider from config
        const primaryProvider = await getPreferredAIProvider();

        let aiResponse: string | null = null;

        // Try to get AI response using failover
        const result = await generateCommitMessageWithFailover(
            prompt,
            primaryProvider
        );
        aiResponse = result.message;

        if (!aiResponse) {
            vscode.window.showErrorMessage(
                "Failed to generate feature summary"
            );
            return null;
        }

        // Parse AI response
        const summary = parseAIResponse(aiResponse, commits);

        return summary;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Feature analysis failed: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return null;
    }
}

function buildAnalysisPrompt(commits: CommitInfo[]): string {
    const commitDetails = commits
        .map((c) => {
            const shortHash = c.hash.substring(0, 7);
            const fileCount = c.files.length;
            const filePreview = c.files.slice(0, 5).join(", ");
            const filesText =
                fileCount > 5
                    ? `${filePreview}... (+${fileCount - 5} more)`
                    : filePreview;

            return `${shortHash} - ${c.message}\n  Files (${fileCount}): ${filesText}`;
        })
        .join("\n\n");

    const oldestHash = commits[commits.length - 1].hash.substring(0, 7);
    const newestHash = commits[0].hash.substring(0, 7);

    return `You are analyzing ${commits.length} git commits to create a comprehensive feature summary commit message.

COMMITS (newest first):
${commitDetails}

YOUR TASK:
1. Identify what major feature or work was accomplished across these commits
2. Create a conventional commit message (type: subject)
3. Write a detailed body explaining what was built/changed
4. Determine if this is a breaking change
5. Suggest appropriate version bump (major/minor/patch/none)

IMPORTANT RULES:
- Focus on the OVERALL FEATURE, not implementation details
- Use conventional commit types: feat, fix, docs, style, refactor, perf, test, chore
- Subject line should be concise (50 chars max)
- Body should be comprehensive but clear
- Only mark as breaking if it truly breaks backward compatibility
- Suggest "minor" for new features, "patch" for bug fixes, "major" for breaking changes

Return ONLY a JSON object (no markdown, no code blocks):
{
  "type": "feat",
  "scope": "optional-scope",
  "subject": "Brief summary of feature",
  "body": "Detailed multi-line description of what was accomplished.\\n\\nExplain the feature completely.",
  "breaking": false,
  "breakingDescription": "Only if breaking is true",
  "versionBump": "minor",
  "commitRange": "${oldestHash}..${newestHash}"
}`;
}

function parseAIResponse(
    aiResponse: string,
    commits: CommitInfo[]
): FeatureSummary {
    try {
        // Clean response - remove markdown code blocks if present
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }

        const parsed = JSON.parse(cleaned);

        // Collect all unique files from commits
        const allFiles = Array.from(
            new Set(commits.flatMap((c) => c.files))
        ).sort();

        return {
            type: parsed.type || "feat",
            scope: parsed.scope || undefined,
            subject: parsed.subject || "Feature summary",
            body: parsed.body || "Summary of recent work",
            breaking: parsed.breaking || false,
            breakingDescription: parsed.breakingDescription,
            versionBump: parsed.versionBump || "none",
            commitRange: parsed.commitRange || "",
            includeFiles: false, // Set by caller based on settings
            fileList: allFiles,
        };
    } catch (error) {
        // Fallback if parsing fails
        console.error("Failed to parse AI response:", error);
        console.error("AI Response was:", aiResponse);

        const oldestHash = commits[commits.length - 1].hash.substring(0, 7);
        const newestHash = commits[0].hash.substring(0, 7);

        return {
            type: "feat",
            subject: "Recent development work",
            body: aiResponse, // Use raw AI response as body
            breaking: false,
            versionBump: "none",
            commitRange: `${oldestHash}..${newestHash}`,
            includeFiles: false,
            fileList: [],
        };
    }
}

export function formatFeatureSummaryMessage(summary: FeatureSummary): string {
    let message = summary.type;
    if (summary.scope) {
        message += `(${summary.scope})`;
    }
    message += `: ${summary.subject}\n\n`;
    message += `${summary.body}\n\n`;
    message += `📊 Synthesizes commits: ${summary.commitRange}`;

    if (
        summary.includeFiles &&
        summary.fileList &&
        summary.fileList.length > 0
    ) {
        message += `\n\n📁 Files modified (${summary.fileList.length}):\n`;
        summary.fileList.forEach((file) => {
            message += `- ${file}\n`;
        });
    }

    if (summary.breaking && summary.breakingDescription) {
        message += `\n\nBREAKING CHANGE: ${summary.breakingDescription}`;
    }

    return message.trim();
}

export async function createFeatureSummaryCommit(
    summary: FeatureSummary
): Promise<boolean> {
    try {
        const message = formatFeatureSummaryMessage(summary);

        // Check if there are any staged changes, if so, commit them first
        const hasChanges = await checkForUnstagedChanges();
        if (hasChanges) {
            const response = await vscode.window.showWarningMessage(
                "You have unstaged changes. Create summary commit anyway?",
                "Yes",
                "No"
            );
            if (response !== "Yes") {
                return false;
            }
        }

        // Create empty commit (summary only, no file changes)
        const success = await commitChanges(message);

        if (success) {
            vscode.window.showInformationMessage(
                `✅ Feature summary commit created for ${summary.commitRange}`
            );
        }

        return success;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to create summary commit: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        return false;
    }
}

async function checkForUnstagedChanges(): Promise<boolean> {
    const { getGitStatus } = await import("../git/gitOperations.js");
    const status = await getGitStatus();
    return (
        status.modified.length > 0 ||
        status.not_added.length > 0 ||
        status.deleted.length > 0
    );
}
