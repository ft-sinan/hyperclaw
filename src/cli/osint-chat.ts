/**
 * src/cli/osint-chat.ts
 * OSINT-mode interactive terminal chat — `hyperclaw osint chat`
 * Loaded after osint setup; uses the saved OSINT profile as system prompt.
 *
 * Modes:
 *   Daemon mode  — daemon running on :18789? Connect via /api/chat with full
 *                  shell/exec/tool access (nmap, msfconsole, curl, dig, etc.)
 *                  OSINT prompt injected via OSINT-ACTIVE.md workspace file.
 *   Standalone   — daemon not running? Fall back to InferenceEngine directly.
 */

import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { getConfigPath, resolveTools, loadSkillsContext, InferenceEngine } from '../../packages/core/src/index';
import { getHyperClawDir } from '../infra/paths';
import type { InferenceMessage } from '../../packages/core/src/agent/inference';

// Markdown → terminal renderer
marked.setOptions({ renderer: new TerminalRenderer({ emoji: true }) as any });

function renderMarkdown(text: string): string {
  try {
    const rendered = marked(text) as string;
    return rendered.split('\n').map(l => '  ' + l).join('\n').trimEnd();
  } catch {
    return '  ' + text;
  }
}

const RED_DIV  = chalk.red('  ' + '─'.repeat(56));
const GRAY_DIV = chalk.gray('  ' + '─'.repeat(56));

interface OsintProfile {
  mode: string;
  target?: string;
  targetType?: string;
  notes?: string;
  systemPromptOverride?: string;
}

