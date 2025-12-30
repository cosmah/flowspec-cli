"use strict";
/**
 * FlowSpec CLI - Test Generator
 * Handles test generation, file watching, and test execution
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const chokidar_1 = __importDefault(require("chokidar"));
const manager_1 = require("../auth/manager");
const manager_2 = require("../project/manager");
class TestGenerator {
    constructor() {
        this.watcher = null;
        this.authManager = new manager_1.AuthManager();
        this.projectManager = new manager_2.ProjectManager();
        // Check for API URL in environment variable first
        // Then check current project config if available
        let apiUrl = process.env.FLOWSPEC_API_URL;
        if (!apiUrl) {
            // Try to get API URL from project config
            const projectConfigPath = path.join(process.cwd(), '.flowspec', 'config.json');
            if (fs.existsSync(projectConfigPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
                    if (config.apiUrl) {
                        apiUrl = config.apiUrl;
                    }
                }
                catch (error) {
                    // Ignore config read errors
                }
            }
        }
        this.apiUrl = apiUrl || 'https://api.cosmah.me';
    }
    /**
     * Generate tests for specific files
     */
    async generateTests(files, options = {}) {
        const projectRoot = process.cwd();
        const config = this.projectManager.getProjectConfig(projectRoot);
        if (!config) {
            throw new Error('Project not initialized. Run "flowspec init" first.');
        }
        // Update API URL from project config if available
        if (config.apiUrl) {
            this.apiUrl = config.apiUrl;
        }
        await this.authManager.ensureAuthenticated();
        console.log(chalk_1.default.blue(`\nGenerating tests for ${files.length} files...\n`));
        const results = [];
        for (const file of files) {
            const filePath = path.resolve(projectRoot, file);
            if (!fs.existsSync(filePath)) {
                console.log(chalk_1.default.red(`File not found: ${file}`));
                continue;
            }
            if (!this.isTestableFile(filePath)) {
                console.log(chalk_1.default.yellow(`Skipping non-component file: ${file}`));
                continue;
            }
            // Check if test file already exists
            const testFilePath = this.getTestFilePath(filePath);
            const testExists = fs.existsSync(testFilePath);
            if (testExists) {
                console.log(chalk_1.default.gray(`Test exists: ${path.relative(projectRoot, testFilePath)} - checking for updates...`));
                // Check if component was modified after test file
                const componentStat = fs.statSync(filePath);
                const testStat = fs.statSync(testFilePath);
                if (componentStat.mtime <= testStat.mtime) {
                    console.log(chalk_1.default.gray(`Skipping ${file} - test is up to date`));
                    continue;
                }
            }
            const spinner = (0, ora_1.default)(`${testExists ? 'Updating' : 'Creating'} test for ${file}...`).start();
            try {
                const componentCode = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(projectRoot, filePath);
                // For existing tests, include current test content for incremental updates
                let existingTestCode = '';
                if (testExists) {
                    existingTestCode = fs.readFileSync(testFilePath, 'utf-8');
                }
                const result = await this.generateTestForComponent(config.projectId, componentCode, relativePath, existingTestCode);
                // Write test file if test_code exists and has content, regardless of passing status
                // This allows tests to be created even if they need fixes
                if (result.test_code && result.test_code.trim().length > 0) {
                    try {
                        // Save test file
                        this.ensureTestDirectory(testFilePath);
                        fs.writeFileSync(testFilePath, result.test_code, 'utf-8');
                        // Execute test locally to verify it works
                        const testPassed = await this.executeTestLocally(testFilePath, projectRoot);
                        spinner.succeed(`${testExists ? 'Updated' : 'Generated'} test for ${file}`);
                        console.log(chalk_1.default.gray(`   Test file: ${path.relative(projectRoot, testFilePath)}`));
                        console.log(chalk_1.default.gray(`   Status: ${testPassed ? 'Passing' : 'Generated (needs fixes)'}`));
                        console.log(chalk_1.default.gray(`   Attempts: ${result.attempts}`));
                        // Mark as successful since file was written
                        result.success = true;
                    }
                    catch (writeError) {
                        spinner.fail(`Failed to write test file for ${file}`);
                        console.log(chalk_1.default.red(`   Write error: ${writeError.message}`));
                        result.success = false;
                        result.message = `File write failed: ${writeError.message}`;
                    }
                }
                else {
                    spinner.fail(`Failed to ${testExists ? 'update' : 'generate'} test for ${file}`);
                    console.log(chalk_1.default.red(`   Error: ${result.message || 'No test code generated'}`));
                    if (result.error_log) {
                        console.log(chalk_1.default.gray(`   Details: ${result.error_log}`));
                    }
                }
                results.push({ file, result });
            }
            catch (error) {
                spinner.fail(`Error processing ${file}`);
                console.log(chalk_1.default.red(`   ${error.message}`));
            }
        }
        // Summary
        const successful = results.filter(r => r.result.success).length;
        const failed = results.length - successful;
        console.log(chalk_1.default.blue('\nGeneration Summary:'));
        console.log(chalk_1.default.green(`   Successful: ${successful}`));
        if (failed > 0) {
            console.log(chalk_1.default.red(`   Failed: ${failed}`));
        }
        if (options.watch) {
            console.log(chalk_1.default.blue('\nStarting watch mode...'));
            await this.startWatching(projectRoot);
        }
    }
    /**
     * Start watching for file changes
     */
    async startWatching(projectRoot) {
        const config = this.projectManager.getProjectConfig(projectRoot);
        if (!config) {
            throw new Error('Project not initialized. Run "flowspec init" first.');
        }
        // Update API URL from project config if available
        if (config.apiUrl) {
            this.apiUrl = config.apiUrl;
        }
        if (this.watcher) {
            console.log(chalk_1.default.yellow('⚠️  Watcher is already running'));
            return;
        }
        console.log(chalk_1.default.blue('👀 Starting FlowSpec file watcher...\n'));
        console.log(chalk_1.default.gray(`📁 Project: ${config.name}`));
        console.log(chalk_1.default.gray(`🔗 API: ${this.apiUrl}`));
        console.log(chalk_1.default.gray(`📂 Root: ${projectRoot}\n`));
        // Auto-embed codebase if not done yet
        console.log(chalk_1.default.blue('🧠 Ensuring codebase is embedded for AI context...'));
        try {
            await this.projectManager.embedCodebase(projectRoot);
        }
        catch (error) {
            console.log(chalk_1.default.yellow('⚠️  Embedding failed, continuing without full context'));
            console.log(chalk_1.default.gray('   You can run "flowspec embed" manually later'));
        }
        const watchPatterns = [
            'src/**/*.{ts,tsx,js,jsx}',
            'app/**/*.{ts,tsx,js,jsx}', // Next.js App Router
            'components/**/*.{ts,tsx,js,jsx}',
            'lib/**/*.{ts,tsx,js,jsx}',
            'pages/**/*.{ts,tsx,js,jsx}' // Next.js Pages Router
        ];
        console.log(chalk_1.default.blue('👀 Watching patterns:'));
        watchPatterns.forEach(pattern => {
            console.log(chalk_1.default.gray(`   ${pattern}`));
        });
        console.log();
        this.watcher = chokidar_1.default.watch(watchPatterns, {
            cwd: projectRoot,
            ignored: [
                'node_modules/**',
                'dist/**',
                'build/**',
                '.next/**',
                'coverage/**',
                '**/*.test.{ts,tsx,js,jsx}',
                '**/*.spec.{ts,tsx,js,jsx}',
                '.flowspec/**'
            ],
            persistent: true,
            ignoreInitial: false // Changed to false to process existing files
        });
        let initialScanComplete = false;
        const existingFiles = [];
        let scannedFiles = 0;
        let testableFiles = 0;
        this.watcher
            .on('add', (filePath) => {
            scannedFiles++;
            console.log(chalk_1.default.gray(`🔍 Scanning: ${filePath}`));
            if (!initialScanComplete) {
                // Collect existing files during initial scan
                if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                    existingFiles.push(filePath);
                    testableFiles++;
                    console.log(chalk_1.default.green(`   ✅ Testable component found`));
                }
                else {
                    console.log(chalk_1.default.gray(`   ⏭️  Skipped (not a testable component)`));
                }
            }
            else {
                // Handle new files after initial scan
                if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                    console.log(chalk_1.default.green(`📝 New component detected: ${filePath}`));
                    this.handleFileChange('added', filePath, projectRoot);
                }
                else {
                    console.log(chalk_1.default.gray(`📄 New file (not testable): ${filePath}`));
                }
            }
        })
            .on('change', (filePath) => {
            if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                console.log(chalk_1.default.yellow(`📝 Component modified: ${filePath}`));
                this.handleFileChange('changed', filePath, projectRoot);
            }
            else {
                console.log(chalk_1.default.gray(`📄 File modified (not testable): ${filePath}`));
            }
        })
            .on('unlink', (filePath) => {
            console.log(chalk_1.default.red(`🗑️  File deleted: ${filePath}`));
            // TODO: Consider deleting corresponding test file
        })
            .on('ready', async () => {
            initialScanComplete = true;
            console.log(chalk_1.default.blue('\n📊 Initial scan complete:'));
            console.log(chalk_1.default.gray(`   Files scanned: ${scannedFiles}`));
            console.log(chalk_1.default.gray(`   Testable components: ${testableFiles}`));
            console.log();
            if (existingFiles.length > 0) {
                console.log(chalk_1.default.blue(`🧪 Generating tests for ${existingFiles.length} existing components...\n`));
                // Generate tests for existing files
                for (let i = 0; i < existingFiles.length; i++) {
                    const filePath = existingFiles[i];
                    console.log(chalk_1.default.blue(`[${i + 1}/${existingFiles.length}] Processing: ${filePath}`));
                    try {
                        await this.handleFileChange('existing', filePath, projectRoot);
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`❌ Error processing ${filePath}:`), error);
                    }
                }
                console.log(chalk_1.default.green(`\n✅ Initial sync complete! Processed ${existingFiles.length} existing files`));
            }
            else {
                console.log(chalk_1.default.yellow('ℹ️  No existing testable components found'));
            }
            console.log(chalk_1.default.green('\n🎯 FlowSpec watcher is ready and monitoring for changes'));
            console.log(chalk_1.default.gray('   Press Ctrl+C to stop watching\n'));
        })
            .on('error', (error) => {
            console.error(chalk_1.default.red('❌ Watcher error:'), error);
        });
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log(chalk_1.default.blue('\n🛑 Stopping FlowSpec watcher...'));
            await this.stopWatching();
            process.exit(0);
        });
        // Keep process alive
        process.stdin.resume();
    }
    /**
     * Stop the file watcher
     */
    async stopWatching() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
            console.log(chalk_1.default.green('✅ Watcher stopped'));
        }
    }
    /**
     * Handle file system changes
     */
    async handleFileChange(event, filePath, projectRoot) {
        const fullPath = path.resolve(projectRoot, filePath);
        if (!this.isTestableFile(fullPath)) {
            return;
        }
        const eventLabel = event === 'existing' ? 'found' : event;
        console.log(chalk_1.default.blue(`📝 File ${eventLabel}: ${filePath}`));
        // Check if test already exists and is up to date
        const testFilePath = this.getTestFilePath(fullPath);
        const testExists = fs.existsSync(testFilePath);
        if (testExists && event !== 'existing') {
            const componentStat = fs.statSync(fullPath);
            const testStat = fs.statSync(testFilePath);
            if (componentStat.mtime <= testStat.mtime) {
                console.log(chalk_1.default.gray(`   ⏭️  Test is up to date, skipping`));
                return;
            }
            console.log(chalk_1.default.yellow(`   🔄 Test needs update (component is newer)`));
        }
        else if (testExists) {
            console.log(chalk_1.default.yellow(`   🔄 Updating existing test`));
        }
        else {
            console.log(chalk_1.default.green(`   ✨ Creating new test`));
        }
        // Debounce rapid changes (but not for existing files during initial scan)
        const delay = event === 'existing' ? 0 : 1000;
        if (delay > 0) {
            console.log(chalk_1.default.gray(`   ⏱️  Debouncing for ${delay}ms...`));
        }
        setTimeout(async () => {
            try {
                console.log(chalk_1.default.blue(`   🚀 Starting test generation...`));
                await this.generateTests([filePath]);
                console.log(chalk_1.default.green(`   ✅ Test generation complete\n`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`   ❌ Error processing ${filePath}:`), error);
                console.log(); // Add spacing after error
            }
        }, delay);
    }
    /**
     * Generate test for a single component
     */
    async generateTestForComponent(projectId, componentCode, componentPath, existingTestCode) {
        try {
            const requestBody = {
                project_id: projectId,
                component_code: componentCode,
                component_path: componentPath,
                collection_name: `project_${projectId}`
            };
            // Include existing test for incremental updates
            if (existingTestCode) {
                requestBody.existing_test_code = existingTestCode;
                requestBody.update_mode = true;
            }
            console.log(chalk_1.default.gray(`   📡 Sending request to ${this.apiUrl}/generate-test`));
            console.log(chalk_1.default.gray(`   📄 Component: ${componentPath} (${componentCode.length} chars)`));
            const response = await axios_1.default.post(`${this.apiUrl}/generate-test`, requestBody, {
                headers: this.authManager.getAuthHeader(),
                timeout: 120000 // 2 minutes timeout for AI generation
            });
            console.log(chalk_1.default.gray(`   ✅ API Response received`));
            // Debug: Log response details
            if (!response.data.test_code || response.data.test_code.trim().length === 0) {
                console.log(chalk_1.default.yellow(`   ⚠️  Warning: Response has no test_code`));
                console.log(chalk_1.default.gray(`   Response success: ${response.data.success}`));
                console.log(chalk_1.default.gray(`   Response is_passing: ${response.data.is_passing}`));
                console.log(chalk_1.default.gray(`   Response message: ${response.data.message}`));
                if (response.data.error_log) {
                    console.log(chalk_1.default.gray(`   Error log: ${response.data.error_log.substring(0, 200)}`));
                }
            }
            return response.data;
        }
        catch (error) {
            console.log(chalk_1.default.red(`   ❌ API Error: ${error.message}`));
            if (error.response?.status) {
                console.log(chalk_1.default.red(`   📡 HTTP Status: ${error.response.status}`));
            }
            if (error.response?.data) {
                console.log(chalk_1.default.red(`   📄 Response: ${JSON.stringify(error.response.data, null, 2)}`));
            }
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to FlowSpec server. Make sure it\'s running.');
            }
            else {
                throw new Error(`Test generation failed: ${error.message}`);
            }
        }
    }
    /**
     * Check if file is testable (React component)
     */
    isTestableFile(filePath) {
        // Must be TypeScript/JavaScript React file
        if (!/\.(tsx|jsx)$/.test(filePath)) {
            return false;
        }
        const fileName = path.basename(filePath, path.extname(filePath));
        // Skip test files
        if (/\.(test|spec)\.(tsx|jsx)$/.test(filePath)) {
            return false;
        }
        // Next.js App Router special files (always testable)
        const nextJsFiles = ['page', 'layout', 'loading', 'error', 'not-found', 'global-error', 'route', 'template', 'default'];
        if (nextJsFiles.includes(fileName)) {
            return true;
        }
        // Regular React components (must start with capital letter)
        if (/^[A-Z]/.test(fileName)) {
            return true;
        }
        return false;
    }
    /**
     * Get test file path for a component
     */
    getTestFilePath(componentPath) {
        const dir = path.dirname(componentPath);
        const name = path.basename(componentPath, path.extname(componentPath));
        const ext = path.extname(componentPath);
        return path.join(dir, `${name}.test${ext}`);
    }
    /**
     * Execute test locally to verify it works
     */
    async executeTestLocally(testFilePath, projectRoot) {
        try {
            console.log(chalk_1.default.gray(`   🧪 Running test locally...`));
            const { execSync } = require('child_process');
            const relativePath = path.relative(projectRoot, testFilePath);
            // Try to run the specific test file
            execSync(`npx vitest run ${relativePath}`, {
                cwd: projectRoot,
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });
            console.log(chalk_1.default.green(`   ✅ Test passed locally`));
            return true;
        }
        catch (error) {
            console.log(chalk_1.default.yellow(`   ⚠️  Test generated but may need adjustment`));
            return false;
        }
    }
    /**
     * Ensure test directory exists
     */
    ensureTestDirectory(testFilePath) {
        const dir = path.dirname(testFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}
exports.TestGenerator = TestGenerator;
//# sourceMappingURL=generator.js.map