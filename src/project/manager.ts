/**
 * FlowSpec CLI - Project Manager
 * Handles project initialization, codebase embedding, and dashboard integration
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { glob } from 'glob';
import { AuthManager } from '../auth/manager';
import { CodeParser } from '../utils/parser';

interface ProjectConfig {
  projectId: string;
  userId: string;
  name: string;
  framework: string;
  apiUrl: string;
}

interface InitOptions {
  name?: string;
  framework?: string;
}

export class ProjectManager {
  private authManager: AuthManager;
  private codeParser: CodeParser;
  private apiUrl: string;

  constructor() {
    this.authManager = new AuthManager();
    this.codeParser = new CodeParser();
    this.apiUrl = process.env.FLOWSPEC_API_URL || 'https://api.cosmah.me';
  }

  /**
   * Initialize FlowSpec in a project
   */
  async initProject(projectRoot: string, options: InitOptions = {}): Promise<void> {
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

    const spinner = ora('Creating project...').start();

    try {
      // Create project on server
      const response = await axios.post(
        `${this.apiUrl}/projects`,
        {
          name: projectName,
          description: packageJson.description || '',
          framework,
          package_json: packageJson
        },
        {
          headers: this.authManager.getAuthHeader()
        }
      );

      const project = response.data;

      // Create .flowspec directory
      const flowspecDir = path.join(projectRoot, '.flowspec');
      if (!fs.existsSync(flowspecDir)) {
        fs.mkdirSync(flowspecDir, { recursive: true });
      }

      // Save project config
      const projectConfig: ProjectConfig = {
        projectId: project.id,
        userId: credentials.userId,
        name: projectName,
        framework,
        apiUrl: this.apiUrl
      };

      fs.writeFileSync(
        path.join(flowspecDir, 'config.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Add to .gitignore
      this.updateGitignore(projectRoot);

      // Install Vitest if not present
      await this.ensureVitest(projectRoot, packageJson);

      spinner.succeed(`Project "${projectName}" initialized successfully!`);

      console.log(chalk.green('\n✅ FlowSpec is ready!'));
      console.log(chalk.gray(`   Project ID: ${project.id}`));
      console.log(chalk.gray(`   Framework: ${framework}`));

    } catch (error: any) {
      spinner.fail('Project initialization failed');
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to initialize project. Please try again.');
      }
    }
  }

  /**
   * Embed the codebase for AI context
   */
  async embedCodebase(projectRoot: string): Promise<void> {
    const config = this.getProjectConfig(projectRoot);
    if (!config) {
      throw new Error('Project not initialized. Run "flowspec init" first.');
    }

    const spinner = ora('Analyzing codebase...').start();

    try {
      // Find all relevant files
      const patterns = [
        'src/**/*.{ts,tsx,js,jsx}',
        'components/**/*.{ts,tsx,js,jsx}',
        'lib/**/*.{ts,tsx,js,jsx}',
        'utils/**/*.{ts,tsx,js,jsx}'
      ];

      const files: string[] = [];
      for (const pattern of patterns) {
        const matches = await glob(pattern, { 
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
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Skipped ${filePath}: ${error}`));
        }
      }

      spinner.text = 'Uploading to AI context...';

      // Upload to server
      await axios.post(
        `${this.apiUrl}/embed-files`,
        {
          files: fileChunks,
          collection_name: `project_${config.projectId}`
        },
        {
          headers: this.authManager.getAuthHeader()
        }
      );

      spinner.succeed(`Embedded ${fileChunks.length} files successfully!`);

      console.log(chalk.green('\n🧠 Codebase is now available to AI'));
      console.log(chalk.gray(`   Files processed: ${fileChunks.length}`));
      console.log(chalk.gray(`   Total chunks: ${fileChunks.reduce((sum, f) => sum + f.chunks.length, 0)}`));

    } catch (error: any) {
      spinner.fail('Embedding failed');
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to embed codebase. Please try again.');
      }
    }
  }

  /**
   * Show project status
   */
  async showStatus(projectRoot: string): Promise<void> {
    const config = this.getProjectConfig(projectRoot);
    const credentials = this.authManager.getCredentials();

    console.log(chalk.blue('\n📊 FlowSpec Status\n'));

    if (!credentials) {
      console.log(chalk.red('❌ Not logged in'));
      console.log(chalk.yellow('   Run: flowspec login'));
      return;
    }

    console.log(chalk.green('✅ Authentication'));
    console.log(chalk.gray(`   User: ${credentials.name} (${credentials.email})`));
    console.log(chalk.gray(`   Plan: ${credentials.plan}`));

    if (!config) {
      console.log(chalk.red('\n❌ Project not initialized'));
      console.log(chalk.yellow('   Run: flowspec init'));
      return;
    }

    console.log(chalk.green('\n✅ Project Configuration'));
    console.log(chalk.gray(`   Name: ${config.name}`));
    console.log(chalk.gray(`   Framework: ${config.framework}`));
    console.log(chalk.gray(`   Project ID: ${config.projectId}`));

    // Check server connection
    try {
      const spinner = ora('Checking server connection...').start();
      
      const response = await axios.get(
        `${this.apiUrl}/projects/${config.projectId}`,
        {
          headers: this.authManager.getAuthHeader()
        }
      );

      const project = response.data;
      spinner.stop();

      console.log(chalk.green('\n✅ Server Connection'));
      console.log(chalk.gray(`   Tests Generated: ${project.test_count}`));
      console.log(chalk.gray(`   Coverage: ${project.coverage_percentage.toFixed(1)}%`));
      console.log(chalk.gray(`   Last Updated: ${new Date(project.updated_at).toLocaleDateString()}`));

    } catch (error) {
      console.log(chalk.red('\n❌ Server Connection Failed'));
      console.log(chalk.yellow('   Make sure the Brain Server is running'));
    }
  }

  /**
   * Open the web dashboard
   */
  async openDashboard(): Promise<void> {
    const config = this.getProjectConfig(process.cwd());
    
    if (!config) {
      throw new Error('Project not initialized. Run "flowspec init" first.');
    }

    const dashboardUrl = `https://dashboard.cosmah.me/projects/${config.projectId}`;
    console.log(chalk.blue(`🌐 Opening dashboard: ${dashboardUrl}`));
    
    await open(dashboardUrl);
  }

  /**
   * Get project configuration
   */
  getProjectConfig(projectRoot: string): ProjectConfig | null {
    const configPath = path.join(projectRoot, '.flowspec', 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect framework from package.json
   */
  private detectFramework(packageJson: any): string {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.react) return 'react';
    if (dependencies.vue) return 'vue';
    if (dependencies.svelte) return 'svelte';
    
    return 'react'; // default
  }

  /**
   * Update .gitignore to exclude FlowSpec files
   */
  private updateGitignore(projectRoot: string): void {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const gitignoreEntry = '\n# FlowSpec\n.flowspec/\n';
    
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.flowspec/')) {
        fs.appendFileSync(gitignorePath, gitignoreEntry);
      }
    } else {
      fs.writeFileSync(gitignorePath, gitignoreEntry);
    }
  }

  /**
   * Ensure Vitest is installed
   */
  private async ensureVitest(projectRoot: string, packageJson: any): Promise<void> {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (!dependencies.vitest) {
      console.log(chalk.yellow('\n⚠️  Vitest not found. Please install it:'));
      console.log(chalk.gray('   npm install -D vitest @testing-library/react jsdom'));
      console.log(chalk.gray('   # or'));
      console.log(chalk.gray('   yarn add -D vitest @testing-library/react jsdom'));
    }
  }
}