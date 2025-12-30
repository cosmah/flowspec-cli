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
        this.apiUrl = process.env.FLOWSPEC_API_URL || 'https://api.cosmah.me';
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
                if (result.success) {
                    // Save test file
                    this.ensureTestDirectory(testFilePath);
                    fs.writeFileSync(testFilePath, result.test_code);
                    spinner.succeed(`${testExists ? 'Updated' : 'Generated'} test for ${file}`);
                    console.log(chalk_1.default.gray(`   Test file: ${path.relative(projectRoot, testFilePath)}`));
                    console.log(chalk_1.default.gray(`   Status: ${result.is_passing ? 'Passing' : 'Needs attention'}`));
                    console.log(chalk_1.default.gray(`   Attempts: ${result.attempts}`));
                }
                else {
                    spinner.fail(`Failed to ${testExists ? 'update' : 'generate'} test for ${file}`);
                    console.log(chalk_1.default.red(`   Error: ${result.message}`));
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
        if (this.watcher) {
            console.log(chalk_1.default.yellow('⚠️  Watcher is already running'));
            return;
        }
        console.log(chalk_1.default.blue('👀 Starting FlowSpec file watcher...\n'));
        const watchPatterns = [
            'src/**/*.{ts,tsx,js,jsx}',
            'app/**/*.{ts,tsx,js,jsx}', // Next.js App Router
            'components/**/*.{ts,tsx,js,jsx}',
            'lib/**/*.{ts,tsx,js,jsx}',
            'pages/**/*.{ts,tsx,js,jsx}' // Next.js Pages Router
        ];
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
        this.watcher
            .on('add', (filePath) => {
            if (!initialScanComplete) {
                // Collect existing files during initial scan
                if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
                    existingFiles.push(filePath);
                }
            }
            else {
                // Handle new files after initial scan
                this.handleFileChange('added', filePath, projectRoot);
            }
        })
            .on('change', (filePath) => this.handleFileChange('changed', filePath, projectRoot))
            .on('ready', async () => {
            initialScanComplete = true;
            if (existingFiles.length > 0) {
                console.log(chalk_1.default.blue(`🔍 Found ${existingFiles.length} existing components`));
                console.log(chalk_1.default.yellow('📝 Generating tests for existing files...\n'));
                // Generate tests for existing files
                for (const filePath of existingFiles) {
                    try {
                        await this.handleFileChange('existing', filePath, projectRoot);
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`❌ Error processing existing file ${filePath}:`), error);
                    }
                }
                console.log(chalk_1.default.green(`\n✅ Initial sync complete! Processed ${existingFiles.length} existing files`));
            }
            console.log(chalk_1.default.green('✅ FlowSpec watcher is ready and monitoring for changes'));
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
        // Debounce rapid changes (but not for existing files during initial scan)
        const delay = event === 'existing' ? 0 : 1000;
        setTimeout(async () => {
            try {
                await this.generateTests([filePath]);
            }
            catch (error) {
                console.error(chalk_1.default.red(`❌ Error processing ${filePath}:`), error);
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
                component_path: componentPath
            };
            // Include existing test for incremental updates
            if (existingTestCode) {
                requestBody.existing_test_code = existingTestCode;
                requestBody.update_mode = true;
            }
            const response = await axios_1.default.post(`${this.apiUrl}/generate-test`, requestBody, {
                headers: this.authManager.getAuthHeader(),
                timeout: 120000 // 2 minutes timeout for AI generation
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to FlowSpec server. Make sure it\'s running.');
            }
            else {
                throw new Error('Test generation failed. Please try again.');
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
        // Must start with capital letter (component convention)
        const fileName = path.basename(filePath, path.extname(filePath));
        if (!/^[A-Z]/.test(fileName)) {
            return false;
        }
        // Skip test files
        if (/\.(test|spec)\.(tsx|jsx)$/.test(filePath)) {
            return false;
        }
        return true;
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