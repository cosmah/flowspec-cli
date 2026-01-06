"use strict";
/**
 * FlowSpec CLI - Project Manager
 * Handles project initialization, codebase embedding, and dashboard integration
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
exports.ProjectManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const open_1 = __importDefault(require("open"));
const glob_1 = require("glob");
const manager_1 = require("../auth/manager");
const parser_1 = require("../utils/parser");
const testDebt_1 = require("../utils/testDebt");
class ProjectManager {
    constructor() {
        this.authManager = new manager_1.AuthManager();
        // CodeParser will be initialized with project root when needed
        this.codeParser = new parser_1.CodeParser(process.cwd());
        // Check for API URL in environment variable first
        // Then check existing project config if available
        let apiUrl = process.env.FLOWSPEC_API_URL;
        if (!apiUrl) {
            // Try to get API URL from existing project config
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
     * Initialize FlowSpec in a project
     */
    async initProject(projectRoot, options = {}) {
        // Ensure user is authenticated
        const credentials = await this.authManager.ensureAuthenticated();
        // Read package.json to get project info
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('No package.json found. Please run this command in a Node.js project.');
        }
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const projectName = options.name || packageJson.name || path.basename(projectRoot);
        const framework = options.framework || this.detectFramework(packageJson) || 'react';
        const spinner = (0, ora_1.default)('Creating project...').start();
        try {
            // Create project on server
            const response = await axios_1.default.post(`${this.apiUrl}/projects`, {
                name: projectName,
                description: packageJson.description || '',
                framework,
                package_json: packageJson
            }, {
                headers: this.authManager.getAuthHeader(),
                timeout: 30000 // 30 second timeout
            });
            const project = response.data;
            // Create .flowspec directory
            const flowspecDir = path.join(projectRoot, '.flowspec');
            if (!fs.existsSync(flowspecDir)) {
                fs.mkdirSync(flowspecDir, { recursive: true });
            }
            // Save project config
            const projectConfig = {
                projectId: project.id,
                userId: credentials.userId,
                name: projectName,
                framework,
                apiUrl: this.apiUrl
            };
            fs.writeFileSync(path.join(flowspecDir, 'config.json'), JSON.stringify(projectConfig, null, 2));
            // Add to .gitignore
            this.updateGitignore(projectRoot);
            // Install Vitest if not present
            await this.ensureVitest(projectRoot, packageJson);
            spinner.succeed(`Project "${projectName}" initialized successfully!`);
            console.log(chalk_1.default.green('\n✅ FlowSpec is ready!'));
            console.log(chalk_1.default.gray(`   Project ID: ${project.id}`));
            console.log(chalk_1.default.gray(`   Framework: ${framework}`));
        }
        catch (error) {
            spinner.fail('Project initialization failed');
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else {
                throw new Error('Failed to initialize project. Please try again.');
            }
        }
    }
    /**
     * Embed the codebase for AI context
     */
    async embedCodebase(projectRoot) {
        const config = this.getProjectConfig(projectRoot);
        if (!config) {
            throw new Error('Project not initialized. Run "flowspec init" first.');
        }
        const spinner = (0, ora_1.default)('Analyzing codebase...').start();
        try {
            // Find all relevant files
            const patterns = [
                'src/**/*.{ts,tsx,js,jsx}',
                'components/**/*.{ts,tsx,js,jsx}',
                'lib/**/*.{ts,tsx,js,jsx}',
                'utils/**/*.{ts,tsx,js,jsx}'
            ];
            const files = [];
            for (const pattern of patterns) {
                const matches = await (0, glob_1.glob)(pattern, {
                    cwd: projectRoot,
                    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
                });
                files.push(...matches.map(f => path.join(projectRoot, f)));
            }
            spinner.text = `Processing ${files.length} files...`;
            // Reinitialize parser with project root
            this.codeParser = new parser_1.CodeParser(projectRoot);
            // Parse files and create chunks
            const fileChunks = [];
            for (const filePath of files) {
                try {
                    const chunks = await this.codeParser.parseFile(filePath);
                    if (chunks.length > 0) {
                        fileChunks.push({
                            filePath: path.relative(projectRoot, filePath),
                            chunks
                        });
                    }
                }
                catch (error) {
                    console.warn(chalk_1.default.yellow(`⚠️  Skipped ${filePath}: ${error}`));
                }
            }
            spinner.text = 'Uploading to AI context...';
            // Use API URL from config if available, otherwise use instance default
            const apiUrl = config.apiUrl || this.apiUrl;
            // Upload to server
            await axios_1.default.post(`${apiUrl}/embed-files`, {
                files: fileChunks,
                collection_name: `project_${config.projectId}`
            }, {
                headers: this.authManager.getAuthHeader(),
                timeout: 300000 // 5 minutes timeout for embedding
            });
            spinner.succeed(`Embedded ${fileChunks.length} files successfully!`);
            console.log(chalk_1.default.green('\n🧠 Codebase is now available to AI'));
            console.log(chalk_1.default.gray(`   Files processed: ${fileChunks.length}`));
            console.log(chalk_1.default.gray(`   Total chunks: ${fileChunks.reduce((sum, f) => sum + f.chunks.length, 0)}`));
        }
        catch (error) {
            spinner.fail('Embedding failed');
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else {
                throw new Error('Failed to embed codebase. Please try again.');
            }
        }
    }
    /**
     * Show project status
     */
    async showStatus(projectRoot) {
        const config = this.getProjectConfig(projectRoot);
        const credentials = this.authManager.getCredentials();
        console.log(chalk_1.default.blue('\n📊 FlowSpec Status\n'));
        if (!credentials) {
            console.log(chalk_1.default.red('❌ Not logged in'));
            console.log(chalk_1.default.yellow('   Run: flowspec login'));
            return;
        }
        console.log(chalk_1.default.green('✅ Authentication'));
        console.log(chalk_1.default.gray(`   User: ${credentials.name} (${credentials.email})`));
        console.log(chalk_1.default.gray(`   Plan: ${credentials.plan}`));
        if (!config) {
            console.log(chalk_1.default.red('\n❌ Project not initialized'));
            console.log(chalk_1.default.yellow('   Run: flowspec init'));
            return;
        }
        console.log(chalk_1.default.green('\n✅ Project Configuration'));
        console.log(chalk_1.default.gray(`   Name: ${config.name}`));
        console.log(chalk_1.default.gray(`   Framework: ${config.framework}`));
        console.log(chalk_1.default.gray(`   Project ID: ${config.projectId}`));
        // Show test debt
        try {
            const debtCounter = new testDebt_1.TestDebtCounter(projectRoot);
            const debtReport = await debtCounter.calculateTestDebt();
            console.log(chalk_1.default.blue('\n📈 Test Coverage'));
            console.log(debtCounter.formatReport(debtReport));
        }
        catch (error) {
            // Silently fail - test debt is optional
        }
        // Use API URL from config if available, otherwise use instance default
        const apiUrl = config.apiUrl || this.apiUrl;
        // Check server connection
        try {
            const spinner = (0, ora_1.default)('Checking server connection...').start();
            const response = await axios_1.default.get(`${apiUrl}/projects/${config.projectId}`, {
                headers: this.authManager.getAuthHeader(),
                timeout: 5000 // 5 second timeout
            });
            const project = response.data;
            spinner.stop();
            console.log(chalk_1.default.green('\n✅ Server Connection'));
            console.log(chalk_1.default.gray(`   Tests Generated: ${project.test_count || 0}`));
            console.log(chalk_1.default.gray(`   Coverage: ${project.coverage_percentage?.toFixed(1) || 0}%`));
            console.log(chalk_1.default.gray(`   Last Updated: ${new Date(project.updated_at).toLocaleDateString()}`));
        }
        catch (error) {
            console.log(chalk_1.default.red('\n❌ Server Connection Failed'));
            console.log(chalk_1.default.yellow('   Make sure the Brain Server is running'));
        }
    }
    /**
     * Open the web dashboard
     */
    async openDashboard() {
        const config = this.getProjectConfig(process.cwd());
        if (!config) {
            throw new Error('Project not initialized. Run "flowspec init" first.');
        }
        const dashboardUrl = `https://dashboard.cosmah.me/projects/${config.projectId}`;
        console.log(chalk_1.default.blue(`🌐 Opening dashboard: ${dashboardUrl}`));
        await (0, open_1.default)(dashboardUrl);
    }
    /**
     * Get project configuration
     */
    getProjectConfig(projectRoot) {
        const configPath = path.join(projectRoot, '.flowspec', 'config.json');
        if (!fs.existsSync(configPath)) {
            return null;
        }
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Detect framework from package.json
     */
    detectFramework(packageJson) {
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (dependencies.react)
            return 'react';
        if (dependencies.vue)
            return 'vue';
        if (dependencies.svelte)
            return 'svelte';
        return 'react'; // default
    }
    /**
     * Update .gitignore to exclude FlowSpec files
     */
    updateGitignore(projectRoot) {
        const gitignorePath = path.join(projectRoot, '.gitignore');
        const gitignoreEntry = '\n# FlowSpec\n.flowspec/\n';
        if (fs.existsSync(gitignorePath)) {
            const content = fs.readFileSync(gitignorePath, 'utf-8');
            if (!content.includes('.flowspec/')) {
                fs.appendFileSync(gitignorePath, gitignoreEntry);
            }
        }
        else {
            fs.writeFileSync(gitignorePath, gitignoreEntry);
        }
    }
    /**
     * Check if a package is actually installed in node_modules
     */
    isPackageInstalled(projectRoot, packageName) {
        const nodeModulesPath = path.join(projectRoot, 'node_modules', packageName);
        return fs.existsSync(nodeModulesPath);
    }
    /**
     * Ensure Vitest is installed (checks both package.json and node_modules)
     */
    async ensureVitest(projectRoot, packageJson) {
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        // Required dependencies for FlowSpec
        const requiredDeps = {
            'vitest': 'vitest',
            '@vitejs/plugin-react': '@vitejs/plugin-react',
            'vite': 'vite',
            '@testing-library/react': '@testing-library/react',
            '@testing-library/jest-dom': '@testing-library/jest-dom',
            'jsdom': 'jsdom'
        };
        // Check both package.json and actual installation
        const missingDeps = [];
        for (const [key, packageName] of Object.entries(requiredDeps)) {
            const inPackageJson = dependencies[key] || dependencies[packageName];
            const installed = this.isPackageInstalled(projectRoot, packageName);
            if (!inPackageJson || !installed) {
                missingDeps.push(packageName);
            }
        }
        const needsInstall = missingDeps.length > 0;
        if (needsInstall) {
            console.log(chalk_1.default.yellow('\n⚠️  Vitest dependencies not found. Installing required dependencies...'));
            const spinner = (0, ora_1.default)('Installing Vitest and testing dependencies...').start();
            try {
                const { execSync } = require('child_process');
                // Detect package manager
                const hasYarnLock = fs.existsSync(path.join(projectRoot, 'yarn.lock'));
                const hasPnpmLock = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
                let installCmd;
                // Install all required dependencies (only missing ones to speed up installation)
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
                execSync(installCmd, {
                    cwd: projectRoot,
                    stdio: 'pipe'
                });
                spinner.succeed('Testing dependencies installed successfully!');
                // Ensure test script exists in package.json
                await this.ensureTestScript(projectRoot);
                // Create basic vitest config if it doesn't exist
                const vitestConfigPath = path.join(projectRoot, 'vitest.config.ts');
                if (!fs.existsSync(vitestConfigPath)) {
                    const vitestConfig = `/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})`;
                    fs.writeFileSync(vitestConfigPath, vitestConfig);
                    // Create test setup file
                    const testDir = path.join(projectRoot, 'src', 'test');
                    if (!fs.existsSync(testDir)) {
                        fs.mkdirSync(testDir, { recursive: true });
                    }
                    const setupContent = `import '@testing-library/jest-dom'`;
                    fs.writeFileSync(path.join(testDir, 'setup.ts'), setupContent);
                    // Update tsconfig.json to include Vitest types
                    await this.ensureVitestTypes(projectRoot);
                    console.log(chalk_1.default.green('✅ Created vitest.config.ts and test setup'));
                }
            }
            catch (error) {
                spinner.fail('Failed to install dependencies');
                // Try to show the actual error if available
                const errorMsg = error?.message || error?.stderr || String(error);
                console.log(chalk_1.default.red(`\n❌ Installation error: ${errorMsg}`));
                console.log(chalk_1.default.yellow('\n💡 FlowSpec will automatically retry dependency installation when needed.'));
                console.log(chalk_1.default.yellow('   If this persists, please run:'));
                // Re-detect package manager for error message
                const hasYarnLock = fs.existsSync(path.join(projectRoot, 'yarn.lock'));
                const hasPnpmLock = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
                const installCmd = hasPnpmLock
                    ? `pnpm install`
                    : hasYarnLock
                        ? `yarn install`
                        : `npm install`;
                console.log(chalk_1.default.cyan(`   ${installCmd}`));
                // Don't throw - allow init to complete even if dependencies fail to install
                // They can be installed later or we'll retry during test generation
            }
        }
        else {
            console.log(chalk_1.default.green('✅ Vitest dependencies found'));
            // Ensure test script exists even if dependencies are already installed
            await this.ensureTestScript(projectRoot);
            // Ensure tsconfig.json has Vitest types even if Vitest was already installed
            await this.ensureVitestTypes(projectRoot);
        }
    }
    /**
     * Ensure test script exists in package.json
     */
    async ensureTestScript(projectRoot) {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return;
        }
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }
            // Add test script if it doesn't exist or is different
            if (!packageJson.scripts.test || packageJson.scripts.test !== 'vitest') {
                packageJson.scripts.test = 'vitest';
                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log(chalk_1.default.green('✅ Added "test": "vitest" script to package.json'));
            }
        }
        catch (error) {
            // Silently fail if package.json is invalid
        }
    }
    /**
     * Ensure tsconfig.json includes Vitest types
     */
    async ensureVitestTypes(projectRoot) {
        const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) {
            // Create a basic tsconfig.json with Vitest types
            const tsconfig = {
                compilerOptions: {
                    target: 'ES2020',
                    useDefineForClassFields: true,
                    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                    module: 'ESNext',
                    skipLibCheck: true,
                    moduleResolution: 'bundler',
                    allowImportingTsExtensions: true,
                    resolveJsonModule: true,
                    isolatedModules: true,
                    noEmit: true,
                    jsx: 'react-jsx',
                    strict: true,
                    noUnusedLocals: true,
                    noUnusedParameters: true,
                    noFallthroughCasesInSwitch: true,
                    types: ['vitest/globals', '@testing-library/jest-dom']
                },
                include: ['src'],
                references: [{ path: './tsconfig.node.json' }]
            };
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
            return;
        }
        try {
            const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
            const tsconfig = JSON.parse(tsconfigContent);
            // Ensure compilerOptions exists
            if (!tsconfig.compilerOptions) {
                tsconfig.compilerOptions = {};
            }
            // Ensure types array exists and includes Vitest
            if (!tsconfig.compilerOptions.types) {
                tsconfig.compilerOptions.types = [];
            }
            const types = tsconfig.compilerOptions.types;
            if (!Array.isArray(types)) {
                tsconfig.compilerOptions.types = [types].filter(Boolean);
            }
            // Add Vitest types if not present
            if (!types.includes('vitest/globals')) {
                types.push('vitest/globals');
            }
            if (!types.includes('@testing-library/jest-dom')) {
                types.push('@testing-library/jest-dom');
            }
            // Write back the updated config
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
        }
        catch (error) {
            // If tsconfig.json is invalid or uses extends, don't modify it
            console.log(chalk_1.default.yellow('⚠️  Could not update tsconfig.json automatically'));
            console.log(chalk_1.default.gray('   Please add "vitest/globals" to compilerOptions.types manually'));
        }
    }
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=manager.js.map