/**
 * apps/web/src/App.tsx — HyperClaw Web UI v5.3.5
 * Professional dark/light · Cyan normal · Red daemon · Voice · CSS-var driven
 */

import React, {
  useState, useEffect, useRef, useCallback,
  createContext, useContext
} from 'react';
import {
  QueryClient, QueryClientProvider,
  useQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const APP_VERSION = '5.3.5';

// ─── Theme context ────────────────────────────────────────────────────────────

interface ThemeCtxType { isDark: boolean; toggle: () => void; }
const ThemeCtx = createContext<ThemeCtxType>({ isDark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

// ─── API ──────────────────────────────────────────────────────────────────────

const DEFAULT_GW = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GATEWAY_URL) || 'http://localhost:18789';
const api = axios.create({ baseURL: DEFAULT_GW, timeout: 30000 });
function setApiBaseUrl(url: string) { api.defaults.baseURL = url.replace(/\/$/, ''); }

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, retry: 1, refetchOnWindowFocus: false } },
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = 'chat' | 'dashboard' | 'canvas' | 'hub' | 'memory' | 'settings';
type ThinkingLevel = 'none' | 'low' | 'medium' | 'high';

interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: string;
  thinking?: string; toolCalls?: Array<{ name: string; result: string }>;
}
interface GatewayStatus {
  running: boolean; port: number; channels: string[];
  model: string; agentName: string; sessions: number; uptime: string;
  daemonMode?: boolean;
}
interface CostSummary {
  sessions?: number; totalInput?: number; totalOutput?: number;
  totalCacheRead?: number; totalCostUsd?: number; totalRuns?: number;
}
interface TerminalResult {
  ok: boolean; code: number | null; stdout: string; stderr: string;
  user?: string; hostname?: string; cwd?: string;
}
interface Project { id: string; name: string; prompt: string; color: string; }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useGatewayStatus() {
  return useQuery<GatewayStatus>({
    queryKey: ['gateway-status'],
    queryFn: async () => (await api.get('/api/status')).data,
    refetchInterval: 5000, retry: false,
  });
}

function useCostSummary() {
  return useQuery<{ summary: CostSummary }>({
    queryKey: ['cost-summary'],
    queryFn: async () => (await api.get('/api/costs')).data,
    refetchInterval: 30000, retry: false,
  });
}

function createWelcome(): ChatMessage {
  return {
    id: '0', role: 'assistant', timestamp: new Date().toISOString(),
    content: '🦅 **HyperClaw**\n\nWelcome. Your gateway agent is ready — type or speak a message to begin.',
  };
}

function useChat() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcome()]);
  const [streaming, setStreaming] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async ({ message, thinking }: { message: string; thinking: string }) =>
      (await api.post('/api/chat', { message, thinking })).data,
    onMutate: async ({ message }) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: message, timestamp: new Date().toISOString() }]);
      setStreaming(true);
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.response || data.text || '(empty)',
        timestamp: new Date().toISOString(),
        thinking: data.thinking, toolCalls: data.toolCalls,
      }]);
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ['gateway-status'] });
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', timestamp: new Date().toISOString(),
        content: '_⚠️ Gateway unreachable. Start with: `hyperclaw daemon start`_',
      }]);
      setStreaming(false);
    },
  });

  return { messages, sendMutation, streaming, clearChat: () => setMessages([]) };
}

function useVoice(onTranscript: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'el-GR'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => onTranscript(Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(''));
    rec.start(); recRef.current = rec;
  }, [supported, listening, onTranscript]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop, supported };
}

