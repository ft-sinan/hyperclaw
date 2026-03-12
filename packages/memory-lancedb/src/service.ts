/**
 * VectorMemoryService — integrates VectorMemoryStore + embedder + MemoryManager.
 */

import { VectorMemoryStore, type MemoryItem } from './index';
import { createEmbedder } from './embedder';
import { randomUUID } from 'crypto';

export interface VectorMemoryServiceConfig {
  dbPath: string;
  apiKey?: string;
  /** 'openai' (default) or 'gemini' for gemini-embedding-2-preview */
  embeddingProvider?: 'openai' | 'gemini';
}

export class VectorMemoryService {
  private store: VectorMemoryStore;
  private config: VectorMemoryServiceConfig;
  private _embedder: ((texts: string[]) => Promise<number[][]>) | null = null;

  constructor(config: VectorMemoryServiceConfig) {
    this.config = config;
    this.store = new VectorMemoryStore({ dbPath: config.dbPath });
  }

  async init(): Promise<void> {
    await this.store.init();
    const provider = this.config.embeddingProvider ?? 'openai';
    const apiKey = this.config.apiKey ?? (provider === 'gemini' ? process.env.GOOGLE_AI_API_KEY : process.env.OPENAI_API_KEY);
    this._embedder = await createEmbedder({ apiKey, provider });
  }

  private async getEmbedder(): Promise<(texts: string[]) => Promise<number[][]>> {
    if (!this._embedder) await this.init();
    return this._embedder!;
  }

  async addMemory(text: string, category?: string, sessionId?: string): Promise<void> {
    const embedder = await this.getEmbedder();
    const vectors = await embedder([text]);
    const embedding = vectors[0];
    const item: MemoryItem & { embedding: number[] } = {
      id: randomUUID(),
      text,
      category,
      sessionId,
      timestamp: new Date().toISOString(),
      embedding
    };
    await this.store.add([item]);
  }

  async search(query: string, limit = 10): Promise<MemoryItem[]> {
    const embedder = await this.getEmbedder();
    const [queryEmbedding] = await embedder([query]);
    return this.store.search(queryEmbedding, limit);
  }

  /** Add image to multimodal memory (requires Gemini embedding provider). */
  async addImage(imagePath: string, caption?: string): Promise<void> {
    await this.init();
    if (this.config.embeddingProvider !== 'gemini') {
      throw new Error('Multimodal memory (image) requires embeddingProvider: "gemini"');
    }
    const { createGeminiMultimodalEmbedder, addImageToMemory } = await import('./multimodal');
    const apiKey = this.config.apiKey ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY required for multimodal memory');
    const embedder = createGeminiMultimodalEmbedder(apiKey);
    await addImageToMemory(this.store, embedder, imagePath, caption);
  }

  /** Add audio to multimodal memory (requires Gemini embedding provider). */
  async addAudio(audioPath: string, transcript?: string): Promise<void> {
    await this.init();
    if (this.config.embeddingProvider !== 'gemini') {
      throw new Error('Multimodal memory (audio) requires embeddingProvider: "gemini"');
    }
    const { createGeminiMultimodalEmbedder, addAudioToMemory } = await import('./multimodal');
    const apiKey = this.config.apiKey ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY required for multimodal memory');
    const embedder = createGeminiMultimodalEmbedder(apiKey);
    await addAudioToMemory(this.store, embedder, audioPath, transcript);
  }
}
