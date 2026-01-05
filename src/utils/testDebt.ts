/**
 * FlowSpec CLI - Test Debt Counter
 * Scans project for components without tests and estimates coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ComponentInfo {
  path: string;
  relativePath: string;
  hasTest: boolean;
  testPath?: string;
}

interface TestDebtReport {
  totalComponents: number;
  testedComponents: number;
  untestedComponents: number;
  coveragePercentage: number;
  estimatedTimeToCoverage: number; // in seconds
  untestedFiles: ComponentInfo[];
}

export class TestDebtCounter {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check if a file is a testable component
   */
  private isTestableFile(filePath: string): boolean {
    // Must be TypeScript/JavaScript React file
    if (!/\.(tsx|jsx)$/.test(filePath)) {
      return false;
    }

    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Skip test files
    if (/\.(test|spec)\.(tsx|jsx)$/.test(filePath)) {
      return false;
    }

    // Next.js App Router special files (always testable)
    const nextJsFiles = ['page', 'layout', 'loading', 'error', 'not-found', 'global-error', 'route', 'template', 'default'];
    if (nextJsFiles.includes(fileName)) {
      return true;
    }

    // Regular React components (must start with capital letter)
    if (/^[A-Z]/.test(fileName)) {
      return true;
    }

    return false;
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
   * Scan project for test debt
   */
  async calculateTestDebt(): Promise<TestDebtReport> {
    const patterns = [
      'src/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',
      'components/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}'
    ];

    const allFiles: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**', '.next/**', 'dist/**', 'build/**']
      });
      allFiles.push(...matches.map(f => path.join(this.projectRoot, f)));
    }

    const components: ComponentInfo[] = [];
    const untestedFiles: ComponentInfo[] = [];

    for (const filePath of allFiles) {
      if (this.isTestableFile(filePath)) {
        const testPath = this.getTestFilePath(filePath);
        const hasTest = fs.existsSync(testPath);
        
        const componentInfo: ComponentInfo = {
          path: filePath,
          relativePath: path.relative(this.projectRoot, filePath),
          hasTest,
          testPath: hasTest ? path.relative(this.projectRoot, testPath) : undefined
        };

        components.push(componentInfo);
        
        if (!hasTest) {
          untestedFiles.push(componentInfo);
        }
      }
    }

    const totalComponents = components.length;
    const testedComponents = components.filter(c => c.hasTest).length;
    const untestedComponents = untestedFiles.length;
    const coveragePercentage = totalComponents > 0 
      ? Math.round((testedComponents / totalComponents) * 100) 
      : 100;

    // Estimate: ~3 seconds per component (generation + execution)
    const estimatedTimeToCoverage = untestedComponents * 3;

    return {
      totalComponents,
      testedComponents,
      untestedComponents,
      coveragePercentage,
      estimatedTimeToCoverage,
      untestedFiles
    };
  }

  /**
   * Format test debt report for display
   */
  formatReport(report: TestDebtReport): string {
    if (report.totalComponents === 0) {
      return 'No testable components found in project.';
    }

    const lines: string[] = [];
    
    if (report.untestedComponents > 0) {
      lines.push(`⚠️  Found ${report.untestedComponents} component${report.untestedComponents > 1 ? 's' : ''} without tests.`);
      lines.push(`   Estimated time to 100% coverage: ${this.formatTime(report.estimatedTimeToCoverage)} with FlowSpec.`);
      lines.push(`   Current coverage: ${report.coveragePercentage}% (${report.testedComponents}/${report.totalComponents})`);
    } else {
      lines.push(`✅ All ${report.totalComponents} components have tests!`);
      lines.push(`   Coverage: 100%`);
    }

    return lines.join('\n');
  }

  /**
   * Format time in seconds to human-readable format
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }
}

