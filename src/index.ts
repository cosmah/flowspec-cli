#!/usr/bin/env node

/**
 * FlowSpec CLI - Entry Point
 * Command-line interface for the autonomous test generation system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from './auth/manager';
import { ProjectManager } from './project/manager';
import { TestGenerator } from './test/generator';
import { readFileSync } from 'fs';
import { join } from 'path';

const program = new Command();

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

// Initialize managers
const authManager = new AuthManager();
const projectManager = new ProjectManager();
const testGenerator = new TestGenerator();

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
      console.log(chalk.blue('🚀 Welcome to FlowSpec!'));
      await authManager.signup();
    } catch (error) {
      console.error(chalk.red('❌ Registration failed:'), error);
      process.exit(1);
    }
  });

program
  .command('signup')
  .description('Create a new FlowSpec account (alias for register)')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Welcome to FlowSpec!'));
      await authManager.signup();
    } catch (error) {
      console.error(chalk.red('❌ Signup failed:'), error);
      process.exit(1);
    }
  });

program
  .command('login')
  .description('Login to your FlowSpec account')
  .action(async () => {
    try {
      await authManager.login();
    } catch (error) {
      console.error(chalk.red('❌ Login failed:'), error);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Logout from FlowSpec')
  .action(async () => {
    try {
      await authManager.logout();
      console.log(chalk.green('✅ Logged out successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Logout failed:'), error);
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
      console.log(chalk.blue('🔧 Initializing FlowSpec project...'));
      await projectManager.initProject(process.cwd(), options);
      console.log(chalk.green('✅ Project initialized successfully!'));
      console.log(chalk.yellow('\nNext steps:'));
      console.log('  1. flowspec embed    # Embed your codebase');
      console.log('  2. flowspec watch    # Start watching for changes');
    } catch (error) {
      console.error(chalk.red('❌ Project initialization failed:'), error);
      process.exit(1);
    }
  });

program
  .command('embed')
  .description('Embed the codebase for AI context')
  .action(async () => {
    try {
      console.log(chalk.blue('🧠 Embedding codebase...'));
      await projectManager.embedCodebase(process.cwd());
      console.log(chalk.green('✅ Codebase embedded successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Embedding failed:'), error);
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
      console.log(chalk.blue(`🧪 Generating tests for ${files.length} files...`));
      await testGenerator.generateTests(files, { watch: options.watch });
    } catch (error) {
      console.error(chalk.red('❌ Test generation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for file changes and auto-generate tests')
  .action(async () => {
    try {
      console.log(chalk.blue('👀 Starting FlowSpec watcher...'));
      await testGenerator.startWatching(process.cwd());
    } catch (error) {
      console.error(chalk.red('❌ Watcher failed:'), error);
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Open the FlowSpec dashboard')
  .action(async () => {
    try {
      await projectManager.openDashboard();
    } catch (error) {
      console.error(chalk.red('❌ Failed to open dashboard:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show FlowSpec status and project info')
  .action(async () => {
    try {
      await projectManager.showStatus(process.cwd());
    } catch (error) {
      console.error(chalk.red('❌ Failed to get status:'), error);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall FlowSpec CLI')
  .action(async () => {
    try {
      console.log(chalk.yellow('🗑️  Uninstalling FlowSpec CLI...'));
      console.log(chalk.gray('Run: npm uninstall -g @cosmah/flowspec-cli'));
      console.log(chalk.green('✅ Thanks for using FlowSpec!'));
    } catch (error) {
      console.error(chalk.red('❌ Uninstall failed:'), error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}