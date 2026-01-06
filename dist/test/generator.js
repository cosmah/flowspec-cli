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
const cache_1 = require("../utils/cache");
const testDebt_1 = require("../utils/testDebt");
const testExecutor_1 = require("../utils/testExecutor");
const parser_1 = require("../utils/parser");
const testFailureAnalyzer_1 = require("../utils/testFailureAnalyzer");
const errorHandler_1 = require("../utils/errorHandler");
class TestGenerator {
    constructor() {
        this.watcher = null;
        this.cacheManager = null;
        this.testExecutor = null;
        this.silentMode = false;
        this.lastNotification = '';
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
     * Initialize cache manager for a project
     */
    initCache(projectRoot) {
        if (!this.cacheManager) {
            this.cacheManager = new cache_1.CacheManager(projectRoot);
        }
        return this.cacheManager;
    }
    /**
     * Initialize background test executor for a project
     */
    initTestExecutor(projectRoot) {
        if (!this.testExecutor) {
            this.testExecutor = new testExecutor_1.BackgroundTestExecutor(projectRoot);
        }
        return this.testExecutor;
    }
    /**
     * Silent notification (single-line update)
     */
    silentNotify(message) {
        if (!this.silentMode) {
            return;
        }
        // Clear previous line and write new one
        if (this.lastNotification) {
            process.stdout.write('\r' + ' '.repeat(this.lastNotification.length) + '\r');
        }
        process.stdout.write(message);
        this.lastNotification = message;
    }
    /**
     * Clear silent notification
     */
    clearSilentNotification() {
        if (this.lastNotification) {
            process.stdout.write('\r' + ' '.repeat(this.lastNotification.length) + '\r');
            this.lastNotification = '';
        }
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
        // Initialize cache and test executor
        const cache = this.initCache(projectRoot);
        const testExecutor = this.initTestExecutor(projectRoot);
        await this.authManager.ensureAuthenticated();
        if (!this.silentMode) {
            console.log(chalk_1.default.blue(`\nGenerating tests for ${files.length} files...\n`));
        }
        const results = [];
        const startTime = Date.now();
        for (const file of files) {
            const filePath = path.resolve(projectRoot, file);
            if (!fs.existsSync(filePath)) {
                if (!this.silentMode) {
                    console.log(chalk_1.default.red(`File not found: ${file}`));
                }
                continue;
            }
            if (!this.isTestableFile(filePath)) {
                if (!this.silentMode) {
                    console.log(chalk_1.default.yellow(`Skipping non-component file: ${file}`));
                }
                continue;
            }
            // Check cache first
            const componentCode = fs.readFileSync(filePath, 'utf-8');
            const relativePath = path.relative(projectRoot, filePath);
            const cached = cache.getCached(filePath, componentCode);
            // Validate cached test still exists and is valid
            if (cached) {
                const cachedTestFilePath = this.getTestFilePath(filePath);
                // Check if test file still exists
                if (!fs.existsSync(cachedTestFilePath)) {
                    // Test file was deleted - invalidate cache
                    cache.invalidate(filePath);
                }
                else {
                    // Use cached test code
                    this.ensureTestDirectory(cachedTestFilePath);
                    fs.writeFileSync(cachedTestFilePath, cached.testCode, 'utf-8');
                    // Execute test in background to get current status
                    const testResult = await testExecutor.executeTest(cachedTestFilePath);
                    const elapsed = (testResult.duration / 1000).toFixed(1);
                    if (this.silentMode) {
                        const testCount = testResult.testCount || this.countTests(cached.testCode);
                        this.silentNotify(`✨ ${relativePath} updated. Tests: ${testCount} ${testResult.passed ? 'passing' : 'failing'} (${elapsed}s)`);
                    }
                    else {
                        const testCount = testResult.testCount || this.countTests(cached.testCode);
                        console.log(chalk_1.default.green(`✅ ${relativePath} (cached) - ${testCount} tests ${testResult.passed ? 'passing' : 'failing'}`));
                    }
                    results.push({
                        file,
                        result: {
                            success: true,
                            test_code: cached.testCode,
                            is_passing: testResult.passed,
                            attempts: cached.attempts,
                            error_log: '',
                            message: 'Loaded from cache'
                        }
                    });
                    continue;
                }
            }
            // Check if test file already exists
            const testFilePath = this.getTestFilePath(filePath);
            const testExists = fs.existsSync(testFilePath);
            if (testExists) {
                // Check if component was modified after test file
                const componentStat = fs.statSync(filePath);
                const testStat = fs.statSync(testFilePath);
                if (componentStat.mtime <= testStat.mtime) {
                    if (!this.silentMode) {
                        console.log(chalk_1.default.gray(`Skipping ${file} - test is up to date`));
                    }
                    continue;
                }
            }
            const spinner = this.silentMode ? null : (0, ora_1.default)(`${testExists ? 'Updating' : 'Creating'} test for ${file}...`).start();
            try {
                // For existing tests, include current test content for incremental updates
                let existingTestCode = '';
                if (testExists) {
                    existingTestCode = fs.readFileSync(testFilePath, 'utf-8');
                }
                const result = await this.generateTestForComponent(config.projectId, componentCode, relativePath, existingTestCode, projectRoot);
                // Write test file if test_code exists and has content, regardless of passing status
                if (result.test_code && result.test_code.trim().length > 0) {
                    try {
                        // Save test file
                        this.ensureTestDirectory(testFilePath);
                        fs.writeFileSync(testFilePath, result.test_code, 'utf-8');
                        // Cache the result (we'll update is_passing after test execution)
                        cache.setCache(filePath, componentCode, result.test_code, result.is_passing, result.attempts);
                        // Execute test in background (non-blocking)
                        const testExecutionPromise = testExecutor.executeTest(testFilePath);
                        // Don't wait for test execution - update UI immediately
                        if (this.silentMode) {
                            const testCount = this.countTests(result.test_code);
                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            this.silentNotify(`✨ ${relativePath} updated. Tests: ${testCount} generated (${elapsed}s)`);
                            // Update notification when test completes
                            testExecutionPromise.then(async (testResult) => {
                                const finalElapsed = (testResult.duration / 1000).toFixed(1);
                                const finalTestCount = testResult.testCount || testCount;
                                if (testResult.passed) {
                                    this.silentNotify(`✨ ${relativePath} updated. Tests: ${finalTestCount} passing (${finalElapsed}s)`);
                                    cache.setCache(filePath, componentCode, result.test_code, true, result.attempts);
                                }
                                else {
                                    // Analyze failure - is it our fault or theirs?
                                    const analyzer = new testFailureAnalyzer_1.TestFailureAnalyzer();
                                    const analysis = analyzer.analyzeFailure(testResult.error || '', '');
                                    if (analysis.isOurFault) {
                                        // Our fault - auto-heal silently
                                        this.silentNotify(`🔧 ${relativePath} - Auto-healing test syntax...`);
                                        this.triggerAutoHeal(config.projectId, componentCode, relativePath, result.test_code, testResult.error || '');
                                    }
                                    else {
                                        // Check if it's a missing dependency error - auto-install
                                        if (this.isMissingDependencyError(testResult.error || '')) {
                                            this.silentNotify(`📦 ${relativePath} - Installing missing dependencies...`);
                                            await this.ensureDependencies(projectRoot);
                                            // Retry test execution after installing dependencies
                                            const retryResult = await testExecutor.executeTest(testFilePath);
                                            if (retryResult.passed) {
                                                this.silentNotify(`✅ ${relativePath} - Dependencies installed, tests passing`);
                                                cache.setCache(filePath, componentCode, result.test_code, true, result.attempts);
                                            }
                                            else {
                                                // Still failing - show to user
                                                this.silentNotify(`⚠️  ${relativePath} - ${finalTestCount} tests failing (component issue)`);
                                                this.showComponentFailure(relativePath, analysis, finalTestCount);
                                            }
                                        }
                                        else {
                                            // Their fault - show to user
                                            this.silentNotify(`⚠️  ${relativePath} - ${finalTestCount} tests failing (component issue)`);
                                            this.showComponentFailure(relativePath, analysis, finalTestCount);
                                        }
                                    }
                                }
                            }).catch(() => {
                                // Silently handle errors
                            });
                        }
                        else {
                            spinner?.succeed(`${testExists ? 'Updated' : 'Generated'} test for ${file}`);
                            console.log(chalk_1.default.gray(`   Test file: ${path.relative(projectRoot, testFilePath)}`));
                            console.log(chalk_1.default.gray(`   Status: Generated (running in background...)`));
                            console.log(chalk_1.default.gray(`   Attempts: ${result.attempts}`));
                            // Update status when test completes
                            testExecutionPromise.then(async (testResult) => {
                                const testCount = testResult.testCount || this.countTests(result.test_code);
                                if (testResult.passed) {
                                    console.log(chalk_1.default.green(`   ✅ Test execution complete: ${testCount} tests passing`));
                                    cache.setCache(filePath, componentCode, result.test_code, true, result.attempts);
                                }
                                else {
                                    // Analyze failure
                                    const analyzer = new testFailureAnalyzer_1.TestFailureAnalyzer();
                                    const analysis = analyzer.analyzeFailure(testResult.error || '', '');
                                    if (analysis.isOurFault) {
                                        // Our fault - auto-heal
                                        console.log(chalk_1.default.yellow(`   🔧 Auto-healing test syntax/import issues...`));
                                        this.triggerAutoHeal(config.projectId, componentCode, relativePath, result.test_code, testResult.error || '');
                                    }
                                    else {
                                        // Check if it's a missing dependency error - auto-install
                                        if (this.isMissingDependencyError(testResult.error || '')) {
                                            console.log(chalk_1.default.blue(`   📦 Missing dependencies detected, installing...`));
                                            await this.ensureDependencies(projectRoot);
                                            // Retry test execution after installing dependencies
                                            const retryResult = await testExecutor.executeTest(testFilePath);
                                            if (retryResult.passed) {
                                                console.log(chalk_1.default.green(`   ✅ Dependencies installed, tests now passing`));
                                                cache.setCache(filePath, componentCode, result.test_code, true, result.attempts);
                                            }
                                            else {
                                                // Still failing - show details
                                                console.log(chalk_1.default.red(`   ❌ Test execution complete: ${testCount} tests failing (component issue)`));
                                                this.showComponentFailure(relativePath, analysis, testCount);
                                            }
                                        }
                                        else {
                                            // Their fault - show details
                                            console.log(chalk_1.default.red(`   ❌ Test execution complete: ${testCount} tests failing (component issue)`));
                                            this.showComponentFailure(relativePath, analysis, testCount);
                                        }
                                    }
                                }
                            }).catch(() => {
                                // Silently handle errors
                            });
                        }
                        result.success = true;
                    }
                    catch (writeError) {
                        spinner?.fail(`Failed to write test file for ${file}`);
                        if (!this.silentMode) {
                            console.log(chalk_1.default.red(`   Write error: ${writeError.message}`));
                        }
                        result.success = false;
                        result.message = `File write failed: ${writeError.message}`;
                    }
                }
                else {
                    spinner?.fail(`Failed to ${testExists ? 'update' : 'generate'} test for ${file}`);
                    if (!this.silentMode) {
                        console.log(chalk_1.default.red(`   Error: ${result.message || 'No test code generated'}`));
                        if (result.error_log) {
                            console.log(chalk_1.default.gray(`   Details: ${result.error_log}`));
                        }
                    }
                }
                results.push({ file, result });
            }
            catch (error) {
                spinner?.fail(`Error processing ${file}`);
                if (!this.silentMode) {
                    console.log(chalk_1.default.red(`   ${error.message}`));
                }
            }
        }
        if (this.silentMode) {
            this.clearSilentNotification();
        }
        else {
            // Summary
            const successful = results.filter(r => r.result.success).length;
            const failed = results.length - successful;
            console.log(chalk_1.default.blue('\nGeneration Summary:'));
            console.log(chalk_1.default.green(`   Successful: ${successful}`));
            if (failed > 0) {
                console.log(chalk_1.default.red(`   Failed: ${failed}`));
            }
        }
        if (options.watch) {
            if (!this.silentMode) {
                console.log(chalk_1.default.blue('\nStarting watch mode...'));
            }
            await this.startWatching(projectRoot);
        }
    }
    /**
     * Count number of test cases in test code
     */
    countTests(testCode) {
        const itMatches = testCode.match(/\b(it|test)\s*\(/g);
        return itMatches ? itMatches.length : 0;
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
        // Enable silent mode for watch
        this.silentMode = true;
        // Initialize cache and test executor
        this.initCache(projectRoot);
        this.initTestExecutor(projectRoot);
        if (this.watcher) {
            console.log(chalk_1.default.yellow('⚠️  Watcher is already running'));
            return;
        }
        console.log(chalk_1.default.blue('👀 Starting FlowSpec file watcher...\n'));
        console.log(chalk_1.default.gray(`📁 Project: ${config.name}`));
        console.log(chalk_1.default.gray(`🔗 API: ${this.apiUrl}`));
        console.log(chalk_1.default.gray(`📂 Root: ${projectRoot}\n`));
        // Show test debt
        try {
            const debtCounter = new testDebt_1.TestDebtCounter(projectRoot);
            const debtReport = await debtCounter.calculateTestDebt();
            console.log(chalk_1.default.yellow(debtCounter.formatReport(debtReport)));
            console.log();
        }
        catch (error) {
            // Silently fail - test debt is optional
        }
        // Ensure dependencies are installed before starting
        try {
            await this.ensureDependencies(projectRoot);
        }
        catch (error) {
            console.log(chalk_1.default.yellow('⚠️  Could not verify dependencies, continuing anyway...'));
        }
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
            ignoreInitial: false, // Changed to false to process existing files
            awaitWriteFinish: {
                stabilityThreshold: 300, // Wait 300ms after file stops changing
                pollInterval: 100 // Check every 100ms
            },
            usePolling: false, // Use native events (faster, but can enable polling if needed)
            interval: 1000, // Polling interval if usePolling is true
            binaryInterval: 1000
        });
        let initialScanComplete = false;
        const existingFiles = [];
        let scannedFiles = 0;
        let testableFiles = 0;
        this.watcher
            .on('add', (filePath) => {
            scannedFiles++;
            if (!initialScanComplete) {
                // Collect existing files during initial scan (silent)
                if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                    existingFiles.push(filePath);
                    testableFiles++;
                }
            }
            else {
                // Handle new files after initial scan
                if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                    this.handleFileChange('added', filePath, projectRoot);
                }
            }
        })
            .on('change', (filePath) => {
            if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                this.handleFileChange('changed', filePath, projectRoot);
            }
        })
            .on('unlink', (filePath) => {
            // Silently handle deletions
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
                    try {
                        await this.handleFileChange('existing', filePath, projectRoot);
                    }
                    catch (error) {
                        // Silently continue on error
                    }
                }
                this.clearSilentNotification();
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
        const shutdown = async (signal) => {
            console.log(chalk_1.default.blue(`\n🛑 Stopping FlowSpec watcher (${signal})...`));
            // Cancel all pending test executions
            if (this.testExecutor) {
                this.testExecutor.cancelAll();
                // Wait briefly for any ongoing executions
                await this.testExecutor.waitForAll();
            }
            // Stop the file watcher
            await this.stopWatching();
            process.exit(0);
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGUSR1', () => shutdown('SIGUSR1'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2'));
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
        // Check if test already exists and is up to date
        const testFilePath = this.getTestFilePath(fullPath);
        const testExists = fs.existsSync(testFilePath);
        if (testExists && event !== 'existing') {
            const componentStat = fs.statSync(fullPath);
            const testStat = fs.statSync(testFilePath);
            if (componentStat.mtime <= testStat.mtime) {
                // Test is up to date, skip silently
                return;
            }
        }
        // Debounce rapid changes (but not for existing files during initial scan)
        // Reduced delay since awaitWriteFinish already handles file stability
        const delay = event === 'existing' ? 0 : 200;
        setTimeout(async () => {
            try {
                await this.generateTests([filePath], {});
            }
            catch (error) {
                // Silently continue on error in watch mode
                if (!this.silentMode) {
                    console.error(chalk_1.default.red(`   ❌ Error processing ${filePath}:`), error);
                }
            }
        }, delay);
    }
    /**
     * Generate test for a single component
     */
    async generateTestForComponent(projectId, componentCode, componentPath, existingTestCode, projectRoot) {
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
            // Add design system and data archetype context if available
            if (projectRoot) {
                try {
                    const parser = new parser_1.CodeParser(projectRoot);
                    const archetypes = await parser.detectDataArchetypes();
                    if (archetypes.designSystem) {
                        requestBody.design_system = archetypes.designSystem;
                    }
                    if (archetypes.factories.length > 0) {
                        requestBody.factories = archetypes.factories.map(f => path.relative(projectRoot, f));
                    }
                    if (archetypes.mocks.length > 0) {
                        requestBody.mocks = archetypes.mocks.map(m => path.relative(projectRoot, m));
                    }
                    if (archetypes.testData.length > 0) {
                        requestBody.testData = archetypes.testData.map(t => path.relative(projectRoot, t));
                    }
                }
                catch (error) {
                    // Silently fail - archetype detection is optional
                }
            }
            if (!this.silentMode) {
                console.log(chalk_1.default.gray(`   📡 Sending request to ${this.apiUrl}/generate-test`));
                console.log(chalk_1.default.gray(`   📄 Component: ${componentPath} (${componentCode.length} chars)`));
            }
            const response = await axios_1.default.post(`${this.apiUrl}/generate-test`, requestBody, {
                headers: this.authManager.getAuthHeader(),
                timeout: 120000 // 2 minutes timeout for AI generation
            });
            if (!this.silentMode) {
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
            }
            return response.data;
        }
        catch (error) {
            // Use centralized error handling
            errorHandler_1.ErrorHandler.handleBrainServerError(error, () => {
                if (!this.silentMode) {
                    console.log(chalk_1.default.yellow('   ⚠️  Falling back to cached test if available...'));
                }
            });
            // Re-throw with context
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Check if file is testable (React component, hook, or utility)
     */
    isTestableFile(filePath) {
        // Must be TypeScript/JavaScript file
        if (!/\.(tsx|jsx|ts|js)$/.test(filePath)) {
            return false;
        }
        const fileName = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);
        // Skip test files
        if (/\.(test|spec)\.(tsx|jsx|ts|js)$/.test(filePath)) {
            return false;
        }
        // Skip config files and other non-testable files
        const skipPatterns = [
            /^\./, // Hidden files
            /config\.(ts|js)$/i, // Config files
            /\.d\.ts$/, // Type definition files
            /\.stories\.(tsx|jsx|ts|js)$/i, // Storybook files
            /\.mock\.(tsx|jsx|ts|js)$/i, // Mock files (they're test data, not testable code)
            /setupTests\.(ts|js)$/i, // Test setup files
            /vitest\.config\.(ts|js)$/i, // Vitest config
            /jest\.config\.(ts|js)$/i, // Jest config
        ];
        for (const pattern of skipPatterns) {
            if (pattern.test(filePath)) {
                return false;
            }
        }
        // React components (.tsx, .jsx) - must start with capital letter or be Next.js special files
        if (/\.(tsx|jsx)$/.test(filePath)) {
            // Next.js App Router special files (always testable)
            const nextJsFiles = ['page', 'layout', 'loading', 'error', 'not-found', 'global-error', 'route', 'template', 'default'];
            if (nextJsFiles.includes(fileName)) {
                return true;
            }
            // Regular React components (must start with capital letter)
            if (/^[A-Z]/.test(fileName)) {
                return true;
            }
        }
        // Custom hooks (.ts, .js) - files starting with "use" (React hooks convention)
        if (/\.(ts|js)$/.test(filePath) && /^use[A-Z]/.test(fileName)) {
            return true;
        }
        // Utility functions (.ts, .js) - files in lib/, utils/, helpers/, hooks/ directories
        // that export functions (not just types)
        if (/\.(ts|js)$/.test(filePath)) {
            const dir = path.dirname(filePath);
            const dirName = path.basename(dir);
            // Check if file is in a utility/hook directory
            const utilityDirs = ['lib', 'utils', 'helpers', 'hooks', 'utilities', 'helpers'];
            if (utilityDirs.includes(dirName) || dir.includes('/lib/') || dir.includes('/utils/') || dir.includes('/helpers/') || dir.includes('/hooks/')) {
                // Check if file exports functions (not just types)
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    // Look for function exports (not just type/interface exports)
                    const hasFunctionExports = /export\s+(?:const|function|async\s+function)\s+\w+|export\s*\{[^}]*\w+[^}]*\}/.test(content);
                    // Exclude files that only export types/interfaces
                    const onlyTypes = /^[\s\n]*\/\/.*\n|^[\s\n]*import.*\n|^[\s\n]*(export\s+)?(type|interface|enum)\s+\w+[\s\S]*$/.test(content.trim());
                    if (hasFunctionExports && !onlyTypes) {
                        return true;
                    }
                }
                catch (error) {
                    // If we can't read the file, skip it
                    return false;
                }
            }
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
            const { execSync } = require('child_process');
            const relativePath = path.relative(projectRoot, testFilePath);
            // Try to run the specific test file
            execSync(`npx vitest run ${relativePath}`, {
                cwd: projectRoot,
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });
            return true;
        }
        catch (error) {
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
    /**
     * Trigger auto-healing for test syntax/import issues (our fault)
     */
    async triggerAutoHeal(projectId, componentCode, componentPath, existingTestCode, errorLog) {
        try {
            // Check server health first
            const isHealthy = await errorHandler_1.ErrorHandler.checkBrainServerHealth(this.apiUrl);
            if (!isHealthy) {
                if (!this.silentMode) {
                    console.log(chalk_1.default.yellow(`   ⚠️  Cannot auto-heal: server unavailable`));
                }
                return;
            }
            // Call brain server with error log to trigger healer node
            const response = await errorHandler_1.ErrorHandler.withRetry(() => axios_1.default.post(`${this.apiUrl}/generate-test`, {
                project_id: projectId,
                component_code: componentCode,
                component_path: componentPath,
                existing_test_code: existingTestCode,
                update_mode: true,
                collection_name: `project_${projectId}`,
                error_log: errorLog,
                auto_heal: true
            }, {
                headers: this.authManager.getAuthHeader(),
                timeout: 120000
            }), {
                maxRetries: 2, // Fewer retries for auto-heal
                retryDelay: 1000
            }, 'Auto-healing');
            if (response.data.test_code && response.data.test_code.trim()) {
                // Write healed test
                const projectRoot = process.cwd();
                const testFilePath = this.getTestFilePath(path.resolve(projectRoot, componentPath));
                this.ensureTestDirectory(testFilePath);
                fs.writeFileSync(testFilePath, response.data.test_code, 'utf-8');
                // Re-run test to verify healing worked
                if (this.testExecutor) {
                    const testResult = await this.testExecutor.executeTest(testFilePath);
                    if (testResult.passed) {
                        if (this.silentMode) {
                            this.silentNotify(`✅ ${componentPath} - Auto-healed and passing`);
                        }
                        else {
                            console.log(chalk_1.default.green(`   ✅ Auto-healed successfully - tests now passing`));
                        }
                        // Update cache with healed test
                        const cache = this.cacheManager;
                        if (cache) {
                            cache.setCache(testFilePath, componentCode, response.data.test_code, true, response.data.attempts || 1);
                        }
                    }
                    else {
                        // Healing didn't work - might need another attempt
                        if (!this.silentMode) {
                            console.log(chalk_1.default.yellow(`   ⚠️  Auto-healing attempted but test still failing`));
                            console.log(chalk_1.default.gray(`   You may need to fix the test manually`));
                        }
                    }
                }
            }
            else {
                if (!this.silentMode) {
                    console.log(chalk_1.default.yellow(`   ⚠️  Auto-healing did not return test code`));
                }
            }
        }
        catch (error) {
            // Log error but don't crash
            if (!this.silentMode) {
                errorHandler_1.ErrorHandler.handleBrainServerError(error);
                console.log(chalk_1.default.yellow(`   ⚠️  Auto-healing failed - test may need manual fixes`));
            }
        }
    }
    /**
     * Check if error is a missing dependency error
     */
    isMissingDependencyError(error) {
        if (!error)
            return false;
        const dependencyPatterns = [
            /Cannot find module ['"]@vitejs/,
            /Cannot find module ['"]vitest/,
            /Cannot find module ['"]@testing-library/,
            /Cannot find module ['"]vite/,
            /Module not found.*@vitejs/,
            /Module not found.*vitest/,
            /Module not found.*@testing-library/,
            /Failed to resolve.*@vitejs/,
            /Failed to resolve.*vitest/
        ];
        return dependencyPatterns.some(pattern => pattern.test(error));
    }
    /**
     * Ensure all required dependencies are installed
     */
    async ensureDependencies(projectRoot) {
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return; // No package.json, can't install dependencies
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            // Required dependencies
            const requiredDeps = [
                'vitest',
                '@vitejs/plugin-react',
                'vite',
                '@testing-library/react',
                '@testing-library/jest-dom',
                'jsdom'
            ];
            // Check which ones are missing
            const missingDeps = requiredDeps.filter(dep => {
                const inPackageJson = dependencies[dep];
                const nodeModulesPath = path.join(projectRoot, 'node_modules', dep);
                return !inPackageJson || !fs.existsSync(nodeModulesPath);
            });
            if (missingDeps.length === 0) {
                return; // All dependencies are installed
            }
            // Install missing dependencies
            const { execSync } = require('child_process');
            const hasYarnLock = fs.existsSync(path.join(projectRoot, 'yarn.lock'));
            const hasPnpmLock = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
            let installCmd;
            const deps = missingDeps.join(' ');
            if (hasPnpmLock) {
                installCmd = `pnpm add -D ${deps}`;
            }
            else if (hasYarnLock) {
                installCmd = `yarn add -D ${deps}`;
            }
            else {
                installCmd = `npm install -D ${deps}`;
            }
            if (!this.silentMode) {
                console.log(chalk_1.default.blue(`   📦 Installing missing dependencies: ${missingDeps.join(', ')}`));
            }
            execSync(installCmd, {
                cwd: projectRoot,
                stdio: this.silentMode ? 'pipe' : 'inherit'
            });
            if (!this.silentMode) {
                console.log(chalk_1.default.green(`   ✅ Dependencies installed successfully`));
            }
        }
        catch (error) {
            // Silently fail - dependencies might already be installing or there might be permission issues
            // This prevents blocking the workflow
            if (!this.silentMode) {
                console.log(chalk_1.default.yellow(`   ⚠️  Could not auto-install dependencies, please run: npm install`));
            }
        }
    }
    /**
     * Show component failure details to user (their fault)
     */
    showComponentFailure(componentPath, analysis, testCount) {
        console.log(chalk_1.default.red(`\n   ❌ ${componentPath} - ${testCount} test(s) failing`));
        if (analysis.affectedTests.length > 0) {
            console.log(chalk_1.default.yellow(`   Failed tests:`));
            analysis.affectedTests.forEach((testName) => {
                console.log(chalk_1.default.gray(`     • ${testName}`));
            });
        }
        if (analysis.errorMessage) {
            console.log(chalk_1.default.yellow(`   Error: ${analysis.errorMessage}`));
        }
        if (analysis.suggestions.length > 0) {
            console.log(chalk_1.default.blue(`   💡 Suggestions:`));
            analysis.suggestions.forEach((suggestion) => {
                console.log(chalk_1.default.gray(`     • ${suggestion}`));
            });
        }
        console.log(); // Add spacing
    }
}
exports.TestGenerator = TestGenerator;
//# sourceMappingURL=generator.js.map