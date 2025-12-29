"use strict";
/**
 * FlowSpec CLI - Code Parser
 * Simplified AST parsing for code chunking
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CodeParser {
    /**
     * Parse a file and create code chunks
     */
    async parseFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);
        // For now, create a single chunk per file
        // In production, you'd use proper AST parsing like in your original parser.ts
        const chunk = {
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
    extractSymbols(content) {
        const symbols = [];
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
    extractImports(content) {
        const imports = [];
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
    determineChunkType(filePath, content) {
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
exports.CodeParser = CodeParser;
//# sourceMappingURL=parser.js.map