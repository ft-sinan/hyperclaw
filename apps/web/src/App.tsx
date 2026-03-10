/**
 * apps/web/src/App.tsx
 * HyperClaw Web UI — TanStack Router + TanStack Query
 * Routes: / (chat), /dashboard, /canvas, /hub, /memory, /settings
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const APP_VERSION = '5.3.1';

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5000, retry: 1, refetchOnWindowFocus: false }
  }
});

// ─── API ──────────────────────────────────────────────────────────────────────

// L-3: Allow build-time override via VITE_GATEWAY_URL
const DEFAULT_GATEWAY_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GATEWAY_URL) || 'http://localhost:18789';

// H-5: Create a mutable axios instance so SettingsPage can update the baseURL
// at runtime without a page reload.
const api = axios.create({ baseURL: DEFAULT_GATEWAY_URL, timeout: 30000 });

/** Update the shared axios instance to point at a different gateway URL. */
function setApiBaseUrl(url: string): void {
  api.defaults.baseURL = url.replace(/\/$/, '');
}

type Page = 'chat' | 'dashboard' | 'canvas' | 'hub' | 'memory' | 'settings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thinking?: string;
  toolCalls?: Array<{ name: string; result: string }>;
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: '0',
    role: 'assistant',
    content: '🦅 **HyperClaw**\n\nWelcome to the HyperClaw Web Chat. Your gateway agent is ready — type a message to begin.',
    timestamp: new Date().toISOString()
  };
}

interface GatewayStatus {
  running: boolean;
  port: number;
  channels: string[];
  model: string;
  agentName: string;
  sessions: number;
  uptime: string;
}

interface CostSummary {
  sessions?: number;
  totalInput?: number;
  totalOutput?: number;
  totalCacheRead?: number;
  totalCostUsd?: number;
  totalRuns?: number;
}

interface TerminalResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  user?: string;
  hostname?: string;
  cwd?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useGatewayStatus() {
  return useQuery<GatewayStatus>({
    queryKey: ['gateway-status'],
    queryFn: async () => {
      const res = await api.get('/api/status');
      return res.data;
    },
    refetchInterval: 5000,
    retry: false
  });
}

function useCostSummary() {
  return useQuery<{ summary: CostSummary }>({
    queryKey: ['cost-summary'],
    queryFn: async () => {
      const res = await api.get('/api/costs');
      return res.data;
    },
    refetchInterval: 30000,
    retry: false
  });
}

