/**
 * FlowSpec CLI - Smart Caching System
 * AST-based caching to skip API calls for unchanged components
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CacheEntry {
  componentHash: string;
  testCode: string;
  isPassing: boolean;
  attempts: number;
  timestamp: number;
  componentPath: string;
}

interface CacheData {
  entries: Record<string, CacheEntry>;
  version: string;
}

export class CacheManager {
  private cachePath: string;
  private cache: CacheData;
  private readonly CACHE_VERSION = '1.0.0';

  constructor(projectRoot: string) {
    const flowspecDir = path.join(projectRoot, '.flowspec');
    this.cachePath = path.join(flowspecDir, 'cache.json');
    
    // Ensure .flowspec directory exists
    if (!fs.existsSync(flowspecDir)) {
      fs.mkdirSync(flowspecDir, { recursive: true });
    }
    
    this.cache = this.loadCache();
  }

  /**
   * Generate a hash of component code (normalized to ignore whitespace/comments)
   * This is a simple hash - for production, consider AST-based hashing
   */
  hashComponent(componentCode: string): string {
    // Normalize: remove comments, normalize whitespace, remove trailing semicolons
    // Also remove export keywords to focus on actual code
    const normalized = componentCode
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/export\s+(default\s+)?/g, '') // Remove export keywords (structure matters, not export)
      .replace(/;\s*$/, '') // Remove trailing semicolons
      .trim();
    
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get cache key for a component file
   */
  private getCacheKey(componentPath: string): string {
    return path.resolve(componentPath);
  }

  /**
   * Check if component is cached and unchanged
   */
  isCached(componentPath: string, componentCode: string): boolean {
    const key = this.getCacheKey(componentPath);
    const entry = this.cache.entries[key];
    
    if (!entry) {
      return false;
    }
    
    const currentHash = this.hashComponent(componentCode);
    return entry.componentHash === currentHash;
  }

  /**
   * Get cached test code if available
   */
  getCached(componentPath: string, componentCode: string): CacheEntry | null {
    if (!this.isCached(componentPath, componentCode)) {
      return null;
    }
    
    const key = this.getCacheKey(componentPath);
    return this.cache.entries[key];
  }

  /**
   * Store test result in cache
   */
  setCache(componentPath: string, componentCode: string, testCode: string, isPassing: boolean, attempts: number): void {
    const key = this.getCacheKey(componentPath);
    const hash = this.hashComponent(componentCode);
    
    this.cache.entries[key] = {
      componentHash: hash,
      testCode,
      isPassing,
      attempts,
      timestamp: Date.now(),
      componentPath
    };
    
    this.saveCache();
  }

  /**
   * Invalidate cache for a component
   */
  invalidate(componentPath: string): void {
    const key = this.getCacheKey(componentPath);
    delete this.cache.entries[key];
    this.saveCache();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.entries = {};
    this.saveCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; oldestEntry: number | null; newestEntry: number | null } {
    const entries = Object.values(this.cache.entries);
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: entries.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Load cache from disk
   */
  private loadCache(): CacheData {
    if (!fs.existsSync(this.cachePath)) {
      return {
        entries: {},
        version: this.CACHE_VERSION
      };
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
      
      // Migrate old cache format if needed
      if (data.version !== this.CACHE_VERSION) {
        return {
          entries: {},
          version: this.CACHE_VERSION
        };
      }
      
      return data;
    } catch (error) {
      // If cache is corrupted, start fresh
      return {
        entries: {},
        version: this.CACHE_VERSION
      };
    }
  }

  /**
   * Save cache to disk
   */
  private saveCache(): void {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      // Silently fail - caching is optional
      console.warn('Failed to save cache:', error);
    }
  }
}

