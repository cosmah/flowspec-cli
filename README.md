# FlowSpec CLI

Autonomous React test generation powered by AI.

## Installation

```bash
# Install globally
npm install -g @cosmah/flowspec-cli
```

## Quick Start

```bash
# 1. Create account
flowspec register
# or
flowspec signup

# 2. Login (if you already have an account)
flowspec login

# 3. Initialize in your React project
cd my-react-app
flowspec init

# 4. Embed your codebase for AI context
flowspec embed

# 5. Generate tests automatically
flowspec watch

# Or generate for specific files
flowspec generate src/components/Button.tsx
```

## Commands

### Authentication
- `flowspec register` - Create a new FlowSpec account
- `flowspec signup` - Create a new FlowSpec account (alias)
- `flowspec login` - Login to existing account
- `flowspec logout` - Logout from FlowSpec

### Project Management
- `flowspec init` - Initialize FlowSpec in current project
- `flowspec embed` - Embed codebase for AI context
- `flowspec status` - Show project status and info

### Test Generation
- `flowspec generate <files...>` - Generate tests for specific files
- `flowspec watch` - Watch for changes and auto-generate tests
- `flowspec dashboard` - Open web dashboard

### Utility
- `flowspec uninstall` - Show uninstall instructions
- `flowspec --help` - Show all commands
- `flowspec --version` - Show version

## Configuration

FlowSpec creates a `.flowspec/config.json` file in your project:

```json
{
  "projectId": "proj_123",
  "userId": "user_456", 
  "name": "My App",
  "framework": "react",
  "apiUrl": "https://api.cosmah.me"
}
```

## Environment Variables

- `FLOWSPEC_API_URL` - API Server URL (default: https://api.cosmah.me)

## Requirements

- Node.js 16+
- React/Vue/Svelte project with package.json
- Vitest for test execution

## How It Works

1. **Authentication**: Secure JWT-based auth with FlowSpec cloud
2. **Project Initialization**: Links your local project to FlowSpec cloud
3. **Code Embedding**: Analyzes and uploads code context for AI
4. **Test Generation**: AI generates comprehensive Vitest tests
5. **Self-Healing**: Automatically fixes failing tests
6. **Dashboard**: View results and analytics in web UI

## Supported Frameworks

- ✅ React (TypeScript/JavaScript)
- 🚧 Vue (coming soon)
- 🚧 Svelte (coming soon)

## File Patterns

FlowSpec automatically detects and generates tests for:

- `src/**/*.{tsx,jsx}` - React components
- `components/**/*.{tsx,jsx}` - Component directories
- `lib/**/*.{tsx,jsx}` - Library components

Files must:
- Start with capital letter (PascalCase)
- Export a React component
- Not be test files (*.test.*, *.spec.*)

## Examples

### Generate tests for a component
```bash
flowspec generate src/components/Button.tsx
# Creates: src/components/Button.test.tsx
```

### Watch mode for automatic generation
```bash
flowspec watch
# Monitors file changes and generates tests automatically
```

### Check project status
```bash
flowspec status
# Shows authentication, project info, and server connection
```

## Troubleshooting

### "Project not initialized"
Run `flowspec init` in your project root.

### "Not logged in"
Run `flowspec login` or `flowspec signup`.

### "Cannot connect to FlowSpec server"
Make sure the Brain Server is running on the configured URL.

### "Vitest not found"
Install Vitest in your project:
```bash
npm install -D vitest @testing-library/react jsdom
```

## Support

- Documentation: https://docs.flowspec.dev
- Issues: https://github.com/flowspec/cli/issues
- Discord: https://discord.gg/flowspec