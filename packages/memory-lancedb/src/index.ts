/**
 * @hyperclaw/memory-lancedb
 * Vector DB memory — semantic search over conversation history.
 *
 * Stores memory items with embeddings for similarity search.
 * Use with hyperclaw.json: memory: { vectorDb: { enabled: true } }
 */

import path from 'path';
import fs from 'fs-extra';

export interface MemoryItem {
  id: string;
  text: string;
  category?: string;
  sessionId?: string;
  timestamp: string;
}

export interface VectorMemoryStoreConfig {
  dbPath: string;
  tableName?: string;
  embeddingDimensions?: number;
}

export class VectorMemoryStore {
  private dbPath: string;
  private tableName: string;
  private db: any = null;
  private table: any = null;

  constructor(config: VectorMemoryStoreConfig) {
    this.dbPath = config.dbPath;
    this.tableName = config.tableName ?? 'hyperclaw_memory';
  }

  async init(): Promise<void> {
    const lancedb = await import('vectordb').catch(() => null);
    if (!lancedb) {
      throw new Error('vectordb not installed. Run: npm install vectordb');
    }
    await fs.ensureDir(path.dirname(this.dbPath));
    this.db = await lancedb.connect(this.dbPath);
    try {
      this.table = await this.db.openTable(this.tableName);
    } catch {
      this.table = null;
    }
  }

  /** Add memory items with pre-computed embeddings */
  async add(items: Array<MemoryItem & { embedding: number[] }>): Promise<void> {
    if (!this.db) await this.init();
    const rows = items.map(({ embedding, ...rest }) => ({
      vector: embedding,
      ...rest
    }));
    if (this.table) {
      await this.table.add(rows);
    } else {
      this.table = await this.db.createTable(this.tableName, rows);
    }
  }

  /** Semantic search — pass query embedding, returns top-k similar items */
  async search(queryEmbedding: number[], limit = 10): Promise<MemoryItem[]> {
    if (!this.db || !this.table) return [];
    const results = await this.table.search(queryEmbedding).limit(limit).execute();
    return (results || []).map((r: any) => ({
      id: r.id,
      text: r.text,
      category: r.category,
      sessionId: r.sessionId,
      timestamp: r.timestamp
    }));
  }

  async close(): Promise<void> {
    this.db = null;
    this.table = null;
  }
}

export { VectorMemoryService } from './service';
export { createEmbedder } from './embedder';
