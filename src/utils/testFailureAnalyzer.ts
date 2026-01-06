/**
 * FlowSpec CLI - Test Failure Analyzer
 * Distinguishes between "our fault" (syntax/imports) vs "their fault" (component bugs)
 */

interface FailureAnalysis {
  isOurFault: boolean; // Syntax/import/test setup issues we should auto-heal
  isTheirFault: boolean; // Component bugs/logic issues to show user
  errorType: 'syntax' | 'import' | 'type' | 'runtime' | 'logic' | 'unknown';
  errorMessage: string;
  suggestions: string[];
  affectedTests: string[];
}

export class TestFailureAnalyzer {
  /**
   * Analyze test failure output to determine if it's our fault or theirs
   */
  analyzeFailure(vitestOutput: string, stderr: string): FailureAnalysis {
    const fullOutput = vitestOutput + '\n' + stderr;
    const analysis: FailureAnalysis = {
      isOurFault: false,
      isTheirFault: false,
      errorType: 'unknown',
      errorMessage: '',
      suggestions: [],
      affectedTests: []
    };

    // Extract error message
    analysis.errorMessage = this.extractErrorMessage(fullOutput);
    
    // Extract affected test names
    analysis.affectedTests = this.extractTestNames(fullOutput);

    // Check for "our fault" patterns (syntax, imports, test setup)
    if (this.isSyntaxError(fullOutput)) {
      analysis.isOurFault = true;
      analysis.errorType = 'syntax';
      analysis.suggestions = [
        'Syntax error in generated test - will auto-heal',
        'Check for missing brackets, parentheses, or semicolons'
      ];
      return analysis;
    }

    if (this.isImportError(fullOutput)) {
      analysis.isOurFault = true;
      analysis.errorType = 'import';
      analysis.suggestions = [
        'Import error in generated test - will auto-heal',
        'Check import paths match file names'
      ];
      return analysis;
    }

    if (this.isTypeError(fullOutput) && this.isTestSetupIssue(fullOutput)) {
      analysis.isOurFault = true;
      analysis.errorType = 'type';
      analysis.suggestions = [
        'Type error in test setup - will auto-heal',
        'Check test imports and type definitions'
      ];
      return analysis;
    }

    // Check for "their fault" patterns (component bugs, logic issues)
    if (this.isComponentError(fullOutput)) {
      analysis.isTheirFault = true;
      analysis.errorType = 'runtime';
      analysis.suggestions = this.generateComponentSuggestions(fullOutput);
      return analysis;
    }

    if (this.isLogicError(fullOutput)) {
      analysis.isTheirFault = true;
      analysis.errorType = 'logic';
      analysis.suggestions = this.generateLogicSuggestions(fullOutput);
      return analysis;
    }

    // Default: assume it's a component issue (their fault) if we can't determine
    analysis.isTheirFault = true;
    analysis.errorType = 'runtime';
    analysis.suggestions = [
      'Test failure detected in component',
      'Review the error message above for details',
      'Check component implementation matches test expectations'
    ];

    return analysis;
  }

