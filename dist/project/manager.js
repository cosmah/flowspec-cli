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
class ProjectManager {
    constructor() {
        this.authManager = new manager_1.AuthManager();
        this.codeParser = new parser_1.CodeParser();
        this.apiUrl = process.env.FLOWSPEC_API_URL || 'https://api.cosmah.me';
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
                headers: this.authManager.getAuthHeader()
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
            // Upload to server
            await axios_1.default.post(`${this.apiUrl}/embed-files`, {
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
        // Check server connection
        try {
            const spinner = (0, ora_1.default)('Checking server connection...').start();
            const response = await axios_1.default.get(`${this.apiUrl}/projects/${config.projectId}`, {
                headers: this.authManager.getAuthHeader()
            });
            const project = response.data;
            spinner.stop();
            console.log(chalk_1.default.green('\n✅ Server Connection'));
            console.log(chalk_1.default.gray(`   Tests Generated: ${project.test_count}`));
            console.log(chalk_1.default.gray(`   Coverage: ${project.coverage_percentage.toFixed(1)}%`));
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
     * Ensure Vitest is installed
     */
    async ensureVitest(projectRoot, packageJson) {
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (!dependencies.vitest) {
            console.log(chalk_1.default.yellow('\n⚠️  Vitest not found. Installing required dependencies...'));
            const spinner = (0, ora_1.default)('Installing Vitest and testing dependencies...').start();
            try {
                const { execSync } = require('child_process');
                // Detect package manager
                const hasYarnLock = fs.existsSync(path.join(projectRoot, 'yarn.lock'));
                const hasPnpmLock = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
                let installCmd;
                if (hasPnpmLock) {
                    installCmd = 'pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom';
                }
                else if (hasYarnLock) {
                    installCmd = 'yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom';
                }
                else {
                    installCmd = 'npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom';
                }
                execSync(installCmd, {
                    cwd: projectRoot,
                    stdio: 'pipe'
                });
                spinner.succeed('Testing dependencies installed successfully!');
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
                    console.log(chalk_1.default.green('✅ Created vitest.config.ts and test setup'));
                }
            }
            catch (error) {
                spinner.fail('Failed to install dependencies');
                console.log(chalk_1.default.yellow('\n⚠️  Please install manually:'));
                console.log(chalk_1.default.gray('   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom'));
                console.log(chalk_1.default.gray('   # or'));
                console.log(chalk_1.default.gray('   yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom'));
            }
        }
        else {
            console.log(chalk_1.default.green('✅ Vitest dependencies found'));
        }
    }
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=manager.js.map