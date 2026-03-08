/**
 * extensions/bluebubbles/src/connector.ts
 * REAL BlueBubbles connector — BlueBubbles Server REST API + WebSocket.
 * User provides: serverUrl, password (from their BlueBubbles server on macOS)
 * Setup: bluebubbles.app → Install on macOS → Set password → note URL
 *        Works with iMessage on macOS via BlueBubbles server
 */
import https from 'https';
import http from 'http';
import { WebSocket } from 'ws';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { EventEmitter } from 'events';

const STATE_FILE = path.join(os.homedir(), '.hyperclaw', 'bluebubbles-state.json');
const MAX_CA_CERT_BYTES = 1024 * 1024;
const ALLOWED_CA_CERT_EXTENSIONS = new Set(['.pem', '.crt', '.cer']);

export interface BlueBubblesConfig {
  serverUrl: string;   // http://your-mac:1234 or https://...
  password: string;
  dmPolicy: 'open' | 'allowlist' | 'pairing' | 'none';
  allowFrom: string[];
  approvedPairings: string[];
  pendingPairings: Record<string, string>;
  /** Deprecated. Insecure TLS bypass is no longer supported. */
  allowInsecureSsl?: boolean;
  /** Optional PEM CA bundle for private/self-hosted HTTPS BlueBubbles deployments. */
  caCertPath?: string;
}

function loadCaCert(caCertPath?: string): Buffer | undefined {
  if (!caCertPath) return undefined;
  const resolved = path.resolve(caCertPath.replace(/^~/, os.homedir()));
  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_CA_CERT_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported CA certificate file type: ${ext || 'unknown'}`);
  }
  const certificate = fs.readFileSync(resolved);
  if (certificate.length === 0) throw new Error('CA certificate file is empty');
  if (certificate.length > MAX_CA_CERT_BYTES) {
    throw new Error(`CA certificate file exceeds ${MAX_CA_CERT_BYTES} bytes`);
  }
  return certificate;
}

function bbReq(serverUrl: string, password: string, method: string, endpoint: string, body?: object, caCertPath?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${serverUrl}/api/v1${endpoint}`);
    url.searchParams.set('password', password);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const ca = isHttps ? loadCaCert(caCertPath) : undefined;

    const req = (mod as any).request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 1234),
      path: url.pathname + url.search,
      method,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
      ...(ca ? { ca } : {})
    }, (res: any) => {
      let data = '';
      res.on('data', (c: Buffer) => data += c);
      res.on('end', () => {
        try { const r = JSON.parse(data); if (r.status !== 200) reject(new Error(r.error?.message || 'BB error')); else resolve(r.data); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export class BlueBubblesConnector extends EventEmitter {
  config: BlueBubblesConfig;
  private running = false;
  private ws: WebSocket | null = null;
  private lastMessageTs = 0;
  private insecureTlsWarned = false;

  constructor(config: Partial<BlueBubblesConfig> & { serverUrl: string; password: string }) {
    super();
    this.config = { dmPolicy: 'allowlist', allowFrom: [], approvedPairings: [], pendingPairings: {}, ...config } as BlueBubblesConfig;
  }

  async connect(): Promise<void> {
    if (this.config.allowInsecureSsl && !this.insecureTlsWarned) {
      this.insecureTlsWarned = true;
      console.log(chalk.yellow('  ⚠ BlueBubbles: allowInsecureSsl is ignored. Use HTTP locally or configure caCertPath for private HTTPS.'));
    }
    const info = await bbReq(this.config.serverUrl, this.config.password, 'GET', '/server/info', undefined, this.config.caCertPath);
    await this.loadState();
    this.running = true;
    console.log(chalk.green(`  🦅 BlueBubbles (iMessage): ${info?.os_version || 'macOS'} server connected`));
    this.emit('connected', { serverInfo: info });
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    const url = new URL(this.config.serverUrl);
    const wsUrl = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.hostname}:${url.port || 1234}`;
    const ca = url.protocol === 'https:' ? loadCaCert(this.config.caCertPath) : undefined;
    this.ws = new WebSocket(`${wsUrl}?password=${encodeURIComponent(this.config.password)}`, {
      ...(ca ? { ca } : {})
    });

    this.ws.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        if (event.type === 'new-message' || event.type === 'updated-message') {
          await this.handleMessage(event.data);
        }
      } catch {}
    });

    this.ws.on('close', () => {
      if (this.running) setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', () => {});

    // Keep-alive
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
  }

  private async handleMessage(msg: any): Promise<void> {
    if (!msg || msg.isFromMe) return;
    const text = msg.text;
    const from = msg.handle?.address;
    if (!text || !from) return;

    // Deduplicate
    const ts = msg.dateCreated || 0;
    if (ts <= this.lastMessageTs) return;
    this.lastMessageTs = ts;
    await this.saveState();

    const allowed = await this.checkDMPolicy(from, text);
    if (!allowed) return;

    this.emit('message', {
      id: msg.guid, channelId: 'bluebubbles', from, chatId: msg.chats?.[0]?.guid || from,
      text, timestamp: new Date(ts).toISOString(), isDM: !msg.isGroup
    });
  }

  private async checkDMPolicy(from: string, text: string): Promise<boolean> {
    if (this.config.dmPolicy === 'none') return false;
    if (this.config.dmPolicy === 'open') return true;
    if (this.config.dmPolicy === 'allowlist') {
      if (this.config.allowFrom.includes(from)) return true;
      await this.sendMessage(from, '🦅 HyperClaw: Not on allowlist.'); return false;
    }
    if (this.config.dmPolicy === 'pairing') {
      if (this.config.approvedPairings.includes(from)) return true;
      const upper = text.trim().toUpperCase();
      if (this.config.pendingPairings[upper]) {
        this.config.approvedPairings.push(from); delete this.config.pendingPairings[upper];
        await this.saveState(); await this.sendMessage(from, '🦅 Paired!');
        this.emit('pairing:approved', { userId: from, channelId: 'bluebubbles' }); return true;
      }
      const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      this.config.pendingPairings[code] = from; await this.saveState();
      await this.sendMessage(from, `🦅 Pairing code: ${code}\nApprove: hyperclaw pairing approve bluebubbles ${code}`);
      return false;
    }
    return false;
  }

  async sendMessage(address: string, text: string): Promise<void> {
    await bbReq(this.config.serverUrl, this.config.password, 'POST', '/message/text', {
      chatGuid: `iMessage;-;${address}`,
      message: text.slice(0, 65536),
      method: 'apple-script'
    }, this.config.caCertPath);
  }

  disconnect(): void {
    this.running = false;
    this.ws?.close();
  }

  approvePairing(code: string): boolean {
    const upper = code.toUpperCase();
    if (!this.config.pendingPairings[upper]) return false;
    this.config.approvedPairings.push(this.config.pendingPairings[upper]);
    delete this.config.pendingPairings[upper]; this.saveState(); return true;
  }

  private async loadState(): Promise<void> { try { const s = await fs.readJson(STATE_FILE); this.lastMessageTs = s.lastTs || 0; if (s.p) this.config.pendingPairings = s.p; if (s.a) this.config.approvedPairings = s.a; } catch {} }
  private async saveState(): Promise<void> { await fs.ensureDir(path.dirname(STATE_FILE)); await fs.writeJson(STATE_FILE, { lastTs: this.lastMessageTs, p: this.config.pendingPairings, a: this.config.approvedPairings }, { spaces: 2 }); }
  isRunning() { return this.running; }
}
