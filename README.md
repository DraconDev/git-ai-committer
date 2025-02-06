<div align="center">

# Git AI Auto Committer

### AI-powered automatic commit message generation and committing

</div>

Git AI Auto Committer is a VS Code extension that automatically generates meaningful commit messages using either Google's Gemini AI or GitHub Copilot. It helps developers maintain a clean and descriptive git history without the hassle of writing commit messages manually.

> Developed by [DraconDev](https://github.com/DraconDev)

## Features

- Automatically generates commit messages based on your code changes
- Multiple AI providers:
  - Google's Gemini AI for intelligent message generation
  - GitHub Copilot integration for commit messages
- Smart source control integration:
  - Uses existing message from the source control input box if available
  - Falls back to AI generation if no message is provided
- Configurable auto-commit intervals
- Manual commit generation option
- Inactivity-based commit triggers
- Version bumping with patch/minor increments
- Enable/disable version bumping functionality

## Requirements

- VS Code 1.96.0 or higher
- Node.js 20.x or higher
- A Google Gemini API key (get it from [Google AI Studio](https://aistudio.google.com/apikey)) if using Gemini
- GitHub Copilot extension installed and authenticated if using Copilot
- Git repository with initialized git config

## Extension Settings

This extension contributes the following settings:

- `gitAiCommitter.enabled`: Enable/disable automatic commits (default: true)
- `gitAiCommitter.preferredAIProvider`: Choose between "gemini" or "copilot" for commit message generation (default: "gemini")
- `gitAiCommitter.geminiApiKey`: Your Google Gemini API key for generating commit messages
- `gitAiCommitter.commitInterval`: Interval in minutes between automatic commits (0 to disable, default: 2)
- `gitAiCommitter.inactivityTimeout`: Trigger commit after this many seconds of inactivity (0 to disable, default: 5)
- `gitAiCommitter.minCommitDelay`: Minimum delay in seconds between commits (default: 10)

## How to Use

1. Install the extension
2. Choose your preferred AI provider in settings:

## Commands

Available commands can be accessed through the Command Palette (Ctrl+Shift+P):

- `AI Auto Committer Enable Auto Commit`: Enables automatic commit generation
- `AI Auto Committer Disable Auto Commit`: Disables automatic commit generation
- `AI Auto Committer Commit Now`: Manually triggers commit message generation and commits changes (uses --allow-empty flag to ensure commit even with no changes)
- `AI Auto Committer Set Gemini API Key`: Set your Gemini API key
- `AI Auto Committer Set Commit Interval`: Configure automatic commit interval
- `AI Auto Committer Set Inactivity Delay`: Configure inactivity delay before commit
- `AI Auto Committer Enable Version Bumping`: Enables automatic version bumping on commits
- `AI Auto Committer Disable Version Bumping`: Disables automatic version bumping on commits

!!!