  /**
   * Check if error is a syntax error (our fault)
   */
  private isSyntaxError(output: string): boolean {
    const syntaxPatterns = [
      /SyntaxError/,
      /Unexpected token/,
      /Expected.*but found/,
      /Missing.*in/,
      /Cannot find name/,
      /'}' expected/,
      /'\)' expected/,
      /';' expected/
    ];

    return syntaxPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Check if error is an import error (our fault)
   */
  private isImportError(output: string): boolean {
    const importPatterns = [
      /Cannot find module/,
      /Module not found/,
      /Failed to resolve/,
      /Cannot resolve/,
      /does not provide an export named/,
      /has no exported member/,
      /is not exported from/,
      /Cannot find name.*from/,
      /TS2307.*Cannot find module/,
      /TS2305.*has no exported member/,
      /forgot to export your component/,
      /mixed up default and named imports/,
      /Element type is invalid.*got: undefined/,
      /You likely forgot to export/
    ];

    // Check if any import pattern matches
    if (!importPatterns.some(p => p.test(output))) {
      return false;
    }

    // EXCLUDE project dependency/configuration errors (not our fault)
    // These are missing npm packages that user needs to install
    const isDependencyError = /Cannot find module ['"]@(vitejs|testing-library|types|jest-dom)/.test(output) ||
                              /Cannot find module ['"]vitest/.test(output) ||
                              /Cannot find module ['"]@vitejs/.test(output);
    if (isDependencyError) {
      return false; // Not our fault - user needs to install dependencies
    }

    // Check if it's importing test utilities (our fault - wrong import path in test code)
    const isTestUtilityImport = /from ['"](vitest|@testing-library|@testing-library\/react|@testing-library\/jest-dom)['"]/.test(output);
    if (isTestUtilityImport && this.isWrongImportPath(output)) {
      return true;
    }

    // Check if it's a component import with wrong path (our fault)
    const isComponentImport = /from ['"].*\.(tsx|jsx|ts|js)['"]/.test(output);
    if (isComponentImport && this.isWrongImportPath(output)) {
      return true;
    }

    // Check for "forgot to export" or "mixed up default/named" - these are import errors we generated
    if (/forgot to export|mixed up default and named|Element type is invalid.*undefined/.test(output)) {
      // If error mentions component import in test file, it's our fault
      if (/\.test\.(tsx|jsx|ts|js)/.test(output) || /import.*from.*components/.test(output)) {
        return true;
      }
    }

    // Check for common test setup import errors (our fault)
    const isTestSetupImport = /(setupFiles|setup\.ts|vitest\.config)/.test(output);
    if (isTestSetupImport) {
      return true;
    }

    // If it's a relative import error in test file, likely our fault
    const isRelativeImportError = /Cannot find module.*['"]\.\//.test(output) && /\.test\./.test(output);
    if (isRelativeImportError) {
      return true;
    }

    return false;
  }

  /**
   * Check if import path looks wrong (our fault)
   */
  private isWrongImportPath(output: string): boolean {
    // Check for common wrong import patterns we generate
    const wrongPatterns = [
      /import.*from ['"]\.\/[A-Z][a-z]+['"]/, // Importing from component name instead of file name
      /Cannot find module.*\.\/[A-Z][a-z]+/,
      /Cannot find module.*\.\/[A-Z][a-z]+\.(tsx|jsx|ts|js)/,
      // Wrong Next.js patterns
      /Cannot find module.*\.\/page['"]/, // Should be './page' not './Page'
      /Cannot find module.*\.\/layout['"]/, // Should be './layout' not './Layout'
      // Missing file extension in import
      /Cannot find module.*['"]\.\/\w+['"]/, // Missing .tsx/.ts extension
    ];
    
    return wrongPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Check if error is a type error in test setup (our fault)
   */
  private isTypeError(output: string): boolean {
    return /TypeError|Type.*is not assignable/.test(output);
  }

  /**
   * Check if type error is in test setup vs component (our fault vs their fault)
   */
  private isTestSetupIssue(output: string): boolean {
    // If error mentions test file, vitest, or testing-library, it's test setup
    return /\.test\.|vitest|@testing-library|describe|it\(|test\(/.test(output);
  }

  /**
   * Check if error is a component runtime error (their fault)
   */
  private isComponentError(output: string): boolean {
    const componentErrorPatterns = [
      /Cannot read propert.*of undefined/,
      /Cannot read propert.*of null/,
      /is not a function/,
      /Cannot access.*before initialization/,
      /Maximum update depth exceeded/,
      /Rendered more hooks than during the previous render/,
      /Invalid hook call/,
      /Objects are not valid as a React child/
    ];

    return componentErrorPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Check if error is a logic/assertion error (their fault)
   */
  private isLogicError(output: string): boolean {
    const logicPatterns = [
      /expect\(.*\)\.toBe/,
      /expect\(.*\)\.toEqual/,
      /AssertionError/,
      /Expected.*but received/,
      /toHaveBeenCalled/,
      /toHaveTextContent/,
      /toBeInTheDocument/
    ];

    // Logic error if it's an assertion failure (test ran but assertion failed)
    return logicPatterns.some(pattern => pattern.test(output)) && 
           !this.isSyntaxError(output) && 
           !this.isImportError(output);
  }

  /**
   * Extract error message from output
   */
  private extractErrorMessage(output: string): string {
    // Try to find the actual error message
    const errorMatch = output.match(/Error: (.+?)(?:\n|$)/);
    if (errorMatch) {
      return errorMatch[1].trim();
    }

    // Try to find assertion error
    const assertionMatch = output.match(/Expected: (.+?)\n.*Received: (.+?)(?:\n|$)/);
    if (assertionMatch) {
      return `Expected ${assertionMatch[1]} but received ${assertionMatch[2]}`;
    }

    // Fallback: first line with "Error" or "FAIL"
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Error:') || line.includes('FAIL')) {
        return line.trim();
      }
    }

    return 'Unknown error';
  }

  /**
   * Extract test names from output
   */
  private extractTestNames(output: string): string[] {
    const testNames: string[] = [];
    
    // Look for test names in output
    const testNamePattern = /(?:✓|✗|PASS|FAIL)\s+(.+?)(?:\s+\(|$)/g;
    let match;
    while ((match = testNamePattern.exec(output)) !== null) {
      testNames.push(match[1].trim());
    }

    // Also look for "describe" blocks
    const describePattern = /describe\(['"](.+?)['"]/g;
    while ((match = describePattern.exec(output)) !== null) {
      testNames.push(match[1].trim());
    }

    return [...new Set(testNames)]; // Remove duplicates
  }

  /**
   * Generate suggestions for component errors
   */
  private generateComponentSuggestions(output: string): string[] {
    const suggestions: string[] = [];

    if (/Cannot read propert.*of undefined/.test(output)) {
      suggestions.push('Component is accessing a property on undefined');
      suggestions.push('Add null/undefined checks before accessing properties');
      suggestions.push('Check if props are being passed correctly');
    }

    if (/is not a function/.test(output)) {
      suggestions.push('Component is calling something that is not a function');
      suggestions.push('Check if the function exists and is properly defined');
      suggestions.push('Verify function is passed as a prop if needed');
    }

    if (/Maximum update depth exceeded/.test(output)) {
      suggestions.push('Component has an infinite render loop');
      suggestions.push('Check useEffect dependencies');
      suggestions.push('Verify state updates are not triggering re-renders infinitely');
    }

    if (/Invalid hook call/.test(output)) {
      suggestions.push('Hooks are being called incorrectly');
      suggestions.push('Ensure hooks are called at the top level of component');
      suggestions.push('Check hook dependencies are correct');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review component implementation');
      suggestions.push('Check component props and state management');
      suggestions.push('Verify component handles edge cases');
    }

    return suggestions;
  }

  /**
   * Generate suggestions for logic errors
   */
  private generateLogicSuggestions(output: string): string[] {
    const suggestions: string[] = [];

    if (/Expected.*but received/.test(output)) {
      suggestions.push('Component behavior does not match expected output');
      suggestions.push('Review component logic and return values');
      suggestions.push('Check if component handles all input cases correctly');
    }

    if (/toHaveBeenCalled/.test(output)) {
      suggestions.push('Event handler was not called as expected');
      suggestions.push('Verify event binding is correct');
      suggestions.push('Check if component properly handles user interactions');
    }

    if (/toBeInTheDocument/.test(output)) {
      suggestions.push('Component or element is not rendering');
      suggestions.push('Check component render conditions');
      suggestions.push('Verify JSX is being returned correctly');
    }

    if (suggestions.length === 0) {
      suggestions.push('Component logic may need adjustment');
      suggestions.push('Review test expectations vs actual component behavior');
    }

    return suggestions;
  }
}

