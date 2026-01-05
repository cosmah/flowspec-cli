/**
 * FlowSpec CLI - Error Handler
 * Centralized error handling, retry logic, and fallback mechanisms
 */

import axios, { AxiosError } from 'axios';
import chalk from 'chalk';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: number[];
}

export class ErrorHandler {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private static readonly RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    context: string = 'operation'
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    const retryableErrors = options.retryableErrors ?? this.RETRYABLE_STATUS_CODES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error, retryableErrors);
        const shouldRetry = attempt < maxRetries && isRetryable;

        if (!shouldRetry) {
          break;
        }

        // Log retry attempt
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(
          chalk.yellow(
            `⚠️  ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
          )
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw lastError || new Error(`${context} failed after ${maxRetries + 1} attempts`);
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Network errors are retryable
      if (!axiosError.response && axiosError.code !== 'ECONNABORTED') {
        return true;
      }

      // Check status code
      if (axiosError.response?.status) {
        return retryableStatusCodes.includes(axiosError.response.status);
      }
    }

    // Connection errors are retryable
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      return (
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')
      );
    }

    return false;
  }

  /**
   * Handle brain server errors with fallback
   */
  static handleBrainServerError(error: unknown, fallbackAction?: () => void): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (!axiosError.response) {
        // Network error
        console.error(chalk.red('❌ Cannot connect to FlowSpec server'));
        console.error(chalk.gray('   Check your internet connection and server status'));
        
        if (fallbackAction) {
          console.log(chalk.yellow('   Using fallback...'));
          fallbackAction();
        }
        return;
      }

      const status = axiosError.response.status;

      if (status === 401) {
        console.error(chalk.red('❌ Authentication failed'));
        console.error(chalk.gray('   Run: flowspec login'));
        return;
      }

      if (status === 403) {
        const detail = axiosError.response.data as any;
        if (detail?.error === 'usage_limit_exceeded') {
          console.error(chalk.red('❌ Usage limit exceeded'));
          console.error(chalk.gray(`   ${detail.message || 'You have reached the maximum limit'}`));
          if (detail.contact) {
            console.error(chalk.gray(`   Contact: ${detail.contact}`));
          }
          return;
        }
      }

      if (status >= 500) {
        console.error(chalk.red('❌ Server error'));
        console.error(chalk.gray('   The FlowSpec server encountered an error'));
        console.error(chalk.gray('   Please try again later'));
        
        if (fallbackAction) {
          console.log(chalk.yellow('   Using fallback...'));
          fallbackAction();
        }
        return;
      }
    }

    // Generic error
    if (error instanceof Error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    } else {
      console.error(chalk.red('❌ An unexpected error occurred'));
    }
  }

  /**
   * Check if brain server is available
   */
  static async checkBrainServerHealth(apiUrl: string, timeout: number = 5000): Promise<boolean> {
    try {
      const response = await axios.get(`${apiUrl}/health`, { timeout });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

