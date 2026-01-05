#!/usr/bin/env node
"use strict";
/**
 * FlowSpec CLI - Entry Point
 * Command-line interface for the autonomous test generation system
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const manager_1 = require("./auth/manager");
const manager_2 = require("./project/manager");
const generator_1 = require("./test/generator");
const fs_1 = require("fs");
const path_1 = require("path");
const program = new commander_1.Command();
// Read version from package.json
const packageJson = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../package.json'), 'utf8'));
// Initialize managers
const authManager = new manager_1.AuthManager();
const projectManager = new manager_2.ProjectManager();
const testGenerator = new generator_1.TestGenerator();
program
    .name('flowspec')
    .description('FlowSpec CLI - Autonomous React test generation')
    .version(packageJson.version);
// Authentication commands
program
    .command('register')
    .description('Create a new FlowSpec account')
    .action(async () => {
    try {
        console.log(chalk_1.default.blue('🚀 Welcome to FlowSpec!'));
        await authManager.signup();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Registration failed:'), error);
        process.exit(1);
    }
});
program
    .command('signup')
    .description('Create a new FlowSpec account (alias for register)')
    .action(async () => {
    try {
        console.log(chalk_1.default.blue('🚀 Welcome to FlowSpec!'));
        await authManager.signup();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Signup failed:'), error);
        process.exit(1);
    }
});
program
    .command('login')
    .description('Login to your FlowSpec account')
    .action(async () => {
    try {
        await authManager.login();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Login failed:'), error);
        process.exit(1);
    }
});
program
    .command('logout')
    .description('Logout from FlowSpec')
    .action(async () => {
    try {
        await authManager.logout();
        console.log(chalk_1.default.green('✅ Logged out successfully'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Logout failed:'), error);
        process.exit(1);
    }
});
// Project commands
program
    .command('init')
    .description('Initialize FlowSpec in the current project')
    .option('-n, --name <name>', 'Project name')
    .option('-f, --framework <framework>', 'Framework (react, vue, svelte)', 'react')
    .action(async (options) => {
    try {
        console.log(chalk_1.default.blue('🔧 Initializing FlowSpec project...'));
        await projectManager.initProject(process.cwd(), options);
        console.log(chalk_1.default.green('✅ Project initialized successfully!'));
        console.log(chalk_1.default.yellow('\nNext steps:'));
        console.log('  1. flowspec embed    # Embed your codebase');
        console.log('  2. flowspec watch    # Start watching for changes');
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Project initialization failed:'), error);
        process.exit(1);
    }
});
program
    .command('embed')
    .description('Embed the codebase for AI context')
    .action(async () => {
    try {
        console.log(chalk_1.default.blue('🧠 Embedding codebase...'));
        await projectManager.embedCodebase(process.cwd());
        console.log(chalk_1.default.green('✅ Codebase embedded successfully!'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Embedding failed:'), error);
        process.exit(1);
    }
});
// Test generation commands
program
    .command('generate')
    .description('Generate tests for specific files')
    .argument('<files...>', 'Component files to generate tests for')
    .option('-w, --watch', 'Watch for changes and regenerate')
    .action(async (files, options) => {
    try {
        console.log(chalk_1.default.blue(`🧪 Generating tests for ${files.length} files...`));
        await testGenerator.generateTests(files, { watch: options.watch });
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Test generation failed:'), error);
        process.exit(1);
    }
});
program
    .command('watch')
    .description('Watch for file changes and auto-generate tests')
    .action(async () => {
    try {
        await testGenerator.startWatching(process.cwd());
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Watcher failed:'), error);
        process.exit(1);
    }
});
program
    .command('dashboard')
    .description('Open the FlowSpec dashboard')
    .action(async () => {
    try {
        await projectManager.openDashboard();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to open dashboard:'), error);
        process.exit(1);
    }
});
program
    .command('status')
    .description('Show FlowSpec status and project info')
    .action(async () => {
    try {
        await projectManager.showStatus(process.cwd());
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to get status:'), error);
        process.exit(1);
    }
});
program
    .command('coverage')
    .description('Generate coverage report and open in browser')
    .option('-o, --output <path>', 'Output path for HTML report')
    .action(async (options) => {
    try {
        const { CoverageVisualizer } = await Promise.resolve().then(() => __importStar(require('./utils/coverageVisualizer')));
        const visualizer = new CoverageVisualizer(process.cwd());
        console.log(chalk_1.default.blue('📊 Generating coverage report...'));
        const reportPath = await visualizer.saveReport(options.output);
        console.log(chalk_1.default.green(`✅ Coverage report generated: ${reportPath}`));
        // Open in browser
        const open = (await Promise.resolve().then(() => __importStar(require('open')))).default;
        await open(reportPath);
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to generate coverage report:'), error);
        process.exit(1);
    }
});
program
    .command('update')
    .alias('upgrade')
    .description('Update FlowSpec CLI to the latest version')
    .action(async () => {
    try {
        const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const currentVersion = packageJson.version;
        console.log(chalk_1.default.blue(`🔍 Checking for updates...`));
        console.log(chalk_1.default.gray(`   Current version: ${currentVersion}`));
        // Fetch latest version from npm registry
        const response = await axios.get('https://registry.npmjs.org/@cosmah/flowspec-cli', {
            timeout: 5000
        });
        const latestVersion = response.data['dist-tags'].latest;
        console.log(chalk_1.default.gray(`   Latest version: ${latestVersion}`));
        if (currentVersion === latestVersion) {
            console.log(chalk_1.default.green(`✅ You're already on the latest version (${currentVersion})!`));
            return;
        }
        console.log(chalk_1.default.yellow(`\n📦 Updating from ${currentVersion} to ${latestVersion}...`));
        // Run npm install -g to update
        try {
            execSync(`npm install -g @cosmah/flowspec-cli@latest`, {
                stdio: 'inherit'
            });
            console.log(chalk_1.default.green(`\n✅ Successfully updated to v${latestVersion}!`));
            console.log(chalk_1.default.gray(`   Run 'flowspec --version' to verify`));
        }
        catch (error) {
            if (error.status === 1) {
                // npm install failed, might need sudo or different permissions
                console.log(chalk_1.default.yellow(`\n⚠️  Automatic update failed. Please run manually:`));
                console.log(chalk_1.default.cyan(`   npm install -g @cosmah/flowspec-cli@latest`));
                console.log(chalk_1.default.gray(`   Or with sudo: sudo npm install -g @cosmah/flowspec-cli@latest`));
            }
            else {
                throw error;
            }
        }
    }
    catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error(chalk_1.default.red('❌ Failed to check for updates: Network error'));
            console.log(chalk_1.default.yellow('💡 You can manually update with:'));
            console.log(chalk_1.default.cyan('   npm install -g @cosmah/flowspec-cli@latest'));
        }
        else {
            console.error(chalk_1.default.red('❌ Update check failed:'), error.message);
            console.log(chalk_1.default.yellow('💡 You can manually update with:'));
            console.log(chalk_1.default.cyan('   npm install -g @cosmah/flowspec-cli@latest'));
        }
        process.exit(1);
    }
});
program
    .command('uninstall')
    .description('Uninstall FlowSpec CLI')
    .action(async () => {
    try {
        console.log(chalk_1.default.yellow('🗑️  Uninstalling FlowSpec CLI...'));
        console.log(chalk_1.default.gray('Run: npm uninstall -g @cosmah/flowspec-cli'));
        console.log(chalk_1.default.green('✅ Thanks for using FlowSpec!'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Uninstall failed:'), error);
        process.exit(1);
    }
});
// Parse command line arguments
program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map