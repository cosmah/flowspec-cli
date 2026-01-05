/**
 * FlowSpec CLI - Code Parser
 * Simplified AST parsing for code chunking with data archetype detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface CodeChunk {
  content: string;
  importPath: string;
  symbolsDefined: string[];
  dependencies: string[];
  chunkType: 'component' | 'hook' | 'util' | 'type';
}

interface DataArchetypes {
  factories: string[]; // Paths to factory files (e.g., userFactory.ts)
  mocks: string[]; // Paths to mock files
  testData: string[]; // Paths to test data files
  designSystem?: string; // Detected design system (shadcn, mui, etc.)
}

export class CodeParser {
  private projectRoot: string;
  private archetypesCache: DataArchetypes | null = null;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Detect data archetypes in the project (factories, mocks, test data)
   */
  async detectDataArchetypes(): Promise<DataArchetypes> {
    if (this.archetypesCache) {
      return this.archetypesCache;
    }

    const archetypes: DataArchetypes = {
      factories: [],
      mocks: [],
      testData: []
    };

    try {
      // Look for factories/ directory
      const factoryPatterns = [
        'factories/**/*.{ts,tsx,js,jsx}',
        '**/*factory*.{ts,tsx,js,jsx}',
        '**/*Factory*.{ts,tsx,js,jsx}'
      ];

      for (const pattern of factoryPatterns) {
        const matches = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
        });
        archetypes.factories.push(...matches.map(m => path.join(this.projectRoot, m)));
      }

      // Look for mocks/ directory
      const mockPatterns = [
        'mocks/**/*.{ts,tsx,js,jsx}',
        '**/__mocks__/**/*.{ts,tsx,js,jsx}',
        '**/*mock*.{ts,tsx,js,jsx}',
        '**/*Mock*.{ts,tsx,js,jsx}'
      ];

      for (const pattern of mockPatterns) {
        const matches = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
        });
        archetypes.mocks.push(...matches.map(m => path.join(this.projectRoot, m)));
      }

      // Look for test data files
      const testDataPatterns = [
        'test-data/**/*.{ts,tsx,js,jsx}',
        'fixtures/**/*.{ts,tsx,js,jsx}',
        '**/*fixture*.{ts,tsx,js,jsx}'
      ];

      for (const pattern of testDataPatterns) {
        const matches = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
        });
        archetypes.testData.push(...matches.map(m => path.join(this.projectRoot, m)));
      }

      // Detect design system
      archetypes.designSystem = await this.detectDesignSystem();

      this.archetypesCache = archetypes;
    } catch (error) {
      // Silently fail - archetype detection is optional
    }

    return archetypes;
  }

  /**
   * Detect which design system is being used
   */
  private async detectDesignSystem(): Promise<string | undefined> {
    try {
      // Check package.json for design system dependencies
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Check for Shadcn (looks for components/ui directory)
        const shadcnUiPath = path.join(this.projectRoot, 'components', 'ui');
        if (fs.existsSync(shadcnUiPath)) {
          return 'shadcn';
        }

        // Check for MUI
        if (deps['@mui/material'] || deps['@material-ui/core']) {
          return 'mui';
        }

        // Check for Chakra UI
        if (deps['@chakra-ui/react']) {
          return 'chakra';
        }

        // Check for Ant Design
        if (deps['antd']) {
          return 'antd';
        }
      }
    } catch (error) {
      // Silently fail
    }

    return undefined;
  }
  /**
   * Parse a file and create code chunks
   */
  async parseFile(filePath: string): Promise<CodeChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);
    
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