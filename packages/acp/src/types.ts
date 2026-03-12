/**
 * ACP (Agent Client Protocol) types — JSON-RPC 2.0 over stdio.
 * https://agentclientprotocol.com/protocol/overview
 */

export const PROTOCOL_VERSION = 1;

export interface InitializeParams {
  protocolVersion: number;
  clientCapabilities?: {
    fs?: { readTextFile?: boolean; writeTextFile?: boolean };
    terminal?: boolean;
  };
  clientInfo?: { name?: string; title?: string; version?: string };
}

export interface InitializeResult {
  protocolVersion: number;
  agentCapabilities?: {
    loadSession?: boolean;
    promptCapabilities?: { image?: boolean; audio?: boolean; embeddedContext?: boolean };
    mcp?: { http?: boolean; sse?: boolean };
  };
  agentInfo?: { name?: string; title?: string; version?: string };
  authMethods?: string[];
}

export interface SessionNewParams {
  cwd?: string;
  mcpServers?: Array<{
    name?: string;
    command?: string;
    args?: string[];
    env?: Array<{ name: string; value: string }>;
  }>;
}

export interface SessionNewResult {
  sessionId: string;
}

export interface SessionLoadParams {
  sessionId: string;
  cwd?: string;
  mcpServers?: SessionNewParams['mcpServers'];
}

export interface ContentBlockText {
  type: 'text';
  text: string;
}

export interface ContentBlockResource {
  type: 'resource';
  resource: { uri: string; mimeType?: string; text?: string };
}

export interface ContentBlockImage {
  type: 'image';
  image: { data: string; mimeType?: string };
}

export type ContentBlock = ContentBlockText | ContentBlockResource | ContentBlockImage;

export interface SessionPromptParams {
  sessionId: string;
  prompt: ContentBlock[];
}

export type StopReason = 'end_turn' | 'max_tokens' | 'max_requests' | 'stop' | 'cancelled';

export interface SessionPromptResult {
  stopReason: StopReason;
}

export interface SessionCancelParams {
  sessionId: string;
}

/** session/update notification — Agent → Client */
export type SessionUpdateKind =
  | 'user_message_chunk'
  | 'agent_message_chunk'
  | 'thought_chunk'
  | 'plan'
  | 'tool_call'
  | 'tool_call_update';

export interface SessionUpdateUserChunk {
  sessionUpdate: 'user_message_chunk';
  content: ContentBlockText;
}

export interface SessionUpdateAgentChunk {
  sessionUpdate: 'agent_message_chunk';
  content: ContentBlockText;
}

export interface SessionUpdateThoughtChunk {
  sessionUpdate: 'thought_chunk';
  content: ContentBlockText;
}

export interface SessionUpdatePlan {
  sessionUpdate: 'plan';
  entries: Array<{ content: string; priority?: string; status?: string }>;
}

export interface SessionUpdateToolCall {
  sessionUpdate: 'tool_call';
  toolCallId: string;
  title?: string;
  kind?: 'edit' | 'run_terminal_cmd' | 'read_file' | 'write_file' | 'other';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface SessionUpdateToolCallUpdate {
  sessionUpdate: 'tool_call_update';
  toolCallId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  content?: ContentBlock[];
}

export type SessionUpdateParams =
  | SessionUpdateUserChunk
  | SessionUpdateAgentChunk
  | SessionUpdateThoughtChunk
  | SessionUpdatePlan
  | SessionUpdateToolCall
  | SessionUpdateToolCallUpdate;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