function useChat() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [streaming, setStreaming] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async ({ message, thinking }: { message: string; thinking: string }) => {
      // Use EventSource (SSE) for streaming if available, fallback to POST
      const res = await api.post('/api/chat', { message, thinking });
      return res.data;
    },
    onMutate: async ({ message }) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);
      setStreaming(true);
    },
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.text || '(empty)',
        timestamp: new Date().toISOString(),
        thinking: data.thinking,
        toolCalls: data.toolCalls
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ['gateway-status'] });
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '_⚠️ Gateway unreachable. Start with: `hyperclaw daemon start`_',
        timestamp: new Date().toISOString()
      }]);
      setStreaming(false);
    }
  });

  const resetChat = () => setMessages([createWelcomeMessage()]);
  const clearChat = () => setMessages([]);

  return { messages, sendMutation, streaming, resetChat, clearChat };
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
      online ? 'text-cyan-400' : 'text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        online ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'
      }`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

const NAV_ITEMS: Array<{ page: Page; label: string; icon: string }> = [
  { page: 'chat',      label: 'Chat',       icon: '💬' },
  { page: 'dashboard', label: 'Dashboard',  icon: '📊' },
  { page: 'canvas',    label: 'Canvas',     icon: '🎨' },
  { page: 'hub',       label: 'Skills',     icon: '🧩' },
  { page: 'memory',    label: 'Memory',     icon: '🧠' },
  { page: 'settings',  label: 'Settings',   icon: '⚙️' },
];

function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const { data: status, isError } = useGatewayStatus();

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🦅</span>
          <div>
            <div className="text-sm font-bold text-red-400 tracking-wide">HyperClaw</div>
            <div className="text-xs text-gray-500">v{APP_VERSION}</div>
          </div>
        </div>
      </div>

      {/* Gateway status */}
      <div className="px-4 py-2.5 border-b border-gray-800">
        <div className="text-xs text-gray-500 mb-1">Gateway</div>
        <StatusBadge online={!!status && !isError} />
        {status && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            :{status.port} · {status.sessions} sessions
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ page: p, label, icon }) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              page === p
                ? 'bg-red-900/20 text-red-400 border border-red-900/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <span>{icon}</span>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* Model */}
      {status?.model && (
        <div className="px-4 py-2.5 border-t border-gray-800">
          <div className="text-xs text-gray-500">Model</div>
          <div className="text-xs text-gray-400 truncate">{status.model}</div>
        </div>
      )}
    </aside>
  );
}

// ─── Chat page ─────────────────────────────────────────────────────────────────

type ThinkingLevel = 'none' | 'low' | 'medium' | 'high';

function ChatPage() {
  const { messages, sendMutation, streaming, resetChat, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState<ThinkingLevel>('none');
  const [workingSec, setWorkingSec] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

  useEffect(() => {
    if (!streaming) { setWorkingSec(0); return; }
    setWorkingSec(0);
    const t = setInterval(() => setWorkingSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [streaming]);

  const send = useCallback(() => {
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ message: input.trim(), thinking });
    setInput('');
  }, [input, thinking, sendMutation]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">HyperClaw</div>
          <div className="text-sm font-semibold text-gray-100">Web Chat</div>
          <div className="text-xs text-gray-500">Converse with your local gateway agent</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetChat}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-200 transition-colors"
          >
            New chat
          </button>
          <button
            onClick={clearChat}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-900/40 hover:bg-red-800 text-red-100 transition-colors"
          >
            Clear messages
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🦅
              </div>
            )}
            <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-red-700 text-white'
                : 'bg-gray-800 text-gray-200 border border-gray-700'
            }`}>
              {msg.thinking && (
                <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-700 font-mono">
                  💭 {msg.thinking.slice(0, 120)}...
                </div>
              )}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc, i) => (
                    <div key={i} className="text-xs bg-gray-900 rounded px-2 py-1 font-mono">
                      🔧 <span className="text-cyan-400">{tc.name}</span>
                      <span className="text-gray-500 ml-2">→ {tc.result?.slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <pre className="bg-gray-950 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono border border-gray-700">
                        <code className={className}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-gray-950 rounded px-1.5 py-0.5 text-xs font-mono text-red-300" {...props}>{children}</code>
                    );
                  },
                  a({ children, href }) {
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">{children}</a>;
                  },
                  ul({ children }) { return <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>; },
                  ol({ children }) { return <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>; },
                  strong({ children }) { return <strong className="font-bold text-white">{children}</strong>; },
                  h1({ children }) { return <h1 className="text-base font-bold text-white mt-2 mb-1">{children}</h1>; },
                  h2({ children }) { return <h2 className="text-sm font-bold text-white mt-2 mb-1">{children}</h2>; },
                  h3({ children }) { return <h3 className="text-sm font-semibold text-gray-200 mt-1 mb-0.5">{children}</h3>; },
                  blockquote({ children }) { return <blockquote className="border-l-2 border-gray-600 pl-3 text-gray-400 my-1">{children}</blockquote>; },
                }}
              >
                {msg.content}
              </ReactMarkdown>
              <div className="text-xs opacity-40 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-sm">🦅</div>
            <div className="bg-gray-800 rounded-2xl px-4 py-3 border border-gray-700 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-1">Working ({workingSec}s)</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">Thinking budget:</span>
          {(['none', 'low', 'medium', 'high'] as ThinkingLevel[]).map(level => (
            <button key={level} onClick={() => setThinking(level)}
              className={`text-xs px-2 py-1 rounded transition-all ${
                thinking === level ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            rows={1}
            placeholder="Your AI assistant awaits — type a message and press Enter to send · HyperClaw"
            className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-700 transition-colors"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button onClick={send} disabled={!input.trim() || sendMutation.isPending}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white px-4 py-3 rounded-xl transition-all font-bold">
            ↑
          </button>
        </div>
      </div>

      {/* Terminal panel */}
      <TerminalPanel />
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { data: status, isLoading, isError } = useGatewayStatus();
  const { data: costData } = useCostSummary();

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      {/* Hero / header */}
      <div className="bg-gradient-to-r from-red-900 via-gray-900 to-gray-900 rounded-2xl border border-red-900/40 p-5 flex items-center justify-between shadow-lg shadow-red-900/20">
        <div>
          <div className="text-xs text-red-200 uppercase tracking-wider flex items-center gap-1">
            <span>🦅</span> HyperClaw Dashboard
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-100">
            {status?.agentName || 'Your gateway agent'}
          </div>
          <div className="mt-1 text-xs text-gray-300">
            {status
              ? `${isError ? 'Gateway offline' : 'Gateway online'} · Model: ${status.model} · Port ${status.port}`
              : 'Waiting for gateway status...'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <StatusBadge online={!!status && !isError} />
          {status?.uptime && (
            <div className="text-gray-300 font-mono">Uptime: {status.uptime}</div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
        <span>📊</span> Overview
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gateway', value: isError ? 'Offline' : 'Online', color: isError ? 'text-red-400' : 'text-green-400', icon: '📡' },
          { label: 'Channels', value: String(status?.channels?.length || 0), color: 'text-cyan-400', icon: '📱' },
          { label: 'Sessions', value: String(status?.sessions || 0), color: 'text-gray-300', icon: '👥' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">{c.icon} {c.label}</div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {status && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Gateway Info</div>
            {[
              ['Port', String(status.port)],
              ['Model', status.model],
              ['Agent', status.agentName],
              ['Uptime', status.uptime],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-300 font-mono text-xs">{v}</span>
              </div>
            ))}
          </div>

          {status.channels.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Active Channels</div>
              <div className="flex flex-wrap gap-2">
                {status.channels.map(ch => (
                  <div key={ch} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-300">{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {costData?.summary && (costData.summary.totalRuns ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">💰 Cost Summary</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Runs</span><div className="font-mono text-gray-300">{costData.summary.totalRuns}</div></div>
            <div><span className="text-gray-500">Input tokens</span><div className="font-mono text-gray-300">{(costData.summary.totalInput ?? 0).toLocaleString()}</div></div>
            <div><span className="text-gray-500">Output tokens</span><div className="font-mono text-gray-300">{(costData.summary.totalOutput ?? 0).toLocaleString()}</div></div>
            <div><span className="text-gray-500">Est. cost (USD)</span><div className="font-mono text-cyan-400">${(costData.summary.totalCostUsd ?? 0).toFixed(4)}</div></div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Quick Commands</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            'hyperclaw doctor --fix',
            'hyperclaw security audit --deep',
            'hyperclaw hooks list',
            'hyperclaw hub',
            'hyperclaw agents bindings',
            'hyperclaw delivery status',
          ].map(cmd => (
            <div key={cmd} className="font-mono text-xs text-red-400 bg-gray-800 rounded px-3 py-2 truncate">
              $ {cmd}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon, desc, cmd }: { title: string; icon: string; desc: string; cmd?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div>
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-lg font-bold text-gray-300 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm max-w-xs">{desc}</p>
        {cmd && (
          <div className="mt-4 inline-block font-mono text-xs text-red-400 bg-gray-800 rounded px-4 py-2">
            $ {cmd}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Terminal panel (local commands) ─────────────────────────────────────────

function TerminalPanel() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [promptInfo, setPromptInfo] = useState<string>('local shell');
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  const runCommand = useCallback(async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd || running) return;
    setCommand('');
    setLines(prev => [...prev, `$ ${cmd}`]);
    setRunning(true);
    try {
      const res = await api.post<TerminalResult>('/api/terminal', { command: cmd });
      const data = res.data;
      if (data.user || data.cwd) {
        const host = data.hostname || 'local';
        setPromptInfo(`${data.user ?? 'user'}@${host} · ${data.cwd ?? ''}`);
      }
      if (data.stdout) {
        setLines(prev => [...prev, data.stdout.trimEnd()]);
      }
      if (data.stderr) {
        setLines(prev => [...prev, `! ${data.stderr.trimEnd()}`]);
      }
      setLines(prev => [...prev, `(exit code ${data.code ?? 0})`]);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || String(e);
      setLines(prev => [...prev, `Error: ${msg}`]);
    } finally {
      setRunning(false);
    }
  }, [running]);

  const run = useCallback(() => {
    const cmd = command.trim();
    if (cmd) void runCommand(cmd);
  }, [command, runCommand]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  };

  const QUICK_COMMANDS = [
    { label: 'Build', cmd: 'npm run build' },
    { label: 'Install', cmd: 'npm install' },
    { label: 'Test', cmd: 'npm test' },
    { label: 'Doctor', cmd: 'npx hyperclaw doctor --fix' },
    { label: 'Gateway status', cmd: 'npx hyperclaw gateway status' },
  ];

  return (
    <div className="border-t border-gray-900 bg-black/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:bg-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-gray-500">›</span>
          <span>Local terminal</span>
          <span className="text-gray-600">({promptInfo})</span>
        </span>
        <span className="text-gray-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 text-xs font-mono text-gray-200 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map(({ label, cmd }) => (
              <button
                key={label}
                onClick={() => void runCommand(cmd)}
                disabled={running}
                className="px-2.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-gray-600 disabled:opacity-50 transition-colors"
                title={cmd}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            ref={logRef}
            className="bg-black/70 border border-gray-800 rounded-lg p-2 h-40 overflow-y-auto whitespace-pre-wrap"
          >
            {lines.length === 0 ? (
              <span className="text-gray-500">
                No commands yet. Use the buttons above or type a command below.
              </span>
            ) : (
              lines.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Run a command in your HyperClaw workspace..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-700"
            />
            <button
              onClick={() => void run()}
              disabled={!command.trim() || running}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white"
            >
              Run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

function SettingsPage() {
  const { data: status } = useGatewayStatus();
  const qc = useQueryClient();
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GATEWAY_URL);
  const [applied, setApplied] = useState(false);

  // H-5: Apply the new URL to the shared axios instance and re-probe immediately.
  const applyUrl = useCallback(() => {
    setApiBaseUrl(gatewayUrl);
    qc.invalidateQueries();
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  }, [gatewayUrl, qc]);

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
        <span>⚙️</span> Settings
      </h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Gateway Connection</div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Gateway URL</label>
          <div className="flex gap-2">
            <input
              value={gatewayUrl}
              onChange={e => setGatewayUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyUrl()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-700"
            />
            <button
              onClick={applyUrl}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                applied ? 'bg-green-700 text-white' : 'bg-red-800 hover:bg-red-700 text-white'
              }`}
            >
              {applied ? '✓' : 'Apply'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">{status ? `Connected to port ${status.port}` : 'Disconnected'}</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">HyperClaw CLI Commands</div>
        <div className="space-y-1 text-xs font-mono text-gray-400">
          <div className="text-red-400">$ hyperclaw init            </div>
          <div className="text-gray-500">  → run setup wizard</div>
          <div className="text-red-400 mt-2">$ hyperclaw gateway config --regenerate-token</div>
          <div className="text-gray-500">  → new auth token</div>
          <div className="text-red-400 mt-2">$ hyperclaw doctor --fix</div>
          <div className="text-gray-500">  → auto-fix issues</div>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const [page, setPage] = useState<Page>('chat');

  const renderPage = () => {
    switch (page) {
      case 'chat':      return <ChatPage />;
      case 'dashboard': return <DashboardPage />;
      case 'canvas':    return <PlaceholderPage title="Canvas" icon="🎨" desc="AI-generated UI components" cmd="hyperclaw canvas show" />;
      case 'hub':       return <PlaceholderPage title="Skill Hub" icon="🧩" desc="Browse and install skills" cmd="hyperclaw hub" />;
      case 'memory':    return <PlaceholderPage title="Memory" icon="🧠" desc="AGENTS.md and MEMORY.md" cmd="hyperclaw memory show" />;
      case 'settings':  return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
