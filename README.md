# FlowSpec CLI

🚀 **AI-powered autonomous React test generation with intelligent file watching**

FlowSpec automatically generates, executes, and maintains comprehensive test suites for your React applications using GPT-4. Features intelligent file watching, incremental updates, and token optimization.

[![npm version](https://badge.fury.io/js/%40cosmah%2Fflowspec-cli.svg)](https://badge.fury.io/js/%40cosmah%2Fflowspec-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🤖 **AI-Powered Generation** - GPT-4 analyzes your components and generates comprehensive tests
- 👀 **Intelligent File Watching** - Automatically detects new/changed React components
- 🔄 **Incremental Updates** - Only updates changed parts of existing tests (saves tokens)
- 📊 **Real-time Dashboard** - Monitor coverage, performance, and team productivity
- ⚡ **Zero Configuration** - Works out of the box with React, Next.js, and more
- 🎯 **Smart Context** - Uses codebase embedding for intelligent test generation
- 🔧 **Auto-Installation** - Automatically installs and configures Vitest dependencies
- 💰 **Token Optimized** - Smart duplication guards and incremental updates
- ⚡ **Smart Caching** - Instant test generation for unchanged components (5-second rule)
- 🔧 **Auto-Healing** - Automatically fixes test syntax and import errors
- 📈 **Test Debt Counter** - Track untested components and estimate coverage time
- 🎨 **Design System Awareness** - Detects and leverages UI libraries (Shadcn, MUI, Chakra, Ant Design)
- 📦 **Data Archetype Detection** - Automatically finds and uses factories, mocks, and test data
- 🔄 **Background Execution** - Non-blocking test execution with real-time feedback

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @cosmah/flowspec-cli@latest

# Verify installation
flowspec --version
```

### Get Started in 3 Steps

```bash
# 1. Create account and login
flowspec signup
flowspec login

# 2. Initialize in your React project
cd my-react-app
flowspec init

# 3. Start intelligent file watching (auto-embeds codebase)
flowspec watch    # Automatically embeds codebase + generates tests for ALL existing files + watches for changes
```

## 📋 Commands

### Authentication
```bash
flowspec signup              # Create new account
flowspec login               # Login to existing account  
flowspec logout              # Logout from FlowSpec
```

### Project Management
```bash
flowspec init                # Initialize FlowSpec in project
flowspec embed               # Embed codebase for AI context
flowspec status              # Show project status and info
flowspec dashboard           # Open web dashboard
flowspec update              # Update CLI to latest version
```

### Test Generation
```bash
flowspec generate <files>    # Generate tests for specific files
flowspec watch               # Auto-generate tests for existing + new files
```

## 🛠️ How It Works

### 1. **Intelligent File Detection**
FlowSpec watches multiple directories and automatically detects React components:
- `src/**/*.{tsx,jsx}` (Create React App)
- `app/**/*.{tsx,jsx}` (Next.js App Router) 
- `pages/**/*.{tsx,jsx}` (Next.js Pages Router)
- `components/**/*.{tsx,jsx}`
- `lib/**/*.{tsx,jsx}`

### 2. **Smart Duplication Guards**
Before generating tests, FlowSpec:
- ✅ Checks if test file already exists
- ✅ Compares modification times (component vs test)
- ✅ Skips generation if test is up-to-date
- ✅ Only updates when component is newer

### 3. **Incremental Updates (Token Optimization)**
For existing tests:
- 🔄 Sends existing test code to AI
- ✏️ AI only modifies changed/new parts
- 💰 Saves ~60% on API tokens
- 🎯 Preserves working test logic

### 4. **Initial Sync + Continuous Watching**
When you run `flowspec watch`:
1. 🔍 Scans all existing React components
2. 🧪 Generates tests for components without tests
3. 👀 Starts watching for new files and changes
4. ⚡ Auto-generates tests for any new/modified components

## 📁 Supported Project Structures

FlowSpec works with all React project structures:

### Create React App
```
src/
├── components/
│   ├── Button.tsx          → Button.test.tsx
│   └── Header.tsx          → Header.test.tsx
└── pages/
    └── Home.tsx            → Home.test.tsx
```

### Next.js App Router
```
app/
├── components/
│   └── Navigation.tsx      → Navigation.test.tsx
├── dashboard/
│   └── page.tsx           → page.test.tsx
└── (auth)/
    └── login/
        └── page.tsx       → page.test.tsx
```

### Next.js Pages Router
```
pages/
├── index.tsx              → index.test.tsx
├── about.tsx              → about.test.tsx
└── api/                   (ignored)
components/
└── Layout.tsx             → Layout.test.tsx
```

## ⚙️ Configuration

### Project Config (`.flowspec/config.json`)
```json
{
  "projectId": "proj_abc123",
  "userId": "user_xyz789",
  "name": "My React App", 
  "framework": "react",
  "apiUrl": "https://api.cosmah.me"
}
```

### Environment Variables
```bash
FLOWSPEC_API_URL=https://api.cosmah.me  # API server URL
```

## 🎯 File Watching Behavior

### What Gets Watched
- ✅ `.tsx` and `.jsx` files only
- ✅ Files starting with capital letter (React components)
- ✅ Files in `src/`, `app/`, `pages/`, `components/`, `lib/`

### What Gets Ignored
- ❌ `**/*.test.{tsx,jsx}` (existing test files)
- ❌ `**/*.spec.{tsx,jsx}` (spec files)
- ❌ `node_modules/`, `dist/`, `build/`, `.next/`
- ❌ Files starting with lowercase (utilities, not components)

### Example Output
```bash
$ flowspec watch

Starting FlowSpec file watcher...

Found 12 existing components
Generating tests for existing files...

File found: src/components/Button.tsx
Generated test for src/components/Button.tsx
   Test file: src/components/Button.test.tsx
   Status: Passing
   Attempts: 1

File found: app/dashboard/Header.tsx  
Test exists: app/dashboard/Header.test.tsx - checking for updates...
Skipping app/dashboard/Header.tsx - test is up to date

Initial sync complete! Processed 12 existing files
FlowSpec watcher is ready and monitoring for changes
Press Ctrl+C to stop watching

File changed: src/components/Button.tsx
Updated test for src/components/Button.tsx
   Test file: src/components/Button.test.tsx
   Status: Passing
   Attempts: 1
```

## 💰 Token Optimization Features

### Smart Duplication Prevention
- **Before**: Generated tests for all files every time
- **After**: Only generates when needed (new files or component changes)
- **Savings**: ~60% reduction in API calls

### Incremental Updates
- **Before**: Rewrote entire test file for small component changes
- **After**: Sends existing test + component changes for incremental updates
- **Savings**: ~40% reduction in prompt tokens

### Clean Test Output
- **Before**: Tests included decorative comments and emojis
- **After**: Clean, minimal test code focused on functionality
- **Savings**: ~20% reduction in response tokens

## 📊 Dashboard Integration

Access your FlowSpec dashboard at [https://dashboard.cosmah.me](https://dashboard.cosmah.me) to:

- 📈 View test coverage analytics
- 👥 Collaborate with team members
- 🔍 Monitor test performance
- 📋 Track project progress
- ⚙️ Manage account settings

## 🚨 Troubleshooting

### Common Issues

**"Project not initialized"**
```bash
flowspec init
```

**"Not logged in"**  
```bash
flowspec login
```

**"No components found"**
Make sure you have `.tsx` or `.jsx` files starting with capital letters in:
- `src/`, `app/`, `pages/`, `components/`, or `lib/` directories

**"Test generation failed"**
- Check internet connection
- Verify you have sufficient API credits
- Try `flowspec status` to check connection

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/cosmah/flowspec-cli.git
cd flowspec-cli
npm install
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- 🌐 **Website**: [https://cosmah.me](https://cosmah.me)
- 📊 **Dashboard**: [https://dashboard.cosmah.me](https://dashboard.cosmah.me)  
- 📚 **Documentation**: [https://docs.cosmah.me](https://docs.cosmah.me)
- 🐛 **Issues**: [GitHub Issues](https://github.com/cosmah/flowspec-cli/issues)
- 💬 **Support**: [support@cosmah.me](mailto:support@cosmah.me)

## 🎉 What's New in v2.0.8

- ⚡ **Smart Caching (Ghost Runner)**: Instant test generation for unchanged components - bypass API calls when code hasn't changed
- 🔧 **Auto-Healing**: Automatically detects and fixes test syntax errors, import issues, and component mismatches
- 📈 **Test Debt Counter**: Real-time visibility into untested components with time-to-coverage estimates
- 🎨 **Design System Awareness**: Automatically detects UI libraries (Shadcn, MUI, Chakra, Ant Design) and tailors test generation
- 📦 **Data Archetype Detection**: Finds and leverages existing factories, mocks, and test data patterns
- 🔄 **Background Test Execution**: Non-blocking test runs with silent notifications for seamless workflow
- 🎯 **Intelligent Failure Analysis**: Classifies test failures as "our fault" (auto-heals) vs "their fault" (shows suggestions)
- ⚡ **5-Second Rule**: Smart caching ensures sub-5-second response times for cached components

## 🎉 What's New in v2.0.0

- 🆕 **Intelligent File Watching**: Automatically processes existing files + watches for changes
- 🆕 **Next.js App Router Support**: Full support for `app/` directory structure  
- 🆕 **Incremental Updates**: Only updates changed parts of existing tests
- 🆕 **Token Optimization**: Smart duplication guards save ~60% on API costs
- 🆕 **Initial Sync**: Processes all existing components when starting watcher
- 🆕 **Clean Output**: Removed decorative elements for professional test code
- 🆕 **Better Performance**: File modification time checking prevents unnecessary updates

---

**Made with ❤️ by the FlowSpec Team**