function printOsintHeader(profile: OsintProfile, model: string, sessionId: string, daemonMode: boolean): void {
  const modeColors: Record<string, chalk.Chalk> = {
    recon:      chalk.cyan,
    bugbounty:  chalk.yellow,
    pentest:    chalk.hex('#cc0000'),
    footprint:  chalk.magenta,
    custom:     chalk.white,
  };
  const modeColor = modeColors[profile.mode] ?? chalk.white;

  const blood  = chalk.hex('#cc0000').bold;
  const darkRed = chalk.hex('#8B0000').bold;

  console.log();

  if (daemonMode) {
    // ── Blood-red daemon banner ────────────────────────────────────────────
    console.log(blood('  ██████╗  ██╗      ██████╗  ██████╗ ██████╗ '));
    console.log(blood('  ██╔══██╗ ██║     ██╔═══██╗██╔═══██╗██╔══██╗'));
    console.log(blood('  ██████╔╝ ██║     ██║   ██║██║   ██║██║  ██║'));
    console.log(blood('  ██╔══██╗ ██║     ██║   ██║██║   ██║██║  ██║'));
    console.log(darkRed('  ██████╔╝ ███████╗╚██████╔╝╚██████╔╝██████╔╝'));
    console.log(darkRed('  ╚═════╝  ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ '));
    console.log();
    console.log(blood('  🩸 HYPERCLAW OSINT  ·  DAEMON MODE'));
    console.log(chalk.hex('#8B0000')('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(blood(`  Workflow: `) + modeColor(profile.mode.toUpperCase()));
    if (profile.target) {
      console.log(blood(`  🎯 Target: `) + chalk.white.bold(profile.target) + chalk.hex('#8B0000')(` (${profile.targetType ?? 'custom'})`));
    }
    if (profile.notes) {
      console.log(chalk.hex('#8B0000')(`  📝 Notes: ${profile.notes}`));
    }
    console.log(blood(`  🩸 Daemon: `) + chalk.green.bold('connected') + chalk.gray(' — full shell/tool access'));
    console.log(chalk.hex('#8B0000')(`  🔧 nmap · curl · dig · whois · msfconsole · dirb · nikto · sqlmap`));
    console.log(chalk.hex('#8B0000')(`  Model: ${model}  ·  Session: ${sessionId}`));
    console.log(chalk.hex('#8B0000')('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(blood('  ⚠️  Authorized security research only. Stay within scope.'));
    console.log(chalk.hex('#8B0000')('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.hex('#8B0000')('  Commands: /exit  /clear  /findings  /target <value>  /mode  /help'));
    console.log(chalk.hex('#8B0000')('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  } else {
    // ── Standard OSINT banner ──────────────────────────────────────────────
    console.log(RED_DIV);
    console.log(chalk.red.bold('  🔍 HYPERCLAW OSINT MODE'));
    console.log(chalk.gray(`  Workflow: `) + modeColor.bold(profile.mode.toUpperCase()));
    if (profile.target) {
      console.log(chalk.gray(`  🎯 Target: `) + chalk.white.bold(profile.target) + chalk.gray(` (${profile.targetType ?? 'custom'})`));
    }
    if (profile.notes) {
      console.log(chalk.gray(`  📝 Notes: ${profile.notes}`));
    }
    console.log(chalk.gray(`  ⚡ Mode: standalone — start daemon for full shell access`));
    console.log(chalk.gray(`  Model: ${model}  ·  Session: ${sessionId}`));
    console.log(RED_DIV);
    console.log(chalk.yellow('  ⚠️  Authorized security research only. Stay within scope.'));
    console.log(RED_DIV);
    console.log(chalk.gray('  Commands: /exit  /clear  /findings  /target <value>  /mode  /help'));
    console.log(RED_DIV);
  }

  console.log();
}

function printOsintHelp(profile: OsintProfile): void {
  console.log();
  console.log(chalk.red.bold('  🔍 OSINT Chat Commands:'));
  console.log(`  ${chalk.red('/exit')}                   — 🚪 quit the session`);
  console.log(`  ${chalk.red('/clear')}                  — 🗑️  clear conversation history`);
  console.log(`  ${chalk.red('/findings')}               — 💾 save this session as a markdown report`);
  console.log(`  ${chalk.red('/target <value>')}         — 🎯 update the active target`);
  console.log(`  ${chalk.red('/mode')}                   — ⚙️  show current workflow mode`);
  console.log(`  ${chalk.red('/prompt')}                 — 📝 show current session prompt`);
  console.log(`  ${chalk.red('/prompt <text>')}          — 📝 add extra instructions for this session`);
  console.log(`  ${chalk.red('/prompt clear')}           — 🧹 remove extra instructions`);
  console.log(`  ${chalk.red('/skill list')}             — 🧩 list installed skills`);
  console.log(`  ${chalk.red('/skill add <id>')}         — ➕ activate a skill for this session`);
  console.log(`  ${chalk.red('/skill remove <id>')}      — ➖ deactivate a skill`);
  console.log(`  ${chalk.red('/help')}                   — ❓ show this help`);
  console.log();
  console.log(chalk.gray('  💡 Example prompts for ') + chalk.yellow.bold(profile.mode) + chalk.gray(' mode:'));
  const examples: Record<string, string[]> = {
    recon:      [
      '🌐 Perform passive recon on the target: WHOIS, DNS, subdomains',
      '🐙 Find public GitHub repos and exposed config files',
    ],
    bugbounty:  [
      '🐛 Test for XSS on the login form at /auth/login',
      '📄 Draft a bug bounty report for an SSRF vulnerability',
    ],
    pentest:    [
      '🔭 Enumerate open ports and running services on the target',
      '📋 Create a pentest report template for a web application',
    ],
    footprint:  [
      '👤 Map the digital footprint of this username across platforms',
      '📧 Search for email leaks associated with this domain',
    ],
    custom:     ['🚀 Start your research task...'],
  };
  for (const ex of (examples[profile.mode] ?? examples.custom)) {
    console.log(chalk.gray(`  • "${ex}"`));
  }
  console.log();
  console.log(chalk.gray('  💡 Tips:'));
  console.log(chalk.gray('  • /prompt You are a senior pentester. Always use nmap first.'));
  console.log(chalk.gray('  • /skill add osint-toolkit  — add a skill for this session'));
  console.log(chalk.gray('  • /findings  — save a markdown report at any time'));
  console.log(chalk.gray('  • /target example.com  — switch target mid-session'));
  console.log();
}

async function saveFindings(messages: InferenceMessage[], profile: OsintProfile): Promise<void> {
  const osintDir = path.join(getHyperClawDir(), 'osint-reports');
  await fs.ensureDir(osintDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = (profile.target ?? profile.mode).replace(/[^a-zA-Z0-9._-]/g, '-');
  const filename = `osint-${slug}-${timestamp}.md`;
  const filepath = path.join(osintDir, filename);

  const lines: string[] = [
    `# OSINT Report — ${profile.target ?? profile.mode}`,
    ``,
    `**Workflow:** ${profile.mode}`,
    profile.target ? `**Target:** ${profile.target} (${profile.targetType ?? 'custom'})` : '',
    profile.notes  ? `**Notes:** ${profile.notes}` : '',
    `**Generated:** ${new Date().toLocaleString()}`,
    ``,
    `---`,
    ``,
    `## Session Transcript`,
    ``,
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`### 💬 Analyst`);
      lines.push(String(msg.content));
      lines.push('');
    } else if (msg.role === 'assistant') {
      lines.push(`### 🔍 Agent`);
      lines.push(String(msg.content));
      lines.push('');
    }
  }

  await fs.writeFile(filepath, lines.filter(l => l !== undefined).join('\n'));
  console.log(chalk.green(`\n  ✅ Report saved: ${filepath}\n`));
}

function makeSessionId(): string {
  const { randomBytes } = require('crypto');
  return randomBytes(5).toString('hex');
}

// ─── Daemon detection ──────────────────────────────────────────────────────────

async function probeDaemon(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/status`, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json?.running === true);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function callDaemonChat(
  message: string,
  sessionKey: string,
  port: number,
  authToken?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message, sessionKey });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString(),
      'X-HyperClaw-Source': 'osint-cli',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/chat',
      method: 'POST',
      headers,
      timeout: 300_000, // 5 min — OSINT tasks can take a while
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 401) {
          reject(new Error('Daemon requires auth. Set gateway.authToken in config or unset it.'));
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error));
          else resolve(json.response ?? '(empty response)');
        } catch {
          resolve(data || '(empty response)');
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Daemon request timed out')); });
    req.write(body);
    req.end();
  });
}

// ─── OSINT chat loop (shared for daemon + standalone) ─────────────────────────

export async function runOsintChat(opts: {
  sessionId?: string;
  model?: string;
}): Promise<void> {
  // Load OSINT profile
  const profilePath = path.join(getHyperClawDir(), 'osint-profile.json');
  let profile: OsintProfile;
  try {
    profile = await fs.readJson(profilePath);
  } catch {
    console.log(chalk.red('\n  ❌ No OSINT profile found. Run: hyperclaw osint setup\n'));
    return;
  }

  // Load config
  const cfg = await fs.readJson(getConfigPath()).catch(() => null);
  if (!cfg) {
    console.log(chalk.red('\n  ❌ No configuration found. Run: hyperclaw onboard\n'));
    return;
  }

  const daemonPort = cfg?.gateway?.port ?? 18789;
  const authToken: string | undefined = cfg?.gateway?.authToken || undefined;

  // ── Detect daemon ──────────────────────────────────────────────────────────
  const s = ora(chalk.gray('  Checking for daemon...')).start();
  const daemonRunning = await probeDaemon(daemonPort);
  s.stop();

  if (daemonRunning) {
    await runOsintChatDaemon({ profile, cfg, daemonPort, authToken, opts });
  } else {
    await runOsintChatStandalone({ profile, cfg, opts });
  }
}

// ─── Daemon mode ──────────────────────────────────────────────────────────────

async function runOsintChatDaemon(params: {
  profile: OsintProfile;
  cfg: any;
  daemonPort: number;
  authToken?: string;
  opts: { sessionId?: string; model?: string };
}): Promise<void> {
  const { profile, cfg, daemonPort, authToken, opts } = params;

  // Inject OSINT context into daemon workspace by writing OSINT-ACTIVE.md
  const hcDir = getHyperClawDir();
  const osintActivePath = path.join(hcDir, 'OSINT-ACTIVE.md');
  const targetContext = profile.target
    ? `\n\nActive target for this session: ${profile.target} (${profile.targetType ?? 'custom'}).`
    : '';
  const osintActiveContent = [
    '# OSINT Active Session',
    '',
    '> This file is auto-generated by `hyperclaw osint chat` — daemon mode.',
    '> Delete it (or run `hyperclaw osint --reset`) to return to normal mode.',
    '',
    profile.systemPromptOverride ?? '',
    targetContext,
    '',
    '## OSINT Tool Guidance',
    '',
    'You have full shell access via the `exec` tool. Common security tools available:',
    '- **nmap** — port scanning, service fingerprinting (`nmap -sV -sC <target>`)',
    '- **curl** — HTTP probing, header inspection, payload testing',
    '- **dig / nslookup / host** — DNS enumeration',
    '- **whois** — domain/IP registration info',
    '- **dirb / gobuster / ffuf** — directory/file brute-forcing',
    '- **nikto** — web vulnerability scanning',
    '- **theHarvester** — email/subdomain/name harvesting',
    '- **msfconsole / msfvenom** — Metasploit (pentest mode, authorized targets only)',
    '- **sqlmap** — SQL injection testing (authorized targets only)',
    '- **subfinder / amass** — subdomain enumeration',
    '',
    'Always check authorization before running active scanning tools.',
    'Use `process` tool to manage long-running background scans.',
  ].join('\n');

  await fs.ensureDir(hcDir);
  await fs.writeFile(osintActivePath, osintActiveContent, 'utf8');

  const rawModel = opts.model || cfg?.provider?.modelId || 'claude-sonnet-4-5';
  const sessionKey = `osint-${opts.sessionId ?? makeSessionId()}`;
  const messages: InferenceMessage[] = [];

  // Session-level prompt + skill overrides (injected into OSINT-ACTIVE.md)
  let sessionExtraPrompt = '';
  const sessionActiveSkills = new Map<string, string>(); // id → context

  async function rebuildOsintActive(): Promise<void> {
    const parts: string[] = [osintActiveContent];
    if (sessionExtraPrompt) {
      parts.push(`\n## Session Instructions\n${sessionExtraPrompt}`);
    }
    if (sessionActiveSkills.size > 0) {
      parts.push('\n## Session Skills');
      for (const [id, ctx] of sessionActiveSkills) {
        parts.push(`\n### ${id}\n${ctx}`);
      }
    }
    await fs.writeFile(osintActivePath, parts.join('\n'), 'utf8').catch(() => {});
  }

  printOsintHeader(profile, rawModel, sessionKey, true);

  // Set up readline
  if (process.stdin.isTTY) process.stdin.resume();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  const cleanup = async () => {
    await fs.remove(osintActivePath).catch(() => {});
  };

  rl.on('SIGINT', async () => {
    console.log(chalk.gray('\n\n  🔒 OSINT session closed.\n'));
    await cleanup();
    rl.close();
    process.exit(0);
  });

  const INPUT_PROMPT = chalk.red('  🔍 OSINT › ');

  await new Promise<void>((resolve) => {
    rl.on('close', () => { cleanup().finally(resolve); });

    const prompt = () => {
      rl.question(INPUT_PROMPT, (input) => {
        if (input === null || input === undefined) { prompt(); return; }
        void (async () => {
          const text = input.trim();
          if (!text) { prompt(); return; }

          // Built-in commands
          if (['/exit', '/quit', 'exit', 'quit'].includes(text.toLowerCase())) {
            console.log(chalk.gray('\n  🔒 OSINT session closed.\n'));
            await cleanup();
            rl.close();
            process.exit(0);
          }
          if (text === '/help') { printOsintHelp(profile); prompt(); return; }
          if (text === '/mode') {
            console.log(chalk.hex('#cc0000')(`\n  ⚙️  Workflow: `) + chalk.yellow.bold(profile.mode.toUpperCase()));
            if (profile.target) console.log(chalk.hex('#cc0000')(`  🎯 Target: `) + chalk.white.bold(profile.target));
            console.log(chalk.green(`  🩸 Daemon: connected (port ${daemonPort})`));
            if (sessionExtraPrompt) console.log(chalk.gray(`  📝 Extra prompt: active`));
            if (sessionActiveSkills.size > 0) console.log(chalk.gray(`  🧩 Active skills: ${[...sessionActiveSkills.keys()].join(', ')}`));
            console.log();
            prompt(); return;
          }
          if (text === '/clear') {
            messages.length = 0;
            console.log(chalk.gray('\n  🗑️  Local history cleared. (Daemon session persists — use a new session key to fully reset)\n'));
            prompt(); return;
          }
          if (text === '/findings') {
            if (messages.length === 0) {
              console.log(chalk.gray('\n  💾 No conversation to save yet.\n'));
            } else {
              await saveFindings(messages, profile);
            }
            prompt(); return;
          }
          if (text.startsWith('/target ')) {
            const newTarget = text.slice(8).trim();
            if (newTarget) {
              profile.target = newTarget;
              // Update OSINT-ACTIVE.md with new target
              const updated = osintActiveContent.replace(
                targetContext || '',
                `\n\nActive target for this session: ${newTarget}.`
              );
              await fs.writeFile(osintActivePath, updated, 'utf8').catch(() => {});
              console.log(chalk.green(`\n  🎯 Target updated: ${chalk.bold(newTarget)}\n`));
            }
            prompt(); return;
          }

          // ── /prompt (daemon) ───────────────────────────────────────────────
          if (text === '/prompt' || text.startsWith('/prompt ')) {
            const arg = text.slice(7).trim();
            if (!arg) {
              console.log();
              if (sessionExtraPrompt) {
                console.log(chalk.hex('#cc0000').bold('  📝 Session prompt:'));
                console.log(chalk.white(`  ${sessionExtraPrompt.slice(0, 400)}${sessionExtraPrompt.length > 400 ? '…' : ''}`));
              } else {
                console.log(chalk.gray('  📝 No extra prompt set. Use: /prompt <text>'));
              }
              console.log();
            } else if (arg === 'clear') {
              sessionExtraPrompt = '';
              await rebuildOsintActive();
              console.log(chalk.green('\n  🧹 Extra prompt cleared.\n'));
            } else {
              sessionExtraPrompt = arg;
              await rebuildOsintActive();
              console.log(chalk.green(`\n  ✅ Session prompt set: ${chalk.white(arg.slice(0, 60))}${arg.length > 60 ? '…' : ''}\n`));
            }
            prompt(); return;
          }

          // ── /skill (daemon) ────────────────────────────────────────────────
          if (text === '/skill' || text.startsWith('/skill ')) {
            const arg = text.slice(6).trim();
            const [subCmd, ...rest] = arg.split(/\s+/);
            const skillId = rest.join(' ').trim();

            if (!subCmd || subCmd === 'list') {
              console.log();
              try {
                const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
                const all = await loadSkills();
                if (all.length === 0) {
                  console.log(chalk.gray('  🧩 No skills installed.'));
                } else {
                  console.log(chalk.hex('#cc0000').bold('  🧩 Installed skills:'));
                  for (const s of all) {
                    const active = sessionActiveSkills.has(s.id) ? chalk.green(' ✔ active') : '';
                    console.log(`  ${chalk.hex('#cc0000')('🔹')} ${chalk.bold(s.title || s.id)} ${chalk.gray(`(${s.id})`)}${active}`);
                    if (s.capabilities) console.log(chalk.gray(`    ${s.capabilities}`));
                  }
                }
              } catch { console.log(chalk.gray('  ⚠️  Could not load skills.')); }
              console.log();
              prompt(); return;
            }

            if (subCmd === 'add') {
              if (!skillId) { console.log(chalk.gray('\n  Usage: /skill add <id>\n')); prompt(); return; }
              try {
                const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
                const all = await loadSkills();
                const found = all.find(s => s.id === skillId || (s.title ?? '').toLowerCase() === skillId.toLowerCase());
                if (!found) {
                  console.log(chalk.yellow(`\n  ⚠️  Skill "${skillId}" not found. Use /skill list.\n`));
                } else {
                  const ctx = [found.title ? `**${found.title}**` : found.id, found.capabilities ?? '', (found as any).description ?? ''].filter(Boolean).join('\n');
                  sessionActiveSkills.set(found.id, ctx);
                  await rebuildOsintActive();
                  console.log(chalk.green(`\n  ✅ Skill activated: ${chalk.bold(found.title || found.id)}\n`));
                }
              } catch (e: any) { console.log(chalk.red(`\n  ❌ ${e?.message}\n`)); }
              prompt(); return;
            }

            if (subCmd === 'remove') {
              if (!skillId) { console.log(chalk.gray('\n  Usage: /skill remove <id>\n')); prompt(); return; }
              if (sessionActiveSkills.has(skillId)) {
                sessionActiveSkills.delete(skillId);
                await rebuildOsintActive();
                console.log(chalk.green(`\n  ✅ Skill deactivated: ${skillId}\n`));
              } else {
                console.log(chalk.gray(`\n  ℹ️  Skill "${skillId}" not active in this session.\n`));
              }
              prompt(); return;
            }

            console.log(chalk.gray('\n  Usage: /skill list | /skill add <id> | /skill remove <id>\n'));
            prompt(); return;
          }

          // Add user message
          messages.push({ role: 'user', content: text });

          console.log(GRAY_DIV);
          console.log(chalk.bold.green('  💬 Analyst › ') + chalk.white(text));
          console.log(GRAY_DIV);

          let responseText = '';
          let elapsed = 0;
          let ticker: ReturnType<typeof setInterval> | undefined;
          const spinner = ora({ text: chalk.red(`  🤔 Analyzing... (${elapsed}s • Ctrl+C to stop)`), prefixText: '' }).start();
          ticker = setInterval(() => {
            elapsed++;
            spinner.text = chalk.red(`  🩸 Agent working... (${elapsed}s • Ctrl+C to stop)`);
          }, 1000);

          try {
            responseText = await callDaemonChat(text, sessionKey, daemonPort, authToken);
            if (ticker) clearInterval(ticker);
            spinner.stop();

            console.log(chalk.bold.red('\n  🔍 Agent ›'));
            process.stdout.write(renderMarkdown(responseText));
            console.log('\n');
            console.log(RED_DIV);
            console.log(chalk.gray(`  🩸 Daemon mode  ·  ${rawModel}  ·  Session: ${sessionKey}`));
            console.log(chalk.gray(`  💡 Tip: use /findings to save this session as a report.\n`));
          } catch (e: any) {
            if (ticker) clearInterval(ticker);
            spinner.stop();
            const msg = e?.message || String(e);
            responseText = `Error: ${msg}`;
            console.log(chalk.red(`\n  ❌ Error: ${msg}\n`));
          }

          if (responseText && !responseText.startsWith('Error:')) {
            messages.push({ role: 'assistant', content: responseText });
          }

          prompt();
        })().catch((err) => {
          console.error(chalk.red('\n  Unexpected error:'), err?.message || err);
          prompt();
        });
      });
    };

    prompt();
  });
}

// ─── Standalone mode (no daemon) ──────────────────────────────────────────────

async function runOsintChatStandalone(params: {
  profile: OsintProfile;
  cfg: any;
  opts: { sessionId?: string; model?: string };
}): Promise<void> {
  const { profile, cfg, opts } = params;

  const { getProviderCredentialAsync } = await import('../infra/env-resolve');
  const apiKey = await getProviderCredentialAsync(cfg).catch(() => null);
  const isLocal = ['local', 'ollama', 'lmstudio'].includes(cfg?.provider?.providerId ?? '');
  if (!apiKey && !isLocal) {
    console.log(chalk.red('\n  ❌ No API key configured. Run: hyperclaw config set-key\n'));
    return;
  }

  const { getProvider } = await import('./providers');
  const providerMeta = getProvider(cfg?.provider?.providerId ?? '');
  const CUSTOM_IDS = new Set(['groq','mistral','deepseek','perplexity','huggingface','ollama','lmstudio','local','xai','openai','google','minimax','moonshot','qwen','zai','litellm','cloudflare','copilot','vercel-ai','opencode-zen']);
  const isAnthropicVariant = ['anthropic','anthropic-oauth','anthropic-setup-token'].includes(cfg?.provider?.providerId ?? '');
  const provider: 'anthropic' | 'openrouter' | 'custom' = isAnthropicVariant ? 'anthropic'
    : (cfg?.provider?.providerId === 'custom' || isLocal || CUSTOM_IDS.has(cfg?.provider?.providerId ?? '')) ? 'custom' : 'openrouter';

  const rawModel = opts.model || cfg?.provider?.modelId || 'claude-sonnet-4-5';
  const model = rawModel.startsWith('ollama/') ? rawModel.slice(7) : rawModel;
  const resolvedBaseUrl = cfg?.provider?.baseUrl || providerMeta?.baseUrl || (isLocal ? 'http://localhost:11434/v1' : undefined);

  const tools = await resolveTools({ config: cfg, source: 'cli', elevated: true, daemonMode: false });
  const skillsCtx = await loadSkillsContext();

  const targetContext = profile.target
    ? `\n\nActive target for this session: ${profile.target} (${profile.targetType ?? 'custom'}).`
    : '';
  const baseSystemPrompt = (profile.systemPromptOverride ?? '') + targetContext + (skillsCtx ? `\n\n${skillsCtx}` : '');

  // Session-level prompt + skill overrides
  let sessionExtraPrompt = '';
  const sessionActiveSkills = new Map<string, string>(); // id → context

  function buildStandaloneSystem(): string {
    let sys = baseSystemPrompt;
    if (sessionExtraPrompt) sys += `\n\n## Session Instructions\n${sessionExtraPrompt}`;
    if (sessionActiveSkills.size > 0) {
      sys += '\n\n## Session Skills';
      for (const [id, ctx] of sessionActiveSkills) {
        sys += `\n\n### ${id}\n${ctx}`;
      }
    }
    return sys;
  }

  const engineOpts: any = {
    model,
    apiKey,
    provider,
    system: buildStandaloneSystem(),
    tools,
    maxTokens: 4096,
    onToken: () => {},
    ...(provider === 'custom' ? { baseUrl: resolvedBaseUrl || '' } : {}),
  };

  const sessionId = opts.sessionId ?? makeSessionId();
  const messages: InferenceMessage[] = [];

  printOsintHeader(profile, rawModel, sessionId, false);
  console.log(chalk.gray('  💡 Tip: start the daemon for full shell/tool access:'));
  console.log(chalk.gray('     hyperclaw daemon start\n'));

  if (process.stdin.isTTY) process.stdin.resume();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  rl.on('SIGINT', () => {
    console.log(chalk.gray('\n\n  🔒 OSINT session closed.\n'));
    rl.close();
    process.exit(0);
  });

  const INPUT_PROMPT = chalk.red('  🔍 OSINT › ');

  await new Promise<void>((resolve) => {
    rl.on('close', resolve);

    const prompt = () => {
      rl.question(INPUT_PROMPT, (input) => {
        if (input === null || input === undefined) { prompt(); return; }
        void (async () => {
          const text = input.trim();
          if (!text) { prompt(); return; }

          if (['/exit', '/quit', 'exit', 'quit'].includes(text.toLowerCase())) {
            console.log(chalk.gray('\n  🔒 OSINT session closed.\n'));
            rl.close();
            process.exit(0);
          }
          if (text === '/help') { printOsintHelp(profile); prompt(); return; }
          if (text === '/mode') {
            console.log(chalk.gray(`\n  Workflow: `) + chalk.yellow.bold(profile.mode));
            if (profile.target) console.log(chalk.gray(`  🎯 Target: `) + chalk.white(profile.target));
            console.log(chalk.gray(`  ⚡ Standalone (no daemon)`));
            console.log();
            prompt(); return;
          }
          if (text === '/clear') {
            messages.length = 0;
            console.log(chalk.gray('\n  🗑️  Conversation cleared.\n'));
            prompt(); return;
          }
          if (text === '/findings') {
            if (messages.length === 0) {
              console.log(chalk.gray('\n  💾 No conversation to save yet.\n'));
            } else {
              await saveFindings(messages, profile);
            }
            prompt(); return;
          }
          if (text.startsWith('/target ')) {
            const newTarget = text.slice(8).trim();
            if (newTarget) {
              profile.target = newTarget;
              engineOpts.system = buildStandaloneSystem().replace(
                targetContext,
                `\n\nActive target for this session: ${newTarget}.`
              );
              console.log(chalk.green(`\n  🎯 Target updated: ${chalk.bold(newTarget)}\n`));
            }
            prompt(); return;
          }

          // ── /prompt (standalone) ────────────────────────────────────────────
          if (text === '/prompt' || text.startsWith('/prompt ')) {
            const arg = text.slice(7).trim();
            if (!arg) {
              console.log();
              if (sessionExtraPrompt) {
                console.log(chalk.red.bold('  📝 Session prompt:'));
                console.log(chalk.white(`  ${sessionExtraPrompt.slice(0, 400)}${sessionExtraPrompt.length > 400 ? '…' : ''}`));
              } else {
                console.log(chalk.gray('  📝 No extra prompt set. Use: /prompt <text>'));
              }
              console.log();
            } else if (arg === 'clear') {
              sessionExtraPrompt = '';
              engineOpts.system = buildStandaloneSystem();
              console.log(chalk.green('\n  🧹 Extra prompt cleared.\n'));
            } else {
              sessionExtraPrompt = arg;
              engineOpts.system = buildStandaloneSystem();
              console.log(chalk.green(`\n  ✅ Session prompt set: ${chalk.white(arg.slice(0, 60))}${arg.length > 60 ? '…' : ''}\n`));
            }
            prompt(); return;
          }

          // ── /skill (standalone) ─────────────────────────────────────────────
          if (text === '/skill' || text.startsWith('/skill ')) {
            const arg = text.slice(6).trim();
            const [subCmd, ...rest] = arg.split(/\s+/);
            const skillId = rest.join(' ').trim();

            if (!subCmd || subCmd === 'list') {
              console.log();
              try {
                const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
                const all = await loadSkills();
                if (all.length === 0) {
                  console.log(chalk.gray('  🧩 No skills installed.'));
                } else {
                  console.log(chalk.red.bold('  🧩 Installed skills:'));
                  for (const s of all) {
                    const active = sessionActiveSkills.has(s.id) ? chalk.green(' ✔ active') : '';
                    console.log(`  ${chalk.red('🔹')} ${chalk.bold(s.title || s.id)} ${chalk.gray(`(${s.id})`)}${active}`);
                    if (s.capabilities) console.log(chalk.gray(`    ${s.capabilities}`));
                  }
                }
              } catch { console.log(chalk.gray('  ⚠️  Could not load skills.')); }
              console.log();
              prompt(); return;
            }

            if (subCmd === 'add') {
              if (!skillId) { console.log(chalk.gray('\n  Usage: /skill add <id>\n')); prompt(); return; }
              try {
                const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
                const all = await loadSkills();
                const found = all.find(s => s.id === skillId || (s.title ?? '').toLowerCase() === skillId.toLowerCase());
                if (!found) {
                  console.log(chalk.yellow(`\n  ⚠️  Skill "${skillId}" not found. Use /skill list.\n`));
                } else {
                  const ctx = [found.title ? `**${found.title}**` : found.id, found.capabilities ?? '', (found as any).description ?? ''].filter(Boolean).join('\n');
                  sessionActiveSkills.set(found.id, ctx);
                  engineOpts.system = buildStandaloneSystem();
                  console.log(chalk.green(`\n  ✅ Skill activated: ${chalk.bold(found.title || found.id)}\n`));
                }
              } catch (e: any) { console.log(chalk.red(`\n  ❌ ${e?.message}\n`)); }
              prompt(); return;
            }

            if (subCmd === 'remove') {
              if (!skillId) { console.log(chalk.gray('\n  Usage: /skill remove <id>\n')); prompt(); return; }
              if (sessionActiveSkills.has(skillId)) {
                sessionActiveSkills.delete(skillId);
                engineOpts.system = buildStandaloneSystem();
                console.log(chalk.green(`\n  ✅ Skill deactivated: ${skillId}\n`));
              } else {
                console.log(chalk.gray(`\n  ℹ️  Skill "${skillId}" not active in this session.\n`));
              }
              prompt(); return;
            }

            console.log(chalk.gray('\n  Usage: /skill list | /skill add <id> | /skill remove <id>\n'));
            prompt(); return;
          }

          messages.push({ role: 'user', content: text });

          console.log(GRAY_DIV);
          console.log(chalk.bold.green('  💬 Analyst › ') + chalk.white(text));
          console.log(GRAY_DIV);

          let responseText = '';
          let elapsed = 0;
          let ticker: ReturnType<typeof setInterval> | undefined;
          const spinner = ora({ text: chalk.red(`  🤔 Analyzing... (${elapsed}s • Ctrl+C to stop)`), prefixText: '' }).start();
          ticker = setInterval(() => {
            elapsed++;
            spinner.text = chalk.red(`  🤔 Analyzing... (${elapsed}s • Ctrl+C to stop)`);
          }, 1000);

          try {
            const engine = new InferenceEngine({
              ...engineOpts,
              onToken: () => {
                if (spinner.isSpinning) spinner.text = chalk.red(`  📡 Gathering intel... (${elapsed}s • Ctrl+C to stop)`);
              },
              onToolCall: (name: string) => {
                spinner.stop();
                console.log(chalk.red(`\n  🔧 ${chalk.bold(name)}`));
                spinner.start(chalk.red(`  ⚙️  Running tool... (${elapsed}s)`));
              },
            });

            const result = await engine.run(messages);
            responseText = result.text || '';
            if (ticker) clearInterval(ticker);
            spinner.stop();

            console.log(chalk.bold.red('\n  🔍 Agent ›'));
            if (responseText) {
              process.stdout.write(renderMarkdown(responseText));
            } else {
              process.stdout.write(chalk.gray('  (empty response)'));
            }
            console.log('\n');
            console.log(RED_DIV);

            if (result.usage) {
              console.log(chalk.gray(`  📊 Tokens in: ${result.usage.input}  out: ${result.usage.output}  ·  ${rawModel}`));
              console.log(chalk.gray(`  💡 Tip: use /findings to save this session as a report.\n`));
            } else {
              console.log();
            }
          } catch (e: any) {
            if (ticker) clearInterval(ticker);
            spinner.stop();
            const msg = e?.message || String(e);
            responseText = `Error: ${msg}`;
            console.log(chalk.red(`\n  ❌ Error: ${msg}\n`));
          }

          if (responseText && !responseText.startsWith('Error:')) {
            messages.push({ role: 'assistant', content: responseText });
          }

          prompt();
        })().catch((err) => {
          console.error(chalk.red('\n  Unexpected error:'), err?.message || err);
          prompt();
        });
      });
    };

    prompt();
  });
}
