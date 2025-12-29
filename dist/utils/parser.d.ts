/**
 * FlowSpec CLI - Code Parser
 * Simplified AST parsing for code chunking
 */
interface CodeChunk {
    content: string;
    importPath: string;
    symbolsDefined: string[];
    dependencies: string[];
    chunkType: 'component' | 'hook' | 'util' | 'type';
}
export declare class CodeParser {
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