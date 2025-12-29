# FlowSpec CLI

🚀 **AI-powered autonomous React test generation with self-healing capabilities**

FlowSpec automatically generates, executes, and maintains comprehensive test suites for your React applications using GPT-4. Zero configuration, maximum coverage.

[![npm version](https://badge.fury.io/js/%40cosmah%2Fflowspec-cli.svg)](https://badge.fury.io/js/%40cosmah%2Fflowspec-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🤖 **AI-Powered Generation** - GPT-4 analyzes your components and generates comprehensive tests
- 🔄 **Self-Healing Tests** - Automatically fixes failing tests when code changes
- 📊 **Real-time Dashboard** - Monitor coverage, performance, and team productivity
- ⚡ **Zero Configuration** - Works out of the box with any React project
- 🎯 **Smart Context** - Uses codebase embedding for intelligent test generation
- 🔧 **Auto-Installation** - Automatically installs and configures Vitest dependencies
- 🌐 **Cloud Integration** - Sync with FlowSpec dashboard for team collaboration

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @cosmah/flowspec-cli

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

# 3. Start generating tests
flowspec embed    # Embed codebase for AI context
flowspec watch    # Start watching for changes
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
```

### Test Generation
```bash
flowspec generate <files>    # Generate tests for specific files
flowspec watch               # Auto-generate tests on file changes
```

## 🛠️ How It Works

### 1. **AI Analysis**
FlowSpec uses GPT-4 to analyze your React components, understanding:
- Component structure and props
- State management patterns  
- User interaction flows
- Edge cases and error scenarios

### 2. **Intelligent Context**
Your codebase is embedded using OpenAI embeddings to provide relevant context:
- Related components and utilities
- Type definitions and interfaces
- Custom hooks and helpers
- Project-specific patterns

### 3. **Comprehensive Test Generation**
Generated tests include:
- ✅ Component rendering tests
- ✅ User interaction scenarios  
- ✅ Props validation and edge cases
- ✅ Error boundary testing
- ✅ Accessibility checks
- ✅ Performance assertions

### 4. **Self-Healing Capabilities**
When tests fail due to code changes:
- 🔍 Analyzes failure reasons
- 🔧 Automatically fixes test code
- ✅ Re-runs until tests pass
- 📊 Reports success metrics

## 📁 Project Structure

After initialization, FlowSpec creates:

```
my-react-app/
├── .flowspec/
│   ├── config.json          # Project configuration
│   └── temp_test.test.tsx    # Temporary test files
├── vitest.config.ts          # Auto-generated Vitest config
└── src/
    └── test/
        └── setup.ts          # Test setup file
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

### Vitest Config (Auto-generated)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

## 🎯 Supported Patterns

### Component Types
- ✅ Functional components with hooks
- ✅ Components with TypeScript props
- ✅ Components with state management
- ✅ Higher-order components (HOCs)
- ✅ Context providers and consumers

### Testing Frameworks
- ✅ **Vitest** (Primary, auto-installed)
- ✅ **React Testing Library** (Auto-installed)
- ✅ **Jest DOM** (Auto-installed)
- 🚧 Jest (Coming soon)
- 🚧 Cypress (Coming soon)

### Frameworks
- ✅ **React** (TypeScript/JavaScript)
- 🚧 Vue 3 (Coming soon)
- 🚧 Svelte (Coming soon)

## 📊 Dashboard Integration

Access your FlowSpec dashboard at [https://dashboard.cosmah.me](https://dashboard.cosmah.me) to:

- 📈 View test coverage analytics
- 👥 Collaborate with team members
- 🔍 Monitor test performance
- 📋 Track project progress
- ⚙️ Manage account settings

## 🔧 Advanced Usage

### Generate Tests for Specific Files
```bash
# Single file
flowspec generate src/components/Button.tsx

# Multiple files  
flowspec generate src/components/*.tsx

# With watch mode
flowspec generate src/components/Button.tsx --watch
```

### Custom Project Initialization
```bash
# Specify project name and framework
flowspec init --name "My App" --framework react
```

### Check Connection Status
```bash
flowspec status
# Shows:
# ✅ Authentication status
# ✅ Project configuration  
# ✅ Server connection
# ✅ Test statistics
```

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

**"Vitest not found"**
FlowSpec now auto-installs Vitest! If manual installation is needed:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**"Embedding failed: timed out"**
- Check internet connection
- Verify OpenAI API is accessible
- Try with smaller codebase first

**"Cannot connect to FlowSpec server"**
- Check if `https://api.cosmah.me` is accessible
- Verify authentication with `flowspec status`

### Debug Mode
```bash
# Enable verbose logging
DEBUG=flowspec* flowspec embed
```

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

## 🎉 What's New in v1.1.0

- ✅ **Auto-Installation**: Automatically installs Vitest dependencies
- ✅ **Better Error Handling**: Improved timeout and connection handling  
- ✅ **UUID Point IDs**: Fixed Qdrant compatibility issues
- ✅ **Batch Processing**: Faster embedding with 50-chunk batches
- ✅ **Enhanced Dashboard**: Professional UI with analytics
- ✅ **Self-Healing Tests**: Automatic test repair on failures
- ✅ **Improved CLI**: Better progress feedback and error messages

---

**Made with ❤️ by the FlowSpec Team**