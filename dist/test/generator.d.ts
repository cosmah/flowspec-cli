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
    private cacheManager;
    private testExecutor;
    private silentMode;
    private lastNotification;
    constructor();
    /**
     * Initialize cache manager for a project
     */
    private initCache;
    /**
     * Initialize background test executor for a project
     */
    private initTestExecutor;
    /**
     * Silent notification (single-line update)
     */
    private silentNotify;
    /**
     * Clear silent notification
     */
    private clearSilentNotification;
    /**
     * Generate tests for specific files
     */
    generateTests(files: string[], options?: GenerateOptions): Promise<void>;
    /**
     * Count number of test cases in test code
     */
    private countTests;
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
     * Check if file is testable (React component, hook, or utility)
     */
    private isTestableFile;
    /**
     * Get test file path for a component
     */
    private getTestFilePath;
    /**
     * Execute test locally to verify it works
     */
    private executeTestLocally;
    /**
     * Ensure test directory exists
     */
    private ensureTestDirectory;
    /**
     * Trigger auto-healing for test syntax/import issues (our fault)
     */
    private triggerAutoHeal;
    /**
     * Check if error is a missing dependency error
     */
    private isMissingDependencyError;
    /**
     * Ensure all required dependencies are installed
     */
    private ensureDependencies;
    /**
     * Show component failure details to user (their fault)
     */
    private showComponentFailure;
}
export {};
//# sourceMappingURL=generator.d.ts.map