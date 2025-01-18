<div align="center">

# Git AI Committer

### AI-powered automatic commit message generation and committing

</div>

[![Version](https://img.shields.io/badge/version-0.1.6-blue.svg)](https://github.com/DraconDev/git-ai-committer)

Git AI Committer is a VS Code extension that automatically generates meaningful commit messages using Google's Gemini AI. It helps developers maintain a clean and descriptive git history without the hassle of writing commit messages manually.

> Developed by [DraconDev](https://github.com/DraconDev)

## Features

-   Automatically generates commit messages based on your code changes
-   Uses Google's Gemini AI for intelligent message generation
-   Configurable auto-commit intervals
-   Manual commit generation option
-   Inactivity-based commit triggers

## Requirements

-   VS Code 1.96.0 or higher
-   Node.js 20.x or higher
-   A Google Gemini API key (get it from [Google AI Studio](https://aistudio.google.com/apikey))
-   Git repository with initialized git config

## Extension Settings

This extension contributes the following settings:

-   `gitAiCommitter.enabled`: Enable/disable automatic commits (default: true)
-   `gitAiCommitter.geminiApiKey`: Your Google Gemini API key for generating commit messages
-   `gitAiCommitter.commitInterval`: Interval in minutes between automatic commits (0 to disable, default: 2)
-   `gitAiCommitter.inactivityTimeout`: Trigger commit after this many seconds of inactivity (0 to disable, default: 5)
-   `gitAiCommitter.minCommitDelay`: Minimum delay in seconds between commits (default: 10)

## How to Use

1. Install the extension
2. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Set your API key in VS Code settings
4. Enable auto-commit using the command palette or settings
5. Start coding! The extension will:
    - Commit changes after 5 seconds of inactivity
    - Ensure at least 10 seconds between commits
    - Commit every 2 minutes during active work
    - Automatically generate meaningful commit messages

## Commands

Available commands can be accessed through the Command Palette (Ctrl+Shift+P):

-   `AI Auto Committer Enable Auto Commit`: Enables automatic commit generation
-   `AI Auto Committer Disable Auto Commit`: Disables automatic commit generation
-   `AI Auto Committer Commit Now`: Manually triggers commit message generation and commits changes (uses --allow-empty flag to ensure commit even with no changes)
-   `AI Auto Committer Set Gemini API Key`: Set your Gemini API key
-   `AI Auto Committer Set Commit Interval`: Configure automatic commit interval
-   `AI Auto Committer Set Inactivity Delay`: Configure inactivity delay before commit
