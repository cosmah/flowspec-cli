/**
 * FlowSpec CLI - Code Parser
 * Simplified AST parsing for code chunking
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeChunk {
  content: string;
  importPath: string;
  symbolsDefined: string[];
  dependencies: string[];
  chunkType: 'component' | 'hook' | 'util' | 'type';
}

export class CodeParser {
  /**
   * Parse a file and create code chunks
   */
  async parseFile(filePath: string): Promise<CodeChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // For now, create a single chunk per file
    // In production, you'd use proper AST parsing like in your original parser.ts
    const chunk: CodeChunk = {
      content,
      importPath: relativePath,
      symbolsDefined: this.extractSymbols(content),
      dependencies: this.extractImports(content),
      chunkType: this.determineChunkType(filePath, content)
    };

    return [chunk];
  }

  /**
   * Extract exported symbols from code
   */
  private extractSymbols(content: string): string[] {
    const symbols: string[] = [];
    
    // Extract export default
    const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (defaultExportMatch) {
      symbols.push(defaultExportMatch[1]);
    }

    // Extract named exports
    const namedExports = content.match(/export\s+(?:const|function|class)\s+(\w+)/g);
    if (namedExports) {
      namedExports.forEach(exp => {
        const match = exp.match(/export\s+(?:const|function|class)\s+(\w+)/);
        if (match) {
          symbols.push(match[1]);
        }
      });
    }

    // Extract export { ... }
    const exportBlocks = content.match(/export\s*\{([^}]+)\}/g);
    if (exportBlocks) {
      exportBlocks.forEach(block => {
        const names = block.match(/\{([^}]+)\}/);
        if (names) {
          const exportNames = names[1].split(',').map(name => name.trim().split(' as ')[0]);
          symbols.push(...exportNames);
        }
      });
    }

    return symbols;
  }

  /**
   * Extract import dependencies from code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(imp => {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          imports.push(match[1]);
        }
      });
    }

    return imports;
  }

  /**
   * Determine the type of code chunk
   */
  private determineChunkType(filePath: string, content: string): CodeChunk['chunkType'] {
    const fileName = path.basename(filePath);
    
    // Check for React components
    if (/\.(tsx|jsx)$/.test(filePath) && /React|JSX\.Element|return\s*\(?\s*</.test(content)) {
      return 'component';
    }

    // Check for hooks
    if (fileName.startsWith('use') && /function\s+use\w+/.test(content)) {
      return 'hook';
    }

    // Check for types
    if (/\.(ts|tsx)$/.test(filePath) && /(interface|type)\s+\w+/.test(content)) {
      return 'type';
    }

    // Default to utility
    return 'util';
  }
}