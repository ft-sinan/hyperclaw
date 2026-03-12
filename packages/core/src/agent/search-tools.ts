/**
 * search-tools.ts
 * Web search tools with grounding — Brave LLM Context API.
 * Returns pre-extracted content for LLM consumption.
 */

import https from 'https';
import type { Tool } from './inference';
import { resolveBraveApiKey } from '../../../../src/infra/env-resolve';

const BRAVE_LLM_CONTEXT_URL = 'https://api.search.brave.com/res/v1/llm/context';

function braveLlmContextRequest(
  apiKey: string,
  query: string,
  opts?: { maxTokens?: number; count?: number; thresholdMode?: string }
): Promise<{ grounding?: { generic?: Array<{ url: string; title: string; snippets: string[] }> }; sources?: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const maxTokens = opts?.maxTokens ?? 8192;
    const count = opts?.count ?? 20;
    const thresholdMode = opts?.thresholdMode ?? 'balanced';
    const body = JSON.stringify({
      q: query,
      maximum_number_of_tokens: maxTokens,
      count,
      context_threshold_mode: thresholdMode
    });
    const req = https.request(
      {
        hostname: 'api.search.brave.com',
        port: 443,
        path: '/res/v1/llm/context',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Subscription-Token': apiKey
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c.toString(); });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch {
            reject(new Error('Invalid JSON from Brave LLM Context API'));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Brave LLM Context request timeout')); });
    req.write(body);
    req.end();
  });
}

export function getSearchTools(
  cfg: { webSearch?: { provider?: string; apiKey?: string }; skills?: { apiKeys?: Record<string, string> } } | null
): Tool[] {
  const braveKey = resolveBraveApiKey(cfg);
  const tools: Tool[] = [];

  if (braveKey) {
    tools.push({
      name: 'brave_llm_context',
      description: 'Web search with grounding: get pre-extracted, relevance-scored content from the web for LLM context. Use for research, fact-checking, current events, documentation lookup. Returns actual page content (snippets) ready for reasoning—no scraping needed.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (1–400 chars, max 50 words)' },
          max_tokens: { type: 'string', description: 'Token budget 1024–32768 (default 8192)' },
          count: { type: 'string', description: 'Max URLs 1–50 (default 20)' }
        },
        required: ['query']
      },
      handler: async (input) => {
        const query = String(input.query || '').trim().slice(0, 400);
        if (!query) return 'Error: query is required.';
        const maxTokens = Math.min(32768, Math.max(1024, parseInt(String(input.max_tokens || 8192), 10) || 8192));
        const count = Math.min(50, Math.max(1, parseInt(String(input.count || 20), 10) || 20));
        try {
          const res = await braveLlmContextRequest(braveKey, query, {
            maxTokens,
            count,
            thresholdMode: 'balanced'
          });
          const generic = res?.grounding?.generic ?? [];
          if (generic.length === 0) return 'No relevant web content found for this query.';
          const parts: string[] = [];
          for (const item of generic) {
            const snips = (item.snippets ?? []).filter(Boolean).join('\n');
            if (snips) parts.push(`[${item.title}](${item.url})\n${snips}\n`);
          }
          return parts.join('\n---\n\n').slice(0, 16000) || 'No snippets extracted.';
        } catch (e: unknown) {
          return `Error: ${(e as Error).message}. Check Brave API key (api.search.brave.com) or configure via wizard.`;
        }
      }
    });
  }

  return tools;
}
