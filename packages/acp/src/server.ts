/**
 * ACP Server — Agent Client Protocol over stdio (JSON-RPC 2.0).
 * Enables IDE integration (VS Code, Zed, Cursor, Codex).
 */

import path from 'path';
import crypto from 'crypto';
import type {
  InitializeParams,
  InitializeResult,
  SessionNewParams,
  SessionNewResult,
  SessionLoadParams,
  SessionPromptParams,
  SessionPromptResult,
  SessionCancelParams,
  JsonRpcRequest,
  JsonRpcResponse
} from './types';

export type SendUpdate = (params: { sessionId: string; update: unknown }) => void;

interface AcpSession {
  id: string;
  cwd: string;
  transcript: Array<{ role: string; content: string }>;
  created: string;
  lastActive: string;
}

export class ACPServer {
  private sessions = new Map<string, AcpSession>();
  private initialized = false;
  private sendUpdate: SendUpdate;
  private cancelCurrent: (() => void) | null = null;

  constructor(sendUpdate: SendUpdate) {
    this.sendUpdate = sendUpdate;
  }

  private sendResponse(id: number | string | undefined, result?: unknown, error?: JsonRpcResponse['error']): void {
    const msg: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      ...(error ? { error } : { result: result ?? null })
    };
    this.write(JSON.stringify(msg));
  }

  write(raw: string): void {
    const buf = Buffer.from(raw, 'utf8');
    process.stdout.write(`Content-Length: ${buf.length}\r\n\r\n`, 'utf8');
    process.stdout.write(buf, 'utf8');
  }

  async handleInitialize(params: InitializeParams): Promise<InitializeResult> {
    this.initialized = true;
    return {
      protocolVersion: params.protocolVersion ?? 1,
      agentCapabilities: {
        loadSession: true,
        promptCapabilities: {
          image: true,
          audio: false,
          embeddedContext: true
        },
        mcp: { http: true, sse: false }
      },
      agentInfo: {
        name: 'hyperclaw',
        title: 'HyperClaw',
        version: '5.4.2'
      },
      authMethods: []
    };
  }

  async handleSessionNew(params: SessionNewParams): Promise<SessionNewResult> {
    const id = `sess_${crypto.randomBytes(8).toString('hex')}`;
    const cwd = params.cwd ? path.resolve(params.cwd) : process.cwd();
    const now = new Date().toISOString();
    this.sessions.set(id, {
      id,
      cwd,
      transcript: [],
      created: now,
      lastActive: now
    });
    return { sessionId: id };
  }

  async handleSessionLoad(params: SessionLoadParams): Promise<void> {
    const sess = this.sessions.get(params.sessionId);
    if (!sess) {
      // Try to load from ~/.hyperclaw/threads (thread ids are hex, no sess_ prefix)
      const { ACPThreadManager } = await import('@hyperclaw/core');
      const mgr = new ACPThreadManager();
      const threadId = params.sessionId.startsWith('sess_') ? params.sessionId.slice(5) : params.sessionId;
      const thread = await mgr.get(threadId);
      if (!thread) throw new Error(`Session not found: ${params.sessionId}`);
      const cwd = params.cwd ? path.resolve(params.cwd) : (thread.workspace || process.cwd());
      const transcript = thread.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      const sess2: AcpSession = {
        id: params.sessionId,
        cwd,
        transcript,
        created: thread.createdAt,
        lastActive: thread.lastActiveAt
      };
      this.sessions.set(params.sessionId, sess2);
      for (const t of transcript) {
        this.sendUpdate({
          sessionId: params.sessionId,
          update: {
            sessionUpdate: t.role === 'user' ? 'user_message_chunk' : 'agent_message_chunk',
            content: { type: 'text', text: t.content }
          }
        });
      }
      return;
    }
    for (const t of sess.transcript) {
      this.sendUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: t.role === 'user' ? 'user_message_chunk' : 'agent_message_chunk',
          content: { type: 'text', text: t.content }
        }
      });
    }
  }

  async handleSessionPrompt(params: SessionPromptParams): Promise<SessionPromptResult> {
    const sess = this.sessions.get(params.sessionId);
    if (!sess) throw new Error(`Session not found: ${params.sessionId}`);

    const parts: string[] = [];
    const images: Array<{ data: string; mimeType?: string }> = [];
    for (const p of params.prompt) {
      if (p.type === 'text') parts.push(p.text);
      else if (p.type === 'resource') parts.push(p.resource.text ?? '');
      else if (p.type === 'image' && p.image?.data) {
        const mime = p.image.mimeType || 'image/png';
        images.push({ data: p.image.data, mimeType: mime });
      }
    }
    const userText = parts.filter(Boolean).join('\n');
    const imageRefs = images.map((img, i) =>
      `[Attached image ${i + 1} — use analyze_image with data URI: data:${img.mimeType || 'image/png'};base64,${img.data}]`
    ).join('\n');
    const fullMessage = [userText, imageRefs].filter(Boolean).join('\n\n') || userText;
    if (!fullMessage.trim() && images.length === 0) throw new Error('Empty prompt');

    sess.transcript.push({ role: 'user', content: fullMessage });
    sess.lastActive = new Date().toISOString();

    const abortController = new AbortController();
    this.cancelCurrent = () => abortController.abort();

    let stopReason: SessionPromptResult['stopReason'] = 'end_turn';
    try {
      const { runAgentEngine } = await import('@hyperclaw/core');
      const toolCallIds = new Map<string, string>();

      const result = await runAgentEngine(userText || fullMessage, {
        sessionId: params.sessionId,
        imageBlocks: images.length ? images : undefined,
        source: 'acp',
        elevated: true,
        transcript: sess.transcript.slice(0, -1),
        workspace: sess.cwd,
        modelOverride: undefined,
        getTranscript: async () => sess.transcript.slice(0, -1),
        appendTranscript: (key, role, content) => {
          sess.transcript.push({ role, content });
          sess.lastActive = new Date().toISOString();
        },
        onToken: (token) => {
          this.sendUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: token }
            }
          });
        },
        onThinking: (thought) => {
          this.sendUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: 'thought_chunk',
              content: { type: 'text', text: thought }
            }
          });
        },
        onToolCall: (name, input) => {
          const id = `call_${crypto.randomBytes(4).toString('hex')}`;
          toolCallIds.set(name, id);
          this.sendUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: 'tool_call',
              toolCallId: id,
              title: name,
              kind: 'other',
              status: 'pending'
            }
          });
        },
        onToolResult: (name) => {
          const id = toolCallIds.get(name);
          if (id) {
            this.sendUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'tool_call_update',
                toolCallId: id,
                status: 'completed'
              }
            });
          }
        }
      });

      if (result.error === 'cancelled') stopReason = 'cancelled';
      sess.transcript.push({ role: 'assistant', content: result.text || '' });
      sess.lastActive = new Date().toISOString();
    } catch (e: unknown) {
      const err = e as Error & { name?: string };
      if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
        stopReason = 'cancelled';
      } else {
        throw e;
      }
    } finally {
      this.cancelCurrent = null;
    }

    return { stopReason };
  }

  handleSessionCancel(params: SessionCancelParams): void {
    if (this.cancelCurrent) this.cancelCurrent();
  }

  getSession(sessionId: string): AcpSession | undefined {
    return this.sessions.get(sessionId);
  }

  async dispatch(req: JsonRpcRequest): Promise<void> {
    const { id, method, params = {} } = req;
    if (!this.initialized && method !== 'initialize') {
      this.sendResponse(id, undefined, { code: -32002, message: 'Not initialized' });
      return;
    }
    try {
      let result: unknown;
      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params as InitializeParams);
          break;
        case 'session/new':
          result = await this.handleSessionNew(params as SessionNewParams);
          break;
        case 'session/load':
          result = await this.handleSessionLoad(params as SessionLoadParams);
          break;
        case 'session/prompt':
          result = await this.handleSessionPrompt(params as SessionPromptParams);
          break;
        case 'session/cancel':
          this.handleSessionCancel(params as SessionCancelParams);
          result = null;
          break;
        default:
          this.sendResponse(id, undefined, { code: -32601, message: `Method not found: ${method}` });
          return;
      }
      if (method !== 'session/cancel') {
        this.sendResponse(id, result);
      }
    } catch (e: unknown) {
      const err = e as Error;
      this.sendResponse(id, undefined, {
        code: -32603,
        message: err?.message ?? 'Internal error',
        data: { stack: (err as Error)?.stack }
      });
    }
  }
}

