<div align="center">

# Git AI Auto Committer

### AI-powered automatic commit message generation with smart filtering

</div>

Git AI Auto Committer is a VS Code extension that automatically commits your code changes with intelligent, AI-generated messages. It monitors your coding activity and commits your work when you naturally pause, ensuring your progress is saved without interrupting your flow.

> Developed by [DraconDev](https://github.com/DraconDev)

## ✨ Features

- **Automatic Code Commits**: Detects when you stop coding and automatically commits your changes
- **Multi-Provider AI**: Choose from Gemini, OpenRouter, OpenAI, Anthropic, or Editor Built-in AI
- **Smart Failover System**: Automatically tries backup providers if your primary AI fails
- **AI-Generated Messages**: Creates meaningful, professional commit messages using AI
- **Custom Model Selection**: Specify exact models per provider (e.g., gemini-flash-lite-latest, gpt-4o)
- **Version Control Integration**: Automatically updates version numbers across 10+ file types
- **Smart File Management**: Ignores temporary files, logs, and build artifacts automatically
- **Visual Settings Panel**: Beautiful, theme-aware configuration interface with real-time validation
- **Manual Control**: Override automatic commits with instant manual commits when needed
- **Advanced Timing Controls**: Fine-tune inactivity detection and minimum commit intervals
- **Multi-Language Version Bumping**: Works with Node.js, Python, Java, Rust, PHP, and more
- **Zero Configuration Required**: Works out of the box with sensible defaults, no JSON editing needed

## 📦 Requirements

- VS Code 1.96.0 or higher
- Node.js 20.x or higher
- **For Gemini AI**: Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **For Editor Built-in AI**: GitHub Copilot extension installed and authenticated
- **For OpenRouter**: API key from [OpenRouter](https://openrouter.ai/keys)
- **For OpenAI**: API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **For Anthropic**: API key from [Anthropic Console](https://console.anthropic.com/settings/keys)
- Git repository with proper configuration

## ⚙️ Configuration & Usage

The extension is designed to be configured entirely through its custom Settings Panel. You do not need to edit JSON files manually.

### Primary Commands

Access these via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1.  **`Git AI Committer: Open Settings`**

    - Opens the visual configuration dashboard.
    - **Use this to configure:**
      - **AI Provider**: Select between Gemini, OpenRouter, OpenAI, Anthropic, or Editor Built-in AI.
      - **API Keys**: Securely enter your API keys for the selected provider.
      - **Failover**: Configure backup providers (e.g., if Gemini fails, try OpenAI).
      - **Timing**: Adjust how long to wait after typing before committing.
      - **Ignored Files**: Manage patterns for files that should be skipped.

2.  **`Git AI Committer: Commit Now`**
    - Forces an immediate check and commit of your current changes.
    - Useful if you want to trigger a commit without waiting for the auto-timer.

### Settings Panel Features

The settings panel provides a beautiful, intuitive interface to configure all extension options:

- **Multi-Provider AI Setup**: Configure primary AI provider with up to 2 backup providers for automatic failover
- **Custom Model Selection**: Specify exact models per provider (gemini-flash-lite-latest, gpt-4o, claude-3-5-sonnet-20240620, etc.)
- **API Key Management**: Securely store and manage API keys for all supported providers
- **Real-time Validation**: Get instant feedback on your settings and API key status
- **Advanced Timing Controls**: Adjust inactivity delay and minimum commit intervals with visual sliders
- **Smart File Filtering**: Add custom ignore patterns with live preview
- **Version Bumping**: Toggle automatic version bumping on/off across multiple languages
- **Theme Integration**: Automatically matches VS Code's light/dark theme
- **Accordion Interface**: Expandable sections for each AI provider with detailed configuration

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

## 🛡️ Smart Failover System

The extension includes an intelligent failover system that ensures your commits never fail due to AI provider issues:

**How Failover Works:**

1. **Primary Provider First**: Tries your selected primary AI provider
2. **Automatic Backups**: If primary fails, automatically tries your configured backup providers
3. **Smart Retry Logic**: Includes automatic retry with exponential backoff for transient failures
4. **Simplified Prompts**: As a last resort, uses simplified prompts to increase success rates
5. **Transparent Notifications**: Informs you which provider was used with helpful status messages

**Example Failover Chain:**

```
Primary: Gemini → Backup 1: OpenRouter → Backup 2: OpenAI → Simplified Retry
```

**Configuration Options:**

- **Backup Provider 1**: First fallback if primary fails
- **Backup Provider 2**: Second fallback if both primary and first backup fail
- **Custom Models**: Specify different models for each provider level
- **Provider Selection**: Choose from Gemini, OpenRouter, OpenAI, Anthropic, or Editor Built-in AI

This ensures maximum reliability - your commits are generated even if individual AI services are down or experiencing issues.

## 🧠 AI Providers

### Google Gemini (Recommended)

- **Cost**: Free for our use case (API key required, generous free tier)
- **Quality**: Excellent commit message generation
- **Setup**: Get free API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **Reliability**: Consistent performance with good error handling

### OpenRouter

- **Cost**: Varies by model (many free options available)
- **Quality**: Access to top models like Claude 3, GPT-4, Llama 3, etc.
- **Setup**: Get API key from [OpenRouter](https://openrouter.ai/keys)
- **Flexibility**: Choose any model supported by OpenRouter

### OpenAI

- **Cost**: Paid (per token)
- **Quality**: Industry leading models (GPT-4o)
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### Anthropic

- **Cost**: Paid (per token)
- **Quality**: High reasoning capabilities (Claude 3.5 Sonnet)
- **Setup**: Get API key from [Anthropic Console](https://console.anthropic.com/settings/keys)

### Editor Built-in AI (GitHub Copilot)

- **Cost**: Included with Copilot subscription
- **Quality**: Good commit messages, uses existing code context
- **Setup**: Requires Copilot extension and authentication
- **Integration**: Seamlessly works with VS Code

## 🔢 Multi-Language Version Bumping

The extension **automatically detects and updates version numbers across multiple languages and ecosystems**. It's not limited to just `package.json`!

### Supported Version Files

**Node.js/JavaScript:**

- `package.json` - Main package manifest
- `package-lock.json` - npm lock file
- `pnpm-lock.yaml` - pnpm lock file
- `yarn.lock` - Yarn lock file
- `wxt.config.ts` / `wxt.config.js` - WXT configuration

**Python:**

- `pyproject.toml` - Modern Python projects
- `setup.py` - Traditional Python setup

**Java:**

- `build.gradle` - Gradle projects
- `pom.xml` - Maven projects

**Other Languages:**

- `Cargo.toml` - Rust projects
- `composer.json` - PHP projects
- `project.clj` - Clojure projects
- `*.csproj` - .NET projects

**Generic:**

- `version.txt` - Plain text version files
- `VERSION` - Standard version file

### How It Works

1. **Auto-Detection**: The extension scans your workspace for supported version files
2. **Multi-File Update**: When enabled, all detected version files are updated simultaneously
3. **Semver Compliant**: Follows semantic versioning (MAJOR.MINOR.PATCH)
4. **Smart Parsing**: Each file type is parsed and updated according to its format (JSON, TOML, XML, etc.)

**Example**: In a monorepo with Python and Node.js projects, version bumping will update both `package.json` and `pyproject.toml` at the same time!

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

This project is licensed under the MIT License - see [LICENSE.md](https://github.com/DraconDev/git-ai-committer/blob/HEAD/LICENSE.md) for details.

## 🆘 Support

For issues, questions, or feature requests, please [create an issue](https://github.com/DraconDev/git-ai-committer/issues) on GitHub.
