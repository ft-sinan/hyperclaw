/**
 * @hyperclaw/rag — Retrieval-Augmented Generation, local document indexing.
 * Indexes documents into a vector store for semantic search. Requires memory-lancedb.
 */

export const RAG_VERSION = '0.1.0';

export interface RAGConfig {
  dbPath: string;
  apiKey?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface IndexedDoc {
  id: string;
  path: string;
  content: string;
  chunkIndex: number;
  metadata?: Record<string, string>;
}

export interface RAGResult {
  text: string;
  score: number;
  path: string;
  chunkIndex: number;
}

/**
 * Chunk text into overlapping segments for embedding.
 */
export function chunkText(
  text: string,
  opts: { size?: number; overlap?: number } = {}
): string[] {
  const size = opts.size ?? 1000;
  const overlap = opts.overlap ?? 200;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks.filter(c => c.trim().length > 0);
}
