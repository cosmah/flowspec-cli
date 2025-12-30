/**
 * FlowSpec CLI - Project Manager
 * Handles project initialization, codebase embedding, and dashboard integration
 */
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
export declare class ProjectManager {
    private authManager;
    private codeParser;
    private apiUrl;
    constructor();
    /**
     * Initialize FlowSpec in a project
     */
    initProject(projectRoot: string, options?: InitOptions): Promise<void>;
    /**
     * Embed the codebase for AI context
     */
    embedCodebase(projectRoot: string): Promise<void>;
    /**
     * Show project status
     */
    showStatus(projectRoot: string): Promise<void>;
    /**
     * Open the web dashboard
     */
    openDashboard(): Promise<void>;
    /**
     * Get project configuration
     */
    getProjectConfig(projectRoot: string): ProjectConfig | null;
    /**
     * Detect framework from package.json
     */
    private detectFramework;
    /**
     * Update .gitignore to exclude FlowSpec files
     */
    private updateGitignore;
    /**
     * Ensure Vitest is installed
     */
    private ensureVitest;
    /**
     * Ensure test script exists in package.json
     */
    private ensureTestScript;
    /**
     * Ensure tsconfig.json includes Vitest types
     */
    private ensureVitestTypes;
}
export {};
//# sourceMappingURL=manager.d.ts.map