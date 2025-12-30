/**
 * FlowSpec CLI - Test Generator
 * Handles test generation, file watching, and test execution
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import chokidar from 'chokidar';
import { AuthManager } from '../auth/manager';
import { ProjectManager } from '../project/manager';

interface GenerateOptions {
  watch?: boolean;
}

interface TestResult {
  success: boolean;
  test_code: string;
  is_passing: boolean;
  attempts: number;
  error_log: string;
  message: string;
}

export class TestGenerator {
  private authManager: AuthManager;
  private projectManager: ProjectManager;
  private apiUrl: string;
  private watcher: chokidar.FSWatcher | null = null;

  constructor() {
    this.authManager = new AuthManager();
    this.projectManager = new ProjectManager();
    this.apiUrl = process.env.FLOWSPEC_API_URL || 'https://api.cosmah.me';
  }

  /**
   * Generate tests for specific files
   */
  async generateTests(files: string[], options: GenerateOptions = {}): Promise<void> {
    const projectRoot = process.cwd();
    const config = this.projectManager.getProjectConfig(projectRoot);
    
    if (!config) {
      throw new Error('Project not initialized. Run "flowspec init" first.');
    }

    await this.authManager.ensureAuthenticated();

    console.log(chalk.blue(`\nGenerating tests for ${files.length} files...\n`));

    const results = [];
    
    for (const file of files) {
      const filePath = path.resolve(projectRoot, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`File not found: ${file}`));
        continue;
      }

      if (!this.isTestableFile(filePath)) {
        console.log(chalk.yellow(`Skipping non-component file: ${file}`));
        continue;
      }

      // Check if test file already exists
      const testFilePath = this.getTestFilePath(filePath);
      const testExists = fs.existsSync(testFilePath);
      
      if (testExists) {
        console.log(chalk.gray(`Test exists: ${path.relative(projectRoot, testFilePath)} - checking for updates...`));
        
        // Check if component was modified after test file
        const componentStat = fs.statSync(filePath);
        const testStat = fs.statSync(testFilePath);
        
        if (componentStat.mtime <= testStat.mtime) {
          console.log(chalk.gray(`Skipping ${file} - test is up to date`));
          continue;
        }
      }

      const spinner = ora(`${testExists ? 'Updating' : 'Creating'} test for ${file}...`).start();

      try {
        const componentCode = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(projectRoot, filePath);

        // For existing tests, include current test content for incremental updates
        let existingTestCode = '';
        if (testExists) {
          existingTestCode = fs.readFileSync(testFilePath, 'utf-8');
        }

        const result = await this.generateTestForComponent(
          config.projectId,
          componentCode,
          relativePath,
          existingTestCode
        );

        if (result.success) {
          // Save test file
          this.ensureTestDirectory(testFilePath);
          fs.writeFileSync(testFilePath, result.test_code);

          spinner.succeed(`${testExists ? 'Updated' : 'Generated'} test for ${file}`);
          console.log(chalk.gray(`   Test file: ${path.relative(projectRoot, testFilePath)}`));
          console.log(chalk.gray(`   Status: ${result.is_passing ? 'Passing' : 'Needs attention'}`));
          console.log(chalk.gray(`   Attempts: ${result.attempts}`));
        } else {
          spinner.fail(`Failed to ${testExists ? 'update' : 'generate'} test for ${file}`);
          console.log(chalk.red(`   Error: ${result.message}`));
        }

        results.push({ file, result });

      } catch (error: any) {
        spinner.fail(`Error processing ${file}`);
        console.log(chalk.red(`   ${error.message}`));
      }
    }

    // Summary
    const successful = results.filter(r => r.result.success).length;
    const failed = results.length - successful;

    console.log(chalk.blue('\nGeneration Summary:'));
    console.log(chalk.green(`   Successful: ${successful}`));
    if (failed > 0) {
      console.log(chalk.red(`   Failed: ${failed}`));
    }

    if (options.watch) {
      console.log(chalk.blue('\nStarting watch mode...'));
      await this.startWatching(projectRoot);
    }
  }

  /**
   * Start watching for file changes
   */
  async startWatching(projectRoot: string): Promise<void> {
    const config = this.projectManager.getProjectConfig(projectRoot);
    
    if (!config) {
      throw new Error('Project not initialized. Run "flowspec init" first.');
    }

    if (this.watcher) {
      console.log(chalk.yellow('⚠️  Watcher is already running'));
      return;
    }

    console.log(chalk.blue('👀 Starting FlowSpec file watcher...\n'));

    const watchPatterns = [
      'src/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',  // Next.js App Router
      'components/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}' // Next.js Pages Router
    ];

    this.watcher = chokidar.watch(watchPatterns, {
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
    const existingFiles: string[] = [];

    this.watcher
      .on('add', (filePath) => {
        if (!initialScanComplete) {
          // Collect existing files during initial scan
          if (this.isTestableFile(path.resolve(projectRoot, filePath))) {
            existingFiles.push(filePath);
          }
        } else {
          // Handle new files after initial scan
          this.handleFileChange('added', filePath, projectRoot);
        }
      })
      .on('change', (filePath) => this.handleFileChange('changed', filePath, projectRoot))
      .on('ready', async () => {
        initialScanComplete = true;
        
        if (existingFiles.length > 0) {
          console.log(chalk.blue(`🔍 Found ${existingFiles.length} existing components`));
          console.log(chalk.yellow('📝 Generating tests for existing files...\n'));
          
          // Generate tests for existing files
          for (const filePath of existingFiles) {
            try {
              await this.handleFileChange('existing', filePath, projectRoot);
            } catch (error) {
              console.error(chalk.red(`❌ Error processing existing file ${filePath}:`), error);
            }
          }
          
          console.log(chalk.green(`\n✅ Initial sync complete! Processed ${existingFiles.length} existing files`));
        }
        
        console.log(chalk.green('✅ FlowSpec watcher is ready and monitoring for changes'));
        console.log(chalk.gray('   Press Ctrl+C to stop watching\n'));
      })
      .on('error', (error) => {
        console.error(chalk.red('❌ Watcher error:'), error);
      });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.blue('\n🛑 Stopping FlowSpec watcher...'));
      await this.stopWatching();
      process.exit(0);
    });

    // Keep process alive
    process.stdin.resume();
  }

  /**
   * Stop the file watcher
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log(chalk.green('✅ Watcher stopped'));
    }
  }

  /**
   * Handle file system changes
   */
  private async handleFileChange(event: string, filePath: string, projectRoot: string): Promise<void> {
    const fullPath = path.resolve(projectRoot, filePath);
    
    if (!this.isTestableFile(fullPath)) {
      return;
    }

    const eventLabel = event === 'existing' ? 'found' : event;
    console.log(chalk.blue(`📝 File ${eventLabel}: ${filePath}`));

    // Debounce rapid changes (but not for existing files during initial scan)
    const delay = event === 'existing' ? 0 : 1000;
    
    setTimeout(async () => {
      try {
        await this.generateTests([filePath]);
      } catch (error) {
        console.error(chalk.red(`❌ Error processing ${filePath}:`), error);
      }
    }, delay);
  }

  /**
   * Generate test for a single component
   */
  private async generateTestForComponent(
    projectId: string,
    componentCode: string,
    componentPath: string,
    existingTestCode?: string
  ): Promise<TestResult> {
    try {
      const requestBody: any = {
        project_id: projectId,
        component_code: componentCode,
        component_path: componentPath
      };

      // Include existing test for incremental updates
      if (existingTestCode) {
        requestBody.existing_test_code = existingTestCode;
        requestBody.update_mode = true;
      }

      const response = await axios.post(
        `${this.apiUrl}/generate-test`,
        requestBody,
        {
          headers: this.authManager.getAuthHeader(),
          timeout: 120000 // 2 minutes timeout for AI generation
        }
      );

      return response.data;

    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to FlowSpec server. Make sure it\'s running.');
      } else {
        throw new Error('Test generation failed. Please try again.');
      }
    }
  }

  /**
   * Check if file is testable (React component)
   */
  private isTestableFile(filePath: string): boolean {
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
  private getTestFilePath(componentPath: string): string {
    const dir = path.dirname(componentPath);
    const name = path.basename(componentPath, path.extname(componentPath));
    const ext = path.extname(componentPath);
    
    return path.join(dir, `${name}.test${ext}`);
  }

  /**
   * Ensure test directory exists
   */
  private ensureTestDirectory(testFilePath: string): void {
    const dir = path.dirname(testFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}