function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.replace(/[#*`_~[\]()>]/g, '').replace(/\n+/g, ' ').slice(0, 500));
  utt.lang = 'el-GR'; utt.rate = 1.05;
  window.speechSynthesis.speak(utt);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

const PRESET_PROJECTS: Project[] = [
  { id: '',               name: 'General',        prompt: '', color: 'var(--text3)' },
  { id: 'ethical-hacker', name: 'Ethical Hacker', prompt: 'Act as an ethical hacker / security researcher. Authorized testing only. ', color: '#ef4444' },
  { id: 'hyperclaw',      name: 'HyperClaw Dev',  prompt: 'You are helping with HyperClaw development. Be concise and code-focused. ', color: 'var(--accent2)' },
  { id: 'osint',          name: 'OSINT',           prompt: 'Act as an OSINT analyst. Passive reconnaissance, open-source research. ', color: '#8b5cf6' },
];

function getProjectName(id: string): string {
  const p = PRESET_PROJECTS.find(p => p.id === id);
  if (p) return p.name;
  try { return (JSON.parse(localStorage.getItem('hc_projects') || '[]') as Project[]).find(p => p.id === id)?.name || 'General'; } catch { return 'General'; }
}

function getProjectPrompt(id: string): string {
  const p = PRESET_PROJECTS.find(p => p.id === id);
  if (p) return p.prompt;
  try { return ((JSON.parse(localStorage.getItem('hc_projects') || '[]') as Project[]).find(p => p.id === id)?.prompt || '') + ' '; } catch { return ''; }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icons = {
  Plus:     () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Search:   () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  Settings: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 1v1.2M6.5 10.8V12M1 6.5h1.2M10.8 6.5H12M2.7 2.7l.85.85M9.45 9.45l.85.85M2.7 10.3l.85-.85M9.45 3.55l.85-.85" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  Terminal: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 2L5.5 6.5L1.5 11M7 11H11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Close:    () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Sun:      () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Moon:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 8.5A5.5 5.5 0 015.5 2.5 5.5 5.5 0 1011.5 8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Mic:      ({ on }: { on: boolean }) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.3" fill={on ? 'currentColor' : 'none'} fillOpacity={on ? '.3' : '0'}/><path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="7" y1="12" x2="7" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Speaker:  ({ on }: { on: boolean }) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5h2.5L8 2v10L4.5 9H2V5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill={on ? 'currentColor' : 'none'} fillOpacity={on ? '.25' : '0'}/><path d="M10 4.5a3.5 3.5 0 010 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Chat:     () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2h9v8H7L4.5 12V10H2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  Send:     () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 12V3M3.5 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─── Customize modal ──────────────────────────────────────────────────────────

function CustomizeModal({ onSave, onClose }: { onSave: (p: Project) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [color, setColor] = useState('#22d3ee');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="card w-96 max-w-[90vw] rounded-2xl p-6" style={{ background: 'var(--bg2)' }} onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>✦ New Project / Agent</div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text3)' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bug Hunter"
          className="input-base w-full rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="text-xs mb-1 block" style={{ color: 'var(--text3)' }}>System prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder="You are a security researcher…"
          className="input-base w-full rounded-lg px-3 py-2 text-sm mb-3 resize-none" />
        <label className="text-xs mb-1 block" style={{ color: 'var(--text3)' }}>Accent color</label>
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-full h-9 rounded-lg px-2 mb-4 cursor-pointer" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }} />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost text-xs px-4 py-2 rounded-lg">Cancel</button>
          <button onClick={() => { if (name.trim()) onSave({ id: 'custom-' + Date.now(), name: name.trim(), prompt, color }); }}
            className="btn-primary text-xs px-4 py-2 rounded-lg">Create</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ page: Page; label: string; icon: JSX.Element }> = [
  { page: 'dashboard', label: 'Dashboard', icon: <span>📊</span> },
  { page: 'canvas',    label: 'Canvas',    icon: <span>🎨</span> },
  { page: 'hub',       label: 'Skills',    icon: <span>🧩</span> },
  { page: 'memory',    label: 'Memory',    icon: <span>🧠</span> },
  { page: 'settings',  label: 'Settings',  icon: <Icons.Settings /> },
];

interface SidebarProps {
  page: Page; setPage: (p: Page) => void;
  activeProject: string; setActiveProject: (id: string) => void;
  onNewChat: () => void;
}

function Sidebar({ page, setPage, activeProject, setActiveProject, onNewChat }: SidebarProps) {
  const { data: status, isError } = useGatewayStatus();
  const { isDark, toggle } = useTheme();
  const [search, setSearch] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [customProjects, setCustomProjects] = useState<Project[]>(() => {
    try { return JSON.parse(localStorage.getItem('hc_projects') || '[]'); } catch { return []; }
  });
  const [chatHistory] = useState<Array<{ id: string; title: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('hc_history') || '[]'); } catch { return []; }
  });

  const allProjects = [...PRESET_PROJECTS, ...customProjects];
  const filteredHistory = chatHistory.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (proj: Project) => {
    const updated = [...customProjects, proj];
    setCustomProjects(updated);
    localStorage.setItem('hc_projects', JSON.stringify(updated));
    setShowCustomize(false);
    setActiveProject(proj.id);
  };

  return (
    <>
      {showCustomize && <CustomizeModal onSave={handleSave} onClose={() => setShowCustomize(false)} />}
      <aside className="sidebar-bg w-56 flex-shrink-0 flex flex-col h-screen overflow-hidden"
        style={{ borderRight: '1px solid var(--border)' }}>

        {/* Logo + theme toggle */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="" className="w-6 h-6 rounded-md" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>HyperClaw</span>
            </div>
            <button onClick={toggle} title="Toggle theme"
              className="p-1.5 rounded-lg transition-colors nav-item">
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>

          {/* New chat */}
          <button onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 font-medium transition-colors"
            style={{ background: 'var(--accentBg)', color: 'var(--accent)', border: '1px solid var(--accentBorder)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <Icons.Plus /> New chat
          </button>

          {/* Search */}
          <div className="relative mb-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text3)' }}><Icons.Search /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="input-base w-full rounded-lg pl-7 pr-3 py-1.5 text-xs" />
          </div>

          {/* Customize */}
          <button onClick={() => setShowCustomize(true)}
            className="nav-item w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs">
            <Icons.Settings /> Customize
          </button>
        </div>

        {/* Projects */}
        <div className="px-3 pt-1 pb-1 flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--text3)' }}>Projects</div>
          {allProjects.map(proj => (
            <button key={proj.id}
              onClick={() => { setActiveProject(proj.id); setPage('chat'); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors ${activeProject === proj.id ? 'nav-active' : 'nav-item'}`}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: proj.color === 'var(--accent2)' || proj.color === 'var(--text3)' ? 'var(--accent2)' : proj.color }} />
              <span className="truncate">{proj.name}</span>
            </button>
          ))}
          <button onClick={() => setShowCustomize(true)}
            className="nav-item w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
            <Icons.Plus /> New project…
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-3 pt-1 min-h-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--text3)' }}>Chats</div>
          {filteredHistory.length === 0
            ? <div className="text-xs px-3 py-1" style={{ color: 'var(--border2)' }}>{search ? 'No results' : 'No recent chats'}</div>
            : filteredHistory.slice(0, 20).map(c => (
              <button key={c.id} onClick={() => setPage('chat')}
                className="nav-item w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left truncate">
                <Icons.Chat />
                <span className="truncate" style={{ color: 'var(--text2)' }}>{c.title}</span>
              </button>
            ))
          }
        </div>

        {/* Nav */}
        <div className="px-3 pb-2 pt-1 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {NAV_ITEMS.map(({ page: p, label, icon }) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${page === p ? 'nav-active' : 'nav-item'}`}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${!!status && !isError ? 'accent-text' : 'text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${!!status && !isError ? 'animate-pulse' : ''}`}
              style={{ background: !!status && !isError ? 'var(--accent)' : '#ef4444' }} />
            {!!status && !isError ? '✓ Online' : '✗ Offline'}
          </div>
          {status?.model && <div className="text-[10px] mt-0.5 truncate font-mono" style={{ color: 'var(--text3)' }}>{status.model}</div>}
        </div>
      </aside>
    </>
  );
}

// ─── Chat page ────────────────────────────────────────────────────────────────

function ChatPage({ activeProject }: { activeProject: string }) {
  const { messages, sendMutation, streaming, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState<ThinkingLevel>('none');
  const [workingSec, setWorkingSec] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [savedToHistory, setSavedToHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { listening, start: startMic, stop: stopMic, supported: micSupported } =
    useVoice(useCallback((t: string) => setInput(t), []));

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, streaming]);

  useEffect(() => {
    if (!streaming) { setWorkingSec(0); return; }
    setWorkingSec(0);
    const t = setInterval(() => setWorkingSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [streaming]);

  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (voiceOut && !streaming && lastMsg?.role === 'assistant' && lastMsg.id !== '0') speakText(lastMsg.content);
  }, [lastMsg?.id, streaming, voiceOut]);

  const send = useCallback(() => {
    if (!input.trim() || sendMutation.isPending) return;
    const raw = input.trim();
    const prefix = getProjectPrompt(activeProject);
    sendMutation.mutate({ message: prefix ? prefix + raw : raw, thinking });
    if (!savedToHistory) {
      setSavedToHistory(true);
      try {
        const h = JSON.parse(localStorage.getItem('hc_history') || '[]');
        h.unshift({ id: Date.now().toString(), title: raw.slice(0, 40), ts: Date.now() });
        localStorage.setItem('hc_history', JSON.stringify(h.slice(0, 30)));
      } catch {}
    }
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, thinking, activeProject, sendMutation, savedToHistory]);

  const HdrBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button onClick={onClick} title={title}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
      style={{
        border: active ? '1px solid var(--accentBorder)' : '1px solid var(--border)',
        background: active ? 'var(--accentBg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text3)',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text2)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)'; } }}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--header)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>{getProjectName(activeProject)}</span>
        <div className="flex items-center gap-1.5">
          <HdrBtn onClick={clearChat}>Clear</HdrBtn>
          {micSupported && (
            <HdrBtn onClick={() => setVoiceOut(v => !v)} active={voiceOut} title="Toggle voice output">
              <Icons.Speaker on={voiceOut} /> Voice
            </HdrBtn>
          )}
          <HdrBtn onClick={() => setTerminalOpen(o => !o)} active={terminalOpen} title="Toggle terminal">
            <Icons.Terminal /> Terminal
          </HdrBtn>
        </div>
      </div>

      {/* Messages */}
      <div className="msgs-bg flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0">
        {/* Banner */}
        <div className="flex flex-col items-center pt-4 pb-3 flex-shrink-0 select-none pointer-events-none" style={{ opacity: 0.45 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: '2.4rem',
            letterSpacing: '0.3em',
            color: 'var(--accent)',
            textShadow: '0 0 32px var(--accent), 0 0 64px var(--accentBg)',
            lineHeight: 1,
          }}>HYPERCLAW</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: 'var(--accent)',
            letterSpacing: '0.25em',
            marginTop: '8px',
            opacity: 0.75,
          }}>HyperClaw Bot  ·  AI Gateway  v{APP_VERSION}</div>
        </div>
        {messages.map(msg => (
          <div key={msg.id} className={`msg-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2.5 flex-shrink-0 mt-0.5 accent-bg-sm"
                style={{ border: '1px solid var(--accentBorder)' }}>🦅</div>
            )}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bubble-user rounded-tr-sm' : 'bubble-asst rounded-tl-sm'}`}>
              {msg.thinking && (
                <div className="text-xs mb-2 pb-2 font-mono" style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
                  💭 {msg.thinking.slice(0, 120)}…
                </div>
              )}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc, i) => (
                    <div key={i} className="text-xs rounded px-2 py-1 font-mono" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                      🔧 <span className="accent-text">{tc.name}</span>
                      <span style={{ color: 'var(--text3)' }}> → {tc.result?.slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                code({ className, children, ...props }) {
                  const isBlock = className?.includes('language-');
                  return isBlock
                    ? <pre className="rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}><code className={className}>{children}</code></pre>
                    : <code className="rounded px-1.5 py-0.5 text-xs font-mono accent-text" style={{ background: 'var(--bg3)' }} {...props}>{children}</code>;
                },
                a({ children, href }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="accent-text underline">{children}</a>; },
                ul({ children }) { return <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>; },
                ol({ children }) { return <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>; },
                strong({ children }) { return <strong className="font-bold">{children}</strong>; },
                h1({ children }) { return <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>; },
                h2({ children }) { return <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>; },
                h3({ children }) { return <h3 className="text-sm font-semibold mt-1 mb-0.5">{children}</h3>; },
                blockquote({ children }) { return <blockquote className="pl-3 my-1" style={{ borderLeft: '2px solid var(--border2)', color: 'var(--text2)' }}>{children}</blockquote>; },
              }}>
                {msg.content}
              </ReactMarkdown>
              <div className="text-xs mt-1.5 text-right tabular-nums" style={{ color: 'var(--text3)', opacity: 0.5 }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {streaming && (
          <div className="msg-in flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm accent-bg-sm" style={{ border: '1px solid var(--accentBorder)' }}>🦅</div>
            <div className="bubble-asst rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full accent-bg typing-dot-1" style={{ background: 'var(--accent)' }} />
              <span className="w-1.5 h-1.5 rounded-full accent-bg typing-dot-2" style={{ background: 'var(--accent)' }} />
              <span className="w-1.5 h-1.5 rounded-full accent-bg typing-dot-3" style={{ background: 'var(--accent)' }} />
              <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>{workingSec > 0 ? `${workingSec}s` : 'Thinking…'}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="input-glow px-4 pt-3 pb-4 flex-shrink-0" style={{ background: 'var(--header)', borderTop: '1px solid var(--border)' }}>
        {/* Thinking selector */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Thinking:</span>
          {(['none', 'low', 'medium', 'high'] as ThinkingLevel[]).map(lv => (
            <button key={lv} onClick={() => setThinking(lv)}
              className="text-xs px-2 py-0.5 rounded-md transition-all"
              style={{
                background: thinking === lv ? 'var(--bg4)' : 'transparent',
                color: thinking === lv ? 'var(--text)' : 'var(--text3)',
              }}>
              {lv}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            rows={1} placeholder="Ask HyperClaw anything… Enter to send · Shift+Enter new line"
            className="input-base flex-1 resize-none rounded-xl px-4 py-3 text-sm"
            style={{ minHeight: '48px', maxHeight: '140px' }}
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }}
          />
          {/* Mic */}
          {micSupported && (
            <button onClick={listening ? stopMic : startMic} title={listening ? 'Stop' : 'Voice input'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 transition-all ${listening ? 'mic-active' : ''}`}
              style={{
                background: listening ? 'var(--accentBg)' : 'var(--bg3)',
                border: `1px solid ${listening ? 'var(--accentBorder)' : 'var(--border)'}`,
                color: listening ? 'var(--accent)' : 'var(--text3)',
              }}>
              <Icons.Mic on={listening} />
            </button>
          )}
          {/* Send */}
          <button onClick={send} disabled={!input.trim() || sendMutation.isPending}
            className="btn-primary w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5">
            <Icons.Send />
          </button>
        </div>
        {listening && (
          <div className="mt-1.5 text-xs flex items-center gap-1.5 animate-pulse accent-text">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            Listening… speak now
          </div>
        )}
      </div>

      <TerminalPanel open={terminalOpen} onClose={() => setTerminalOpen(false)} />
    </div>
  );
}

// ─── Terminal panel ───────────────────────────────────────────────────────────

function TerminalPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [promptInfo, setPromptInfo] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [lines.length]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const runCmd = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd || running) return;
    setCommand('');
    setLines(prev => [...prev, `$ ${cmd}`]);
    setRunning(true);
    try {
      const { data: d } = await api.post<TerminalResult>('/api/terminal', { command: cmd });
      if (d.user || d.cwd) setPromptInfo(`${d.user ?? 'user'}@${d.hostname ?? 'local'}:${d.cwd ?? ''}`);
      if (d.stdout) setLines(prev => [...prev, d.stdout.trimEnd()]);
      if (d.stderr) setLines(prev => [...prev, `ERR:${d.stderr.trimEnd()}`]);
      if (!d.stdout && !d.stderr) setLines(prev => [...prev, `(exit ${d.code ?? 0})`]);
    } catch (e: any) {
      setLines(prev => [...prev, `Error: ${e?.response?.data?.error || e?.message || String(e)}`]);
    } finally {
      setRunning(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [running]);

  const run = () => { if (command.trim()) void runCmd(command); };

  const QUICK = [
    { label: 'npm install', cmd: 'npm install' },
    { label: 'npm run build', cmd: 'npm run build' },
    { label: 'npm test', cmd: 'npm test' },
    { label: 'doctor --fix', cmd: 'npx hyperclaw doctor --fix' },
    { label: 'gateway status', cmd: 'npx hyperclaw gateway status' },
  ];

  if (!open) return null;

  return (
    <div className="flex flex-col flex-shrink-0" style={{ height: 220, borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: .7 }} />)}
          </div>
          <span className="text-xs font-mono ml-1" style={{ color: 'var(--text3)' }}>{promptInfo || 'Terminal — HyperClaw'}</span>
          {running && <span className="text-xs animate-pulse" style={{ color: '#fbbf24' }}>● running</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLines([])} className="text-xs transition-colors" style={{ color: 'var(--text3)' }}>clear</button>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text3)' }}><Icons.Close /></button>
        </div>
      </div>
      {/* Quick cmds */}
      <div className="flex gap-1.5 px-3 py-1.5 flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {QUICK.map(({ label, cmd }) => (
          <button key={label} onClick={() => void runCmd(cmd)} disabled={running} title={cmd}
            className="btn-ghost text-xs px-2.5 py-1 rounded-md font-mono whitespace-nowrap flex-shrink-0 disabled:opacity-40 transition-colors">
            {label}
          </button>
        ))}
      </div>
      {/* Log */}
      <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs space-y-0.5 min-h-0" style={{ color: 'var(--text2)' }}>
        {lines.length === 0
          ? <span style={{ color: 'var(--border2)' }}>Use the buttons above or type a command.</span>
          : lines.map((l, i) => (
            <div key={i} style={{ color: l.startsWith('$') ? 'var(--accent)' : l.startsWith('ERR:') || l.startsWith('Error') ? '#f87171' : 'var(--text2)' }}>
              {l.startsWith('ERR:') ? l.slice(4) : l}
            </div>
          ))
        }
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
        <span className="font-mono text-xs flex-shrink-0 accent-text">›</span>
        <input ref={inputRef} value={command} onChange={e => setCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()} placeholder="Run a command…" disabled={running}
          className="flex-1 bg-transparent text-xs font-mono outline-none disabled:opacity-50"
          style={{ color: 'var(--text)', caretColor: 'var(--accent)' }} />
        {running && <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: '#fbbf24', borderTopColor: 'transparent' }} />}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { data: status, isLoading, isError } = useGatewayStatus();
  const { data: costData } = useCostSummary();
  if (isLoading) return <div className="p-8 text-sm" style={{ color: 'var(--text3)' }}>Loading…</div>;
  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'var(--accentBg)', border: '1px solid var(--accentBorder)' }}>
        <div>
          <div className="text-xs uppercase tracking-wider flex items-center gap-1 accent-text">🦅 HyperClaw Dashboard</div>
          <div className="mt-1 text-xl font-bold">{status?.agentName || 'Your gateway agent'}</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--text2)' }}>{status ? `${isError ? 'Offline' : 'Online'} · ${status.model} · :${status.port}` : 'Waiting…'}</div>
        </div>
        <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${!!status && !isError ? 'accent-text' : 'text-red-400'}`}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: !!status && !isError ? 'var(--accent)' : '#ef4444' }} />
          {!!status && !isError ? '✓ Online' : '✗ Offline'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gateway', value: isError ? 'Offline' : 'Online', accent: true, icon: '📡' },
          { label: 'Channels', value: String(status?.channels?.length || 0), accent: true, icon: '📱' },
          { label: 'Sessions', value: String(status?.sessions || 0), accent: false, icon: '👥' },
        ].map(c => (
          <div key={c.label} className="card rounded-xl">
            <div className="text-xs flex items-center gap-1.5 mb-2" style={{ color: 'var(--text3)' }}>{c.icon} {c.label}</div>
            <div className={`text-2xl font-bold ${c.accent ? 'accent-text' : ''}`} style={!c.accent ? { color: 'var(--text)' } : {}}>{c.value}</div>
          </div>
        ))}
      </div>
      {status && (
        <div className="card rounded-xl">
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Gateway Info</div>
          {[['Port', String(status.port)], ['Model', status.model], ['Agent', status.agentName], ['Uptime', status.uptime]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text3)' }}>{k}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {costData?.summary && (costData.summary.totalRuns ?? 0) > 0 && (
        <div className="card rounded-xl">
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>💰 Cost</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[['Runs', String(costData.summary.totalRuns)], ['Input', (costData.summary.totalInput ?? 0).toLocaleString()], ['Output', (costData.summary.totalOutput ?? 0).toLocaleString()], ['USD', '$' + (costData.summary.totalCostUsd ?? 0).toFixed(4)]].map(([k, v]) => (
              <div key={k}><span style={{ color: 'var(--text3)' }}>{k}</span><div className="font-mono accent-text">{v}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderPage({ title, icon, desc, cmd }: { title: string; icon: string; desc: string; cmd?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div>
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text2)' }}>{title}</h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text3)' }}>{desc}</p>
        {cmd && <div className="mt-4 inline-block font-mono text-xs rounded-lg px-4 py-2 accent-text" style={{ background: 'var(--bg3)' }}>$ {cmd}</div>}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { data: status } = useGatewayStatus();
  const qc = useQueryClient();
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GW);
  const [applied, setApplied] = useState(false);
  const applyUrl = useCallback(() => {
    setApiBaseUrl(gatewayUrl); qc.invalidateQueries();
    setApplied(true); setTimeout(() => setApplied(false), 1500);
  }, [gatewayUrl, qc]);

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text2)' }}>⚙️ Settings</h2>
      <div className="card rounded-xl space-y-3">
        <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Gateway Connection</div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text3)' }}>Gateway URL</label>
          <div className="flex gap-2">
            <input value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyUrl()}
              className="input-base flex-1 rounded-lg px-3 py-2 text-sm" />
            <button onClick={applyUrl} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-white ${applied ? 'bg-green-600' : 'btn-primary'}`}>
              {applied ? '✓' : 'Apply'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: status ? 'var(--accent)' : '#ef4444', animation: status ? 'pulse 2s infinite' : 'none' }} />
          <span className="text-xs" style={{ color: 'var(--text3)' }}>{status ? `Connected · port ${status.port}` : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const [page, setPage] = useState<Page>('chat');
  const [activeProject, setActiveProject] = useState('');
  const [chatKey, setChatKey] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('hc_theme') !== 'light'; } catch { return true; }
  });

  const { data: gwStatus } = useGatewayStatus();
  const isDaemon = !!gwStatus?.daemonMode;

  const toggle = useCallback(() => {
    setIsDark(d => {
      const next = !d;
      try { localStorage.setItem('hc_theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-daemon', isDaemon ? 'true' : 'false');
  }, [isDark, isDaemon]);

  const handleNewChat = () => { setChatKey(k => k + 1); setPage('chat'); };

  const renderPage = () => {
    switch (page) {
      case 'chat':      return <ChatPage key={chatKey} activeProject={activeProject} />;
      case 'dashboard': return <DashboardPage />;
      case 'canvas':    return <PlaceholderPage title="Canvas" icon="🎨" desc="AI-generated UI components" cmd="hyperclaw canvas show" />;
      case 'hub':       return <PlaceholderPage title="Skill Hub" icon="🧩" desc="Browse and install skills" cmd="hyperclaw hub" />;
      case 'memory':    return <PlaceholderPage title="Memory" icon="🧠" desc="AGENTS.md and MEMORY.md" cmd="hyperclaw memory show" />;
      case 'settings':  return <SettingsPage />;
    }
  };

  return (
    <ThemeCtx.Provider value={{ isDark, toggle }}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Sidebar page={page} setPage={setPage} activeProject={activeProject} setActiveProject={setActiveProject} onNewChat={handleNewChat} />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {renderPage()}
        </main>
      </div>
    </ThemeCtx.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