/**
 * Run ACP server on stdio (Content-Length delimited JSON-RPC).
 */
export async function runACPStdio(): Promise<void> {
  const sendUpdate: SendUpdate = (params) => {
    const msg = {
      jsonrpc: '2.0',
      method: 'session/update',
      params
    };
    const raw = JSON.stringify(msg);
    const buf = Buffer.from(raw, 'utf8');
    process.stdout.write(`Content-Length: ${buf.length}\r\n\r\n`, 'utf8');
    process.stdout.write(buf, 'utf8');
  };

  const server = new ACPServer(sendUpdate);

  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    for (;;) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;
      const headers = buffer.slice(0, headerEnd);
      const bodyStart = headerEnd + 4;
      const contentLen = /Content-Length:\s*(\d+)/i.exec(headers)?.[1];
      if (!contentLen) {
        buffer = buffer.slice(bodyStart);
        continue;
      }
      const len = parseInt(contentLen, 10);
      if (buffer.length < bodyStart + len) break;
      const body = buffer.slice(bodyStart, bodyStart + len);
      buffer = buffer.slice(bodyStart + len);
      try {
        const req = JSON.parse(body) as JsonRpcRequest;
        server.dispatch(req);
      } catch {
        // malformed JSON — ignore
      }
    }
  });
}
