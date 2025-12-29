/**
 * FlowSpec CLI - Authentication Manager
 * Handles user signup, login, and credential management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import inquirer from 'inquirer';
import open from 'open';
import chalk from 'chalk';
import ora from 'ora';

interface Credentials {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  plan: string;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthManager {
  private credentialsPath: string;
  private apiUrl: string;

  constructor() {
    this.credentialsPath = path.join(os.homedir(), '.flowspec', 'credentials.json');
    
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
        } catch (error) {
          // Ignore config read errors
        }
      }
    }
    
    this.apiUrl = apiUrl || 'https://api.cosmah.me';
    
    // Ensure .flowspec directory exists
    const flowspecDir = path.dirname(this.credentialsPath);
    if (!fs.existsSync(flowspecDir)) {
      fs.mkdirSync(flowspecDir, { recursive: true });
    }
  }

  /**
   * User signup flow
   */
  async signup(): Promise<void> {
    console.log(chalk.blue('Creating your FlowSpec account...\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your full name:',
        validate: (input) => input.trim().length > 0 || 'Name is required'
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email address:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password (min 8 characters):',
        validate: (input) => input.length >= 8 || 'Password must be at least 8 characters'
      }
    ]);

    const spinner = ora('Creating account...').start();

    try {
      const response = await axios.post(`${this.apiUrl}/auth/signup`, {
        name: answers.name,
        email: answers.email,
        password: answers.password
      });

      const credentials: Credentials = {
        userId: response.data.user_id,
        email: response.data.email,
        name: response.data.name,
        accessToken: response.data.access_token,
        plan: response.data.plan
      };

      this.saveCredentials(credentials);
      
      spinner.succeed('Account created successfully!');
      
      console.log(chalk.green('\n🎉 Welcome to FlowSpec!'));
      console.log(chalk.gray(`   Email: ${credentials.email}`));
      console.log(chalk.gray(`   Plan: ${credentials.plan}`));
      console.log(chalk.yellow('\nNext steps:'));
      console.log('  1. cd your-react-project');
      console.log('  2. flowspec init');
      console.log('  3. flowspec embed');
      console.log('  4. flowspec watch');

    } catch (error: any) {
      spinner.fail('Account creation failed');
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    }
  }

  /**
   * User login flow
   */
  async login(): Promise<void> {
    console.log(chalk.blue('Login to FlowSpec\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email address:',
        validate: (input) => input.trim().length > 0 || 'Email is required'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        validate: (input) => input.trim().length > 0 || 'Password is required'
      }
    ]);

    const spinner = ora('Logging in...').start();

    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: answers.email,
        password: answers.password
      });

      const credentials: Credentials = {
        userId: response.data.user_id,
        email: response.data.email,
        name: response.data.name,
        accessToken: response.data.access_token,
        plan: response.data.plan
      };

      this.saveCredentials(credentials);
      
      spinner.succeed('Logged in successfully!');
      
      console.log(chalk.green(`\n👋 Welcome back, ${credentials.name}!`));
      console.log(chalk.gray(`   Plan: ${credentials.plan}`));

    } catch (error: any) {
      spinner.fail('Login failed');
      
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (fs.existsSync(this.credentialsPath)) {
      fs.unlinkSync(this.credentialsPath);
    }
  }

  /**
   * Get current user credentials
   */
  getCredentials(): Credentials | null {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        return null;
      }

      const data = fs.readFileSync(this.credentialsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const credentials = this.getCredentials();
    return credentials !== null && credentials.accessToken.length > 0;
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    const credentials = this.getCredentials();
    if (!credentials) {
      return {};
    }

    return {
      Authorization: `Bearer ${credentials.accessToken}`
    };
  }

  /**
   * Ensure user is authenticated, prompt login if not
   */
  async ensureAuthenticated(): Promise<Credentials> {
    const credentials = this.getCredentials();
    
    if (!credentials) {
      console.log(chalk.yellow('⚠️  You need to login first.'));
      await this.login();
      return this.getCredentials()!;
    }

    // TODO: Add token validation/refresh logic here
    return credentials;
  }

  /**
   * Save credentials to file
   */
  private saveCredentials(credentials: Credentials): void {
    fs.writeFileSync(this.credentialsPath, JSON.stringify(credentials, null, 2));
  }
}