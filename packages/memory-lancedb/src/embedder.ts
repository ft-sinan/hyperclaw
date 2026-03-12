/**
 * Embedder — produces vectors for text.
 * Supports OpenAI text-embedding-3-small and Gemini gemini-embedding-2-preview.
 */

export type Embedder = (texts: string[]) => Promise<number[][]>;

export interface EmbedderOptions {
  apiKey?: string;
  provider?: 'openai' | 'gemini';
}

/** Create embedder from API key. Default: OpenAI. Use provider: 'gemini' for gemini-embedding-2-preview. */
export async function createEmbedder(apiKeyOrOpts?: string | EmbedderOptions): Promise<Embedder> {
  const opts = typeof apiKeyOrOpts === 'string' ? { apiKey: apiKeyOrOpts } : (apiKeyOrOpts ?? {});
  const apiKey = opts.apiKey;
  const provider = opts.provider ?? 'openai';

  if (provider === 'gemini' && apiKey) {
    return createGeminiEmbedder(apiKey);
  }

  if (apiKey) {
    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      return async (texts: string[]) => {
        const res = await client.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts
        });
        return res.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
      };
    } catch {
      /* openai not installed */
    }
  }
  // Fallback: zero vector (768 dims for text-embedding-3-small)
  const dims = 1536;
  return async (texts: string[]) => texts.map(() => new Array(dims).fill(0));
}

/** Gemini embedding via gemini-embedding-2-preview — for memory search (vector DB). */
async function createGeminiEmbedder(apiKey: string): Promise<Embedder> {
  const model = 'models/gemini-embedding-2-preview';
  const base = 'https://generativelanguage.googleapis.com/v1beta';

  return async (texts: string[]): Promise<number[][]> => {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const res = await fetch(`${base}/${model}:embedContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          content: { parts: [{ text: texts[i] }] },
          taskType: 'RETRIEVAL_DOCUMENT'
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini embed failed: ${res.status} ${err}`);
      }
      const j = await res.json();
      const vec = j.embedding?.values;
      if (!Array.isArray(vec)) throw new Error('Gemini embed: missing embedding.values');
      results.push(vec);
    }
    return results;
  };
}
