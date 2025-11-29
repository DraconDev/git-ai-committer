<div align="center">

# Git AI Auto Committer

### AI-powered automatic commit message generation with smart filtering

</div>

Git AI Auto Committer is a VS Code extension that automatically commits your code changes with intelligent, AI-generated messages. It monitors your coding activity and commits your work when you naturally pause, ensuring your progress is saved without interrupting your flow.

> Developed by [DraconDev](https://github.com/DraconDev)

## ✨ Features

- **Automatic Code Commits**: Detects when you stop coding and automatically commits your changes
- **AI-Generated Messages**: Creates meaningful, professional commit messages using AI
- **Version Control Integration**: Automatically updates version numbers and manages .gitignore files
- **Smart File Management**: Ignores temporary files, logs, and build artifacts automatically
- **Zero Configuration**: Works out of the box with sensible defaults
- **Manual Control**: Override automatic commits with instant manual commits when needed

## 📦 Requirements

- VS Code 1.96.0 or higher
- Node.js 20.x or higher
- **For Gemini AI**: Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **For Editor Built-in AI**: GitHub Copilot extension installed and authenticated
- Git repository with proper configuration

## ⚙️ Extension Settings

This extension contributes these settings (configure in VS Code settings):

**Core Settings:**

- `gitAiCommitter.preferredAIProvider`: Choose `"gemini"` or `"copilot"` (default: `"gemini"`)
- `gitAiCommitter.geminiApiKey`: Your Google Gemini API key

**Timing & Behavior:**

- `gitAiCommitter.inactivityDelay`: Seconds to wait after stopping typing before checking for commits (default: 5)
- `gitAiCommitter.minCommitDelay`: Minimum time between commits (default: 15 seconds)

**Smart Filtering:**

- `gitAiCommitter.ignoredFilePatterns`: Array of file patterns to skip during commits (default: `["*.tmp", "*.temp", "*.log", "*.cache", "*.dll", "*.exe", "*.env"]`)

## 🚀 How It Works

### How It Works

**Smart Activity Monitoring:**

- Monitors your typing patterns and editor activity
- Detects when you naturally pause your coding work
- Waits for a configurable delay to ensure you're actually finished

**Intelligent Commit Process:**

1. **Snapshot Changes**: Captures the exact files you've modified
2. **AI Message Generation**: Creates meaningful commit messages from your changes
3. **Version Management**: Automatically bumps version numbers when needed
4. **Clean Commits**: Ensures commit messages accurately reflect your actual code changes

**Example Workflow:**

```
You code for 10 minutes → make changes to multiple files
You stop typing → system waits 5 seconds
If it's been 15+ seconds since last commit → commits your work
Result: Professional commit message describing exactly what you implemented
```

### Smart File Management

**Automatic .gitignore Management:**

- Automatically adds common ignore patterns to your `.gitignore` file
- Keeps your repository clean by ignoring temp files, logs, and build artifacts
- Customizable ignore patterns through extension settings

**What Gets Ignored:**

- Temporary and cache files (`.tmp`, `.temp`, `.cache`)
- Log files and debug outputs
- Build artifacts and compiled files
- Sensitive configuration files

## 🛠️ Commands

Access via Command Palette (Ctrl+Shift+P):

- **`Git AI Committer: Commit Now`** - Force an immediate manual commit
- **`Git AI Committer: Open Settings`** - Open comprehensive settings panel

### Settings Panel

The settings panel provides a beautiful, intuitive interface to configure all extension options:

- `Git AI Committer: Set AI Provider` - Switch between Gemini and Editor Built-in AI, manage API keys
- **Auto-Commit Timing** - Adjust inactivity delay and minimum commit intervals with sliders
- **Version Bumping** - Toggle automatic version bumping on/off
- **Ignored File Patterns** - Manage file patterns to exclude from auto-commits
- **Real-time Validation** - Get instant feedback on your settings
- **Theme Integration** - Automatically matches VS Code's light/dark theme

## 💡 Usage Tips

1. **Quick Setup**: Open the Settings panel and configure your AI provider
2. **Fine-Tune Timing**: Use the sliders to adjust delays based on your workflow
3. **Configure Filtering**: Add your project's specific file patterns in the settings panel
4. **Manual When Needed**: Use "Commit Now" for immediate commits
5. **Auto-Enabled**: Auto-commit is enabled by default when you install the extension

### Recommended Settings

**For Active Development:**

- Inactivity Delay: 3-5 seconds
- Min Commit Delay: 10-15 seconds

**For Thinking-Heavy Work:**

- Inactivity Delay: 10-15 seconds
- Min Commit Delay: 20-30 seconds

## 🧠 AI Providers

### Google Gemini (Recommended)

- **Cost**: Free for our use case (API key required, generous free tier)
- **Quality**: Excellent commit message generation
- **Setup**: Get free API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **Reliability**: Consistent performance with good error handling

### Editor Built-in AI (GitHub Copilot)

- **Cost**: Included with Copilot subscription
- **Quality**: Good commit messages, uses existing code context
- **Setup**: Requires Copilot extension and authentication
- **Integration**: Seamlessly works with VS Code

## 🔧 Troubleshooting

**No Commits Happening:**

- Check that you have actual code changes (not just config files)
- Verify your AI provider is configured correctly
- Ensure the minimum commit delay hasn't just reset

**Too Many/Few Commits:**

- Adjust `inactivityDelay` for responsiveness vs. interruptions
- Adjust `minCommitDelay` for commit frequency
- Add more patterns to `ignoredFilePatterns` if needed

**AI Generation Issues:**

- For Gemini: Verify your API key is valid and has quota
- For Copilot: Ensure you're authenticated and have an active subscription
- The system includes automatic retry with backoff for transient failures

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.

## 🆘 Support

For issues, questions, or feature requests, please [create an issue](https://github.com/DraconDev/git-ai-committer/issues) on GitHub.
