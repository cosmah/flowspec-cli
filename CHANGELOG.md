# Changelog

All notable changes to FlowSpec CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-06

### 🚀 Added
- **Automatic Dependency Installation**: FlowSpec now automatically detects and installs missing dependencies during test generation
- **Enhanced Dependency Verification**: Checks both `package.json` and actual `node_modules` installation to ensure dependencies exist
- **Smart Dependency Error Handling**: Distinguishes between missing project dependencies (auto-installs) and test code errors (auto-heals)

### 🔧 Improved
- **Healer Node**: Fixed missing `re` module import causing auto-healing failures
- **Dependency Detection**: Enhanced logic to detect missing npm packages (@vitejs/plugin-react, vitest, etc.)
- **Error Classification**: Improved failure analyzer to correctly identify dependency errors vs test code issues
- **Healer Prompts**: Enhanced prompts to never suggest manual dependency installation to users
- **Code Extraction**: Better validation and extraction of test code from healer responses
- **Automatic Retry**: Tests automatically retry after dependency installation

### 🐛 Fixed
- **Critical Bug**: Fixed `NameError: name 're' is not defined` in healer node that prevented auto-healing
- **Import Issues**: Fixed healer not properly extracting code from markdown blocks
- **Dependency Errors**: Fixed issue where dependency errors triggered incorrect auto-healing instead of auto-installation
- **False Positives**: Improved error classification to prevent false auto-healing triggers on dependency issues

### 📚 Technical Details
- Added `isPackageInstalled()` method to verify actual package installation in `node_modules`
- Enhanced `ensureVitest()` to check both package.json and node_modules
- Implemented `isMissingDependencyError()` and `ensureDependencies()` in test generator
- Improved healer code extraction with better validation and fallback to original code
- Enhanced error messages to guide users without suggesting manual steps

## [2.0.9] - 2026-01-06

### 🔧 Improved
- **Resource Cleanup**: Enhanced connection pool management and cleanup on shutdown
- **Process Management**: Improved child process tracking and cleanup for test executions
- **HTTP Client**: Added timeout configuration to all HTTP requests for better reliability
- **Graceful Shutdown**: Enhanced signal handling (SIGINT, SIGTERM, SIGUSR1, SIGUSR2) for proper cleanup
- **Connection Management**: Better database connection pool cleanup in brain server

### 🐛 Fixed
- **Resource Leaks**: Fixed potential database connection leaks on server shutdown
- **Orphaned Processes**: Fixed issue where child processes could remain after CLI exit
- **Missing Timeouts**: Added missing HTTP request timeouts to prevent hanging connections
- **Watcher Cleanup**: Fixed file watcher cleanup on all exit paths
- **Background Tasks**: Improved cleanup of background test execution processes

### 📚 Technical Details
- Database connection pools now explicitly closed on brain server shutdown
- Test executor tracks and kills all child processes on cleanup
- All axios requests now have explicit timeout configurations
- Enhanced error handling for connection pool management

## [2.0.8] - 2026-01-05

### 🚀 Added
- **Smart Caching (Ghost Runner)**: Instant test generation for unchanged components using AST-based code hashing
- **Auto-Healing**: Automatically detects and fixes test syntax errors, import mismatches, and component issues
- **Test Debt Counter**: Real-time visibility into untested components with time-to-coverage estimates
- **Design System Awareness**: Automatically detects UI libraries (Shadcn, MUI, Chakra, Ant Design) and tailors test generation
- **Data Archetype Detection**: Finds and leverages existing factories, mocks, and test data patterns in your codebase
- **Background Test Execution**: Non-blocking test runs with silent notifications for seamless workflow
- **Intelligent Failure Analysis**: Classifies test failures as "our fault" (auto-heals) vs "their fault" (shows actionable suggestions)
- **Coverage Visualization**: Generate and view HTML coverage reports with `flowspec coverage`
- **Update Command**: Easy CLI updates with `flowspec update` - no need to uninstall/reinstall

### 🔧 Improved
- **5-Second Rule**: Smart caching ensures sub-5-second response times for cached components
- **Silent Notifications**: Single-line terminal updates for cleaner UX during watch mode
- **Error Classification**: Enhanced failure analyzer to detect import errors, syntax issues, and component problems
- **Brain Server Integration**: Full integration of design system and data archetype context into test generation
- **Healer Response Parsing**: Improved markdown code block extraction for better auto-healing

