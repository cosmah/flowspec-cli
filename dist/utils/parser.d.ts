/**
 * FlowSpec CLI - Code Parser
 * Simplified AST parsing for code chunking with data archetype detection
 */
interface CodeChunk {
    content: string;
    importPath: string;
    symbolsDefined: string[];
    dependencies: string[];
    chunkType: 'component' | 'hook' | 'util' | 'type';
}
interface DataArchetypes {
    factories: string[];
    mocks: string[];
    testData: string[];
    designSystem?: string;
}
export declare class CodeParser {
    private projectRoot;
    private archetypesCache;
    constructor(projectRoot?: string);
    /**
     * Detect data archetypes in the project (factories, mocks, test data)
     */
    detectDataArchetypes(): Promise<DataArchetypes>;
    /**
     * Detect which design system is being used
     */
    private detectDesignSystem;
    /**
     * Parse a file and create code chunks
     */
    parseFile(filePath: string): Promise<CodeChunk[]>;
    /**
     * Extract exported symbols from code
     */
    private extractSymbols;
    /**
     * Extract import dependencies from code
     */
    private extractImports;
    /**
     * Determine the type of code chunk
     */
    private determineChunkType;
}
export {};
//# sourceMappingURL=parser.d.ts.map