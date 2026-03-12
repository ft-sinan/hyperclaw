/**
 * Multi-agent collaboration — call remote HyperClaw instances via their gateways.
 * Uses multiAgent.remotes in config: { agentId: { url, token? } }.
 */

import https from 'https';
import http from 'http';
import type { Tool } from './inference';
import type { HyperClawConfig } from '../../../shared/src/index';

function postChat(
  baseUrl: string,
  message: string,
  authToken?: string,
  agentId?: string
): Promise<{ response?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(baseUrl);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const body = JSON.stringify({
      message,
      ...(agentId ? { agentId } : {})
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString()
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const opts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: (u.pathname || '/').replace(/\/$/, '') + '/api/chat',
      method: 'POST',
      headers
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode && res.statusCode >= 400) {
            resolve({ error: parsed.error || `HTTP ${res.statusCode}` });
          } else {
            resolve({ response: parsed.response });
          }
        } catch {
          resolve({ error: data || `HTTP ${res.statusCode}` });
        }
      });
    });
    req.on('error', e => reject(e));
    req.write(body);
    req.end();
  });
}

export function getMultiAgentTools(cfg: HyperClawConfig | null): Tool[] {
  const remotes = (cfg as { multiAgent?: { remotes?: Record<string, { url: string; token?: string }> } })?.multiAgent?.remotes;
  if (!remotes || Object.keys(remotes).length === 0) return [];

  const ids = Object.keys(remotes);
  const tool: Tool = {
    name: 'call_remote_agent',
    description: `Call another HyperClaw instance for collaborative tasks. Available remotes: ${ids.join(', ')}. Use when the user wants to delegate to a different agent or get help from another HyperClaw node.`,
    input_schema: {
      type: 'object',
      properties: {
        remote_id: {
          type: 'string',
          description: `Remote agent ID. One of: ${ids.join(', ')}`
        },
        message: {
          type: 'string',
          description: 'Message to send to the remote agent'
        }
      },
      required: ['remote_id', 'message']
    },
    handler: async (input: Record<string, unknown>) => {
      const remoteId = String(input.remote_id || '').trim();
      const message = String(input.message || '');
      if (!remotes[remoteId]) {
        return `Error: Unknown remote "${remoteId}". Available: ${ids.join(', ')}. Configure via multiAgent.remotes in hyperclaw.json.`;
      }
      if (!message) return 'Error: message is required.';
      const r = remotes[remoteId];
      try {
        const res = await postChat(r.url, message, r.token, remoteId);
        if (res.error) return `Remote ${remoteId}: ${res.error}`;
        return res.response ?? '(empty response)';
      } catch (e: unknown) {
        return `Remote ${remoteId}: ${(e as Error).message}`;
      }
    }
  };
  return [tool];
}
