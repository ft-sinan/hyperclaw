/**
 * Multimodal memory — image + audio indexing with Gemini embeddings.
 * Uses gemini-embedding-2-preview for native multimodal embedding.
 */

import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import type { MemoryItem } from './index';
import type { VectorMemoryStore } from './index';

const GEMINI_EMBED_MODEL = 'models/gemini-embedding-2-preview';

export interface MultimodalEmbedder {
  embedText(text: string): Promise<number[]>;
  embedImage(base64Data: string, mimeType: string): Promise<number[]>;
  embedAudio(base64Data: string, mimeType: string): Promise<number[]>;
}

export function createGeminiMultimodalEmbedder(apiKey: string): MultimodalEmbedder {
  const base = 'https://generativelanguage.googleapis.com/v1beta';

  async function embedContent(parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>): Promise<number[]> {
    const res = await fetch(`${base}/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMINI_EMBED_MODEL,
        content: { parts },
        taskType: 'RETRIEVAL_DOCUMENT'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini multimodal embed failed: ${res.status} ${err}`);
    }
    const j = await res.json();
    const vec = j.embedding?.values;
    if (!Array.isArray(vec)) throw new Error('Gemini embed: missing embedding.values');
    return vec;
  }

  return {
    embedText: (text) => embedContent([{ text }]),
    embedImage: (data, mimeType) => embedContent([{ inlineData: { mimeType, data } }]),
    embedAudio: (data, mimeType) => embedContent([{ inlineData: { mimeType, data } }])
  };
}

export async function addImageToMemory(
  store: VectorMemoryStore,
  embedder: MultimodalEmbedder,
  imagePath: string,
  caption?: string
): Promise<void> {
  const buf = await fs.readFile(imagePath);
  const base64 = buf.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const embedding = await embedder.embedImage(base64, mimeType);
  const text = caption || `[image: ${path.basename(imagePath)}]`;
  const item: MemoryItem & { embedding: number[] } = {
    id: randomUUID(),
    text,
    category: 'image',
    timestamp: new Date().toISOString(),
    embedding
  };
  await store.add([item]);
}

export async function addAudioToMemory(
  store: VectorMemoryStore,
  embedder: MultimodalEmbedder,
  audioPath: string,
  transcript?: string
): Promise<void> {
  const buf = await fs.readFile(audioPath);
  const base64 = buf.toString('base64');
  const ext = path.extname(audioPath).toLowerCase();
  const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : ext === '.webm' ? 'audio/webm' : 'audio/mpeg';
  const embedding = await embedder.embedAudio(base64, mimeType);
  const text = transcript || `[audio: ${path.basename(audioPath)}]`;
  const item: MemoryItem & { embedding: number[] } = {
    id: randomUUID(),
    text,
    category: 'audio',
    timestamp: new Date().toISOString(),
    embedding
  };
  await store.add([item]);
}