### 🐛 Fixed
- **Import Error Detection**: Enhanced failure analyzer to detect "forgot to export" and "mixed up default/named imports" errors
- **Healer Response Format**: Fixed markdown code block extraction in healer node to properly extract TypeScript code
- **Test Execution**: Background test execution now properly captures and analyzes test results
- **Cache Invalidation**: Smart cache invalidation based on component code changes

### 📚 Documentation
- **Updated README**: Added comprehensive documentation for v2.1.0 features
- **Feature Highlights**: Documented smart caching, auto-healing, and test debt counter
- **Usage Examples**: Added examples for new features and commands

## [2.0.7] - 2025-12-30

### 🚀 Enhanced
- **Post-Processing Validation**: Added automatic post-processing to fix common test generation issues
- **Jest Syntax Auto-Fix**: Automatically converts `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`, etc.
- **Import Auto-Fix**: Automatically adds missing Vitest imports if functions are used without imports
- **Triple-Slash Removal**: Automatically removes incorrect `/// <reference types="vitest" />` directives
- **Test Script Auto-Add**: Automatically adds `"test": "vitest"` script to package.json during initialization

### 🐛 Fixed
- **Installation Completeness**: Now installs all required dependencies including `@vitejs/plugin-react` and `vite`
- **Dependency Detection**: Improved check to verify all required dependencies are present, not just vitest
- **Test Script Management**: Ensures test script exists in package.json even when dependencies are already installed

## [2.0.6] - 2025-12-30

