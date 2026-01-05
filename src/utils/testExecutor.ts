/**
 * FlowSpec CLI - Background Test Executor
 * Non-blocking test execution using child processes
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

interface TestExecutionResult {
  passed: boolean;
  duration: number;
  testCount: number;
  error?: string;
}

interface PendingExecution {
  testFilePath: string;
  resolve: (result: TestExecutionResult) => void;
  reject: (error: Error) => void;
  startTime: number;
}

export class BackgroundTestExecutor {
  private projectRoot: string;
  private pendingExecutions: Map<string, PendingExecution> = new Map();
  private maxConcurrent: number = 3; // Max concurrent test executions
  private activeExecutions: Set<string> = new Set();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Execute test in background (non-blocking)
   */
  async executeTest(testFilePath: string): Promise<TestExecutionResult> {
    const relativePath = path.relative(this.projectRoot, testFilePath);

    // If already executing, return existing promise
    const existing = this.pendingExecutions.get(testFilePath);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.resolve = resolve;
        existing.reject = reject;
      });
    }

    // Wait if at max concurrent executions
    while (this.activeExecutions.size >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.pendingExecutions.set(testFilePath, {
        testFilePath,
        resolve,
        reject,
        startTime
      });

      this.activeExecutions.add(testFilePath);
      this.runTest(testFilePath, startTime);
    });
  }

  /**
   * Run test using child process
   */
  private runTest(testFilePath: string, startTime: number): void {
    const relativePath = path.relative(this.projectRoot, testFilePath);
    const pending = this.pendingExecutions.get(testFilePath);
    
    if (!pending) {
      return;
    }

    // Spawn vitest process
    const vitestProcess = spawn('npx', ['vitest', 'run', relativePath], {
      cwd: this.projectRoot,
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    vitestProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    vitestProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    vitestProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      this.activeExecutions.delete(testFilePath);
      this.pendingExecutions.delete(testFilePath);

      if (!pending) {
        return;
      }

      if (code === 0) {
        // Test passed - count tests from output
        const testCount = this.countTestsFromOutput(stdout);
        
        pending.resolve({
          passed: true,
          duration,
          testCount
        });
      } else {
        // Test failed - include both stdout and stderr for analysis
        pending.resolve({
          passed: false,
          duration,
          testCount: 0,
          error: stdout + '\n' + stderr
        });
      }
    });

    vitestProcess.on('error', (error) => {
      const duration = Date.now() - startTime;
      this.activeExecutions.delete(testFilePath);
      this.pendingExecutions.delete(testFilePath);

      if (pending) {
        pending.reject(error);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (vitestProcess.killed === false) {
        vitestProcess.kill();
        this.activeExecutions.delete(testFilePath);
        this.pendingExecutions.delete(testFilePath);

        if (pending) {
          pending.resolve({
            passed: false,
            duration: 30000,
            testCount: 0,
            error: 'Test execution timed out'
          });
        }
      }
    }, 30000);
  }

  /**
   * Count tests from vitest output
   */
  private countTestsFromOutput(output: string): number {
    // Try to extract test count from vitest output
    // Pattern: "Test Files  1 passed (1)"
    const testFilesMatch = output.match(/Test Files\s+\d+\s+passed\s+\((\d+)\)/);
    if (testFilesMatch) {
      return parseInt(testFilesMatch[1], 10);
    }

    // Pattern: "Tests  12 passed (12)"
    const testsMatch = output.match(/Tests\s+\d+\s+passed\s+\((\d+)\)/);
    if (testsMatch) {
      return parseInt(testsMatch[1], 10);
    }

    // Fallback: count "PASS" or "✓" markers
    const passMarkers = (output.match(/PASS|✓/g) || []).length;
    return passMarkers > 0 ? passMarkers : 0;
  }

  /**
   * Wait for all pending executions to complete
   */
  async waitForAll(): Promise<void> {
    while (this.pendingExecutions.size > 0 || this.activeExecutions.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cancel all pending executions
   */
  cancelAll(): void {
    for (const [testFilePath, pending] of this.pendingExecutions.entries()) {
      pending.reject(new Error('Execution cancelled'));
    }
    this.pendingExecutions.clear();
    this.activeExecutions.clear();
  }
}

