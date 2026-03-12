/**
 * src/infra/destructive-gate.ts
 * Gating for destructive tools: require elevation (or main surface) unless confirmed.
 * Channels need elevated session for delete_file, kill_process, run_shell (dangerous patterns).
 *
 * Security: approval prompts sanitize invisible Unicode format characters (GHSA-pcqg-f7rg-xfvv)
 * to prevent zero-width command spoofing.
 */

import type { Tool } from '../../packages/core/src/agent/inference';

// Regex matching Unicode format/invisible characters (Cf category + zero-width variants)
const INVISIBLE_UNICODE_RE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0]/gu;

/**
 * Escape invisible Unicode format characters to visible \u{...} escapes.
 * Prevents zero-width characters from spoofing displayed commands in approval prompts.
 */
function sanitizeApprovalText(text: string): string {
  return text.replace(INVISIBLE_UNICODE_RE, (ch) => `\\u{${ch.codePointAt(0)!.toString(16)}}`);
}

const DESTRUCTIVE_TOOLS = ['delete_file', 'kill_process'];

const DANGEROUS_SHELL_PATTERNS = [
  /\brm\s+-[rf]\b|\brm\s+--recursive|\brm\s+-rf\b/,
  /\bmkfs\.|format\s+/i,
  /\bdd\s+if=/,
  /\b>\/dev\/sd[a-z]/,
  /\bshutdown\s+-/,
  /\breboot\b/i,
  /\b:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}/,  // fork bomb
  /\bcurl\s+.*\s*\|\s*sh\b/,
  /\bwget\s+.*\s*\|\s*(bash|sh)\b/
];

function isDangerousShellCommand(cmd: string): boolean {
  const c = (cmd || '').trim();
  for (const re of DANGEROUS_SHELL_PATTERNS) {
    if (re.test(c)) return true;
  }
  return false;
}

const CHANNEL_SOURCES = new Set([
  'telegram', 'discord', 'whatsapp', 'slack', 'signal', 'matrix', 'line',
  'nostr', 'feishu', 'msteams', 'teams', 'instagram', 'messenger', 'twitter',
  'viber', 'zalo', 'webhook:inbound'
]);

const BLOCKED_MSG = 'Blocked: destructive action requires elevated session. Use "elevate" or run from CLI with full access.';

function buildPendingMsg(toolName: string, cmd?: string): string {
  const safeTool = sanitizeApprovalText(toolName);
  const cmdInfo = cmd ? ` Command: \`${sanitizeApprovalText(cmd)}\`` : '';
  return `This action requires confirmation. Tool: \`${safeTool}\`.${cmdInfo} Reply "confirm" to proceed.`;
}

export interface DestructiveGateOpts {
  elevated: boolean;
  source?: string;
  /** When set, store pending instead of hard block (enables confirm flow) */
  sessionId?: string;
}

/**
 * Wrap tools so destructive ones are gated. When sessionId set, stores pending for confirm flow.
 */
export function applyDestructiveGate(tools: Tool[], opts: DestructiveGateOpts): Tool[] {
  const { elevated, source, sessionId } = opts;
  const fromChannel = source && CHANNEL_SOURCES.has(source);

  if (!fromChannel || elevated) {
    return tools;
  }

  return tools.map(t => {
    if (DESTRUCTIVE_TOOLS.includes(t.name)) {
      const orig = t.handler;
      return {
        ...t,
        handler: async (input: Record<string, unknown>) => {
          if (sessionId) {
            const { setPending } = await import('./pending-approval');
            setPending(sessionId, {
              toolName: t.name,
              input,
              execute: () => orig(input)
            });
            return buildPendingMsg(t.name);
          }
          return BLOCKED_MSG;
        }
      };
    }
    if (t.name === 'run_shell') {
      const orig = t.handler;
      return {
        ...t,
        handler: async (input: Record<string, unknown>) => {
          const cmd = (input.command as string) || '';
          if (isDangerousShellCommand(cmd)) {
            if (sessionId) {
              const { setPending } = await import('./pending-approval');
              setPending(sessionId, { toolName: 'run_shell', input, execute: () => orig(input) });
              return buildPendingMsg('run_shell', cmd);
            }
            return BLOCKED_MSG;
          }
          return orig(input);
        }
      };
    }
    return t;
  });
}
