/**
 * FlowSpec CLI - Test Generator
 * Handles test generation, file watching, and test execution
 */
interface GenerateOptions {
    watch?: boolean;
}
export declare class TestGenerator {
    private authManager;
    private projectManager;
    private apiUrl;
    private watcher;
    constructor();
    /**
     * Generate tests for specific files
     */
    generateTests(files: string[], options?: GenerateOptions): Promise<void>;
    /**
     * Start watching for file changes
     */
    startWatching(projectRoot: string): Promise<void>;
    /**
     * Stop the file watcher
     */
    stopWatching(): Promise<void>;
    /**
     * Handle file system changes
     */
    private handleFileChange;
    /**
     * Generate test for a single component
     */
    private generateTestForComponent;
    /**
     * Check if file is testable (React component)
     */
    private isTestableFile;
    /**
     * Get test file path for a component
     */
    private getTestFilePath;
    /**
     * Ensure test directory exists
     */
    private ensureTestDirectory;
}
export {};
//# sourceMappingURL=generator.d.ts.map