### 🚀 Enhanced
- **Vitest Documentation Integration**: Generator now references official Vitest documentation (https://vitest.dev) for correct syntax
- **Comprehensive Vitest Examples**: Added detailed Vitest mocking examples and patterns directly in generator prompt
- **TypeScript Type Configuration**: ProjectManager now automatically configures tsconfig.json with Vitest types (`vitest/globals`, `@testing-library/jest-dom`)
- **Enhanced TypeScript Support**: Generator prompt includes explicit TypeScript typing requirements and examples
- **Explicit Import Strategy**: Generator now uses explicit ES6 imports from 'vitest' instead of triple-slash references
- **Import Path Intelligence**: Generator now correctly handles import paths for Next.js App Router, Pages Router, and plain React projects

### 🐛 Fixed
- **TypeScript Type Errors**: Fixed by using explicit imports (`import { describe, it, expect } from 'vitest'`) instead of triple-slash references
- **Vitest Syntax Accuracy**: Generator now follows Vitest best practices with explicit imports, matching production-ready test patterns
- **Import Path Errors**: Fixed incorrect import paths for Next.js App Router components (now uses `./page` instead of relative paths)
- **Test File Structure**: Corrected test file structure to match industry best practices (explicit imports, proper mocking order)

## [2.0.5] - 2025-12-30

### 🐛 Fixed
- **Critical: Test File Creation**: Fixed bug where test files were not being created when tests didn't pass initially
- **API Response Logic**: Fixed `success` field to indicate test code generation (not test passing status)
- **File Writing Logic**: CLI now writes test files whenever test code is generated, regardless of passing status
- **API URL Detection**: Fixed TestGenerator to read API URL from project config at runtime
- **Graph State Extraction**: Improved final state extraction in graph engine for better reliability
- **Vitest Syntax**: Fixed generator to use Vitest syntax (`vi.fn()`, `vi.mock()`) instead of Jest syntax (`jest.fn()`, `jest.mock()`)
- **TypeScript Types**: Generator now includes `/// <reference types="vitest" />` directive for proper TypeScript support
- **tsconfig.json Configuration**: ProjectManager now automatically configures tsconfig.json with Vitest types

### 🚀 Enhanced
- **Vitest Documentation References**: Generator prompt now references official Vitest documentation (https://vitest.dev) for correct syntax
- **Comprehensive Examples**: Added detailed Vitest mocking examples and patterns in generator prompt
- **TypeScript Best Practices**: Enhanced prompt with explicit TypeScript typing requirements and examples

### 🔧 Improved
- **Error Handling**: Better error messages and debugging information for test generation failures
- **File Write Operations**: Added try/catch around file write operations with detailed error messages
- **State Management**: Enhanced graph execution state extraction to handle edge cases

### 📝 Technical Details
- Separated "generation success" from "test passing" - these are now independent concepts
- Test files are created even if they need fixes, allowing developers to iterate
- Better handling of empty test_code responses from API

## [2.0.4] - 2025-12-30

### 🐛 Fixed
- **Qdrant Collection Mismatch**: Fixed collection name mismatch between CLI and backend
- **Docker npm Issue**: Moved Vitest execution from Docker container to user's local machine
- **Test Execution**: Tests now run locally where npm/vitest are available

### 🔧 Improved
- **Architecture**: Proper separation between backend (test generation) and CLI (test execution)
- **Local Verification**: Tests are verified locally after generation
- **Collection Names**: Dynamic collection names based on project ID

## [2.0.3] - 2025-12-30

### 🔧 Improved
- **Enhanced Error Logging**: Detailed API error information for debugging test generation failures
- **Request Visibility**: Shows API requests, component details, and response data
- **Better Debugging**: HTTP status codes and full error responses displayed

### 🐛 Fixed
- **Silent Failures**: No more vague "test generation failed" messages
- **Error Details**: Shows exact backend errors and API response details

## [2.0.2] - 2025-12-30

### 🚀 Added
- **Auto-Embedding**: `flowspec watch` now automatically embeds codebase for AI context
- **Simplified Workflow**: Reduced from 4 steps to 3 steps - no manual embedding required

### 🔧 Improved
- **User Experience**: Single command (`flowspec watch`) now handles everything automatically
- **Error Handling**: Graceful fallback if embedding fails, continues with limited context

### 📚 Documentation
- **Updated README**: Simplified workflow documentation
- **Removed Manual Step**: No longer need to run `flowspec embed` manually

## [2.0.1] - 2025-12-30

### 🚀 Added
- **Detailed Logging**: Comprehensive console output showing all watcher activities
- **Next.js App Router Support**: Full support for `page.tsx`, `layout.tsx`, and other Next.js special files
- **File Scanning Visibility**: Shows which files are being scanned and why they're skipped/included
- **Progress Indicators**: Real-time progress during initial sync and test generation
- **Debug Information**: Project info, API endpoints, and watch patterns displayed on startup

### 🔧 Improved
- **User Experience**: Clear, detailed logging similar to `npm run dev` for better debugging
- **File Detection**: Enhanced detection of Next.js App Router files (page, layout, loading, error, etc.)
- **Error Visibility**: Better error reporting with context and file information
- **Watch Feedback**: Real-time feedback for file additions, changes, and deletions

### 🐛 Fixed
- **Next.js Detection**: Fixed issue where `page.tsx` and `layout.tsx` were not being detected
- **Duplicate Logging**: Removed duplicate "Starting watcher" messages
- **Silent Failures**: Added logging for all file operations and decisions

## [2.0.0] - 2025-12-30

### 🚀 Added
- **Intelligent File Watching**: Automatically processes ALL existing React components when starting watcher
- **Next.js App Router Support**: Full support for `app/` directory structure and routing
- **Next.js Pages Router Support**: Support for `pages/` directory structure  
- **Incremental Test Updates**: Only updates changed parts of existing tests instead of full rewrites
- **Smart Duplication Guards**: Checks file modification times to prevent unnecessary test generation
- **Token Optimization**: Reduces API token usage by ~60% through intelligent caching and incremental updates
- **Initial Sync**: Processes all existing components during first `flowspec watch` execution
- **Multi-Directory Support**: Watches `src/`, `app/`, `pages/`, `components/`, and `lib/` directories

### 🔧 Improved
- **File Detection**: Enhanced component detection for capital-letter React components
- **Performance**: File modification time checking prevents redundant API calls
- **User Experience**: Clean, professional output without decorative elements
- **Cost Efficiency**: Incremental updates save ~40% on prompt tokens
- **Watch Behavior**: Processes existing files first, then starts continuous watching
- **Error Handling**: Better handling of file system events and API failures

### 🐛 Fixed
- **Missing App Directory**: Added support for Next.js `app/` directory watching
- **Existing File Sync**: Fixed issue where existing components weren't processed on watch start
- **Duplicate Generation**: Prevents generating tests for files that already have up-to-date tests
- **Token Waste**: Eliminated unnecessary API calls for unchanged components

### 💰 Token Optimization Features
- **Smart Duplication Prevention**: ~60% reduction in API calls
- **Incremental Updates**: ~40% reduction in prompt tokens  
- **Clean Test Output**: ~20% reduction in response tokens
- **Modification Time Checking**: Only processes files when component is newer than test

### 📚 Documentation
- **Updated README**: Comprehensive documentation for v2.0.0 features
- **File Watching Guide**: Detailed explanation of intelligent watching behavior
- **Token Optimization**: Documentation of cost-saving features
- **Next.js Support**: Examples for both App Router and Pages Router projects

## [1.1.4] - 2025-12-30

### 🐛 Fixed
- **Connection Timeout**: Fixed axios timeout issue causing CLI to hang on server connection checks
- **Local Development**: Improved reliability when connecting to local Brain Server instances

### 🔧 Improved
- **Network Resilience**: Added 5-second timeout to API requests for better user experience
- **Error Handling**: Better timeout handling for server connectivity checks

## [1.1.3] - 2025-12-29

### 🚀 Added
- **Auto-Installation**: Automatically installs Vitest and testing dependencies when missing
- **Package Manager Detection**: Supports npm, yarn, and pnpm automatically
- **Vitest Configuration**: Auto-generates `vitest.config.ts` and test setup files
- **Enhanced Dashboard**: Professional web dashboard with analytics and project management
- **Batch Processing**: Embedding now processes files in batches of 50 for better performance
- **UUID Point IDs**: Proper UUID generation for Qdrant vector storage
- **Connection Testing**: Qdrant connection validation on startup
- **Better Progress Feedback**: Detailed progress indicators during embedding
- **Comprehensive Documentation**: Updated README with examples and troubleshooting

### 🔧 Improved
- **Error Handling**: Better error messages and graceful degradation
- **Timeout Management**: 5-minute timeout for embedding operations
- **Connection Resilience**: Continues operation even when Qdrant is unavailable
- **CLI Feedback**: More informative status messages and progress indicators
- **Code Quality**: Enhanced TypeScript types and error handling

### 🐛 Fixed
- **Embedding Timeout**: Fixed timeout issues during codebase embedding
- **Qdrant Compatibility**: Fixed point ID format issues with Qdrant
- **Tool Installation**: Resolved Vitest installation detection and setup
- **Connection Errors**: Better handling of network and API errors
- **Memory Management**: Improved handling of large codebases

### 📚 Documentation
- **Enhanced README**: Comprehensive documentation with examples
- **Troubleshooting Guide**: Common issues and solutions
- **API Documentation**: Better command descriptions and usage examples
- **Configuration Guide**: Detailed setup and configuration instructions

## [1.0.2] - 2024-12-20

### 🐛 Fixed
- Authentication token persistence
- Project initialization edge cases
- CLI command parsing improvements

## [1.0.1] - 2024-12-15

### 🔧 Improved
- Better error messages for authentication failures
- Improved project detection logic
- Enhanced CLI help text

## [1.0.0] - 2024-12-10

### 🚀 Initial Release
- **Core Features**: AI-powered test generation for React components
- **Authentication**: JWT-based user authentication
- **Project Management**: Project initialization and configuration
- **Code Embedding**: Codebase analysis and context embedding
- **Test Generation**: GPT-4 powered test creation
- **Self-Healing**: Automatic test repair on failures
- **Dashboard Integration**: Web dashboard for project management
- **CLI Interface**: Comprehensive command-line interface

### 📋 Commands
- `flowspec signup/login/logout` - Authentication management
- `flowspec init` - Project initialization
- `flowspec embed` - Codebase embedding
- `flowspec generate` - Test generation
- `flowspec watch` - File watching and auto-generation
- `flowspec status` - Project status and diagnostics
- `flowspec dashboard` - Open web dashboard

### 🎯 Supported
- **Frameworks**: React (TypeScript/JavaScript)
- **Testing**: Vitest with React Testing Library
- **Node.js**: Version 16 and above
- **Package Managers**: npm, yarn, pnpm

---

## Legend

- 🚀 **Added**: New features
- 🔧 **Improved**: Enhancements to existing features  
- 🐛 **Fixed**: Bug fixes
- 📚 **Documentation**: Documentation changes
- ⚠️ **Deprecated**: Features that will be removed
- 🗑️ **Removed**: Features that were removed
- 🔒 **Security**: Security improvements