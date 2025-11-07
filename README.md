<div align="center">

# Git AI Auto Committer

### AI-powered automatic commit message generation with smart filtering

</div>

Git AI Auto Committer is a VS Code extension that automatically generates meaningful commit messages and commits your changes. It works intelligently by monitoring your activity and committing when you naturally stop working, with advanced filtering to prevent noise commits.

> Developed by [DraconDev](https://github.com/DraconDev)

## ✨ Features

- **Smart Activity-Based Commits**: Monitors your coding activity and commits when you naturally stop working
- **AI-Powered Messages**: Uses Google's Gemini AI or GitHub Copilot for intelligent commit messages
- **Smart File Filtering**: Automatically ignores temp files, logs, build artifacts, and sensitive files
- **Intelligent Version Bumper**: Only commits when there are real code changes, not just version bumps
- **Anti-Spam System**: Dual delay system prevents rapid commits and API spam
- **Manual Override**: Always available for when you need immediate commits

## 📦 Requirements

- VS Code 1.96.0 or higher
- Node.js 20.x or higher
- **For Gemini AI**: Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **For Copilot**: GitHub Copilot extension installed and authenticated
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

### The Dual-Delay System

Unlike simple auto-committers, this uses a sophisticated dual-delay system:

1. **Inactivity Detection**: After you stop typing for the configured delay (5s default), the system checks if you should commit
2. **Minimum Commit Delay**: Only commits if the minimum delay (15s default) has passed since your last commit
3. **Real Change Detection**: Only commits when there are actual code changes (not just config or version files)

### Example Workflow

```
Type some code → stop for 5s → system checks: only 5s since last work → NO COMMIT
Continue typing → stop for 10s → system checks: 15s+ since last commit → COMMIT!
```

### Smart File Filtering

Automatically prevents commits containing:
- **Temp files**: `.tmp`, `.temp`, editor swap files
- **Log files**: `.log`, debug outputs
- **Build artifacts**: `.dll`, `.exe`, `.o` files
- **Cache files**: `.cache`, build cache
- **Sensitive files**: `.env`, `.secrets` (while allowing `.env.example`)

## 🛠️ Commands

Access via Command Palette (Ctrl+Shift+P):

**Core Functions:**
- `Git AI Committer: Enable Auto Commit` - Start automatic commits
- `Git AI Committer: Disable Auto Commit` - Stop automatic commits
- `Git AI Committer: Commit Now` - Force immediate commit

**AI Configuration:**
- `Git AI Committer: Set Gemini API Key` - Configure your API key
- `Git AI Committer: Set AI Provider` - Switch between Gemini and Copilot

**Timing & Behavior:**
- `Git AI Committer: Set Inactivity Delay` - Configure when to check for commits (5s default)
- `Git AI Committer: Set Min Time Between Commits` - Configure minimum time between commits (15s default)

**Smart Features:**
- `Git AI Committer: Manage Ignored Files` - Open settings to configure file filtering
- `Git AI Committer: Enable/Disable Version Bumping` - Control automatic version updates

## 💡 Usage Tips

1. **Start Simple**: Enable auto-commit and let it work with defaults
2. **Fine-Tune Timing**: Adjust delays based on your workflow
3. **Configure Filtering**: Add your project's specific file patterns to ignore
4. **Manual When Needed**: Use "Commit Now" for immediate commits

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

### GitHub Copilot
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
