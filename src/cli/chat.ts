/**
 * src/cli/chat.ts
 * Interactive terminal chat — `hyperclaw chat`
 * Multi-turn conversation with the agent directly from the terminal.
 */

import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { getConfigPath, resolveTools, loadWorkspaceContext, loadSkillsContext, InferenceEngine } from '../../packages/core/src/index';
import type { InferenceMessage } from '../../packages/core/src/agent/inference';

// Markdown → terminal renderer (set once at startup)
marked.setOptions({ renderer: new TerminalRenderer({ emoji: true }) as any });

function renderMarkdown(text: string): string {
  try {
    const rendered = marked(text) as string;
    // Indent by 2 spaces to align with chat style
    return rendered.split('\n').map(l => '  ' + l).join('\n').trimEnd();
  } catch {
    return '  ' + text;
  }
}

const DIVIDER = chalk.gray('  ' + '─'.repeat(56));

function printHeader(model: string, sessionId: string): void {
  console.log();
  console.log(DIVIDER);
  console.log(chalk.bold.cyan('  🦅 HYPERCLAW CHAT'));
  console.log(chalk.gray(`  Model: ${model}  ·  Session: ${sessionId}`));
  console.log(DIVIDER);
  console.log(chalk.gray('  Type your message and press Enter.'));
  console.log(chalk.gray('  Commands: /exit  /clear  /model  /prompt  /skill add|remove|list  /help'));
  console.log(DIVIDER);
  console.log();
}

function printHelp(): void {
  console.log();
  console.log(chalk.bold('  Commands:'));
  console.log(`  ${chalk.cyan('/exit')}                  — 🚪 quit the chat`);
  console.log(`  ${chalk.cyan('/clear')}                 — 🗑️  clear conversation history`);
  console.log(`  ${chalk.cyan('/model')}                 — 🤖 show / switch model`);
  console.log(`  ${chalk.cyan('/model <id>')}            — 🤖 switch model (e.g. /model claude-sonnet-4-5)`);
  console.log(`  ${chalk.cyan('/prompt')}                — 📝 show current session prompt`);
  console.log(`  ${chalk.cyan('/prompt <text>')}         — 📝 add extra instructions for this session`);
  console.log(`  ${chalk.cyan('/prompt clear')}          — 🧹 remove extra instructions`);
  console.log(`  ${chalk.cyan('/skills')}                — 🧩 list installed skills`);
  console.log(`  ${chalk.cyan('/skill add <id>')}        — ➕ activate a skill for this session`);
  console.log(`  ${chalk.cyan('/skill remove <id>')}     — ➖ deactivate a skill`);
  console.log(`  ${chalk.cyan('/help')}                  — ❓ show this help`);
  console.log();
  console.log(chalk.gray('  💡 Tips:'));
  console.log(chalk.gray('  • Tell the agent: "Install the web-search skill"'));
  console.log(chalk.gray('  • Paste a skill link: "Install this: https://clawhub.ai/user/skill-name"'));
  console.log(chalk.gray('  • Set a session goal: /prompt You are a senior backend engineer. Be concise.'));
  console.log(chalk.gray('  • Add to memory: "Remember that I prefer TypeScript"'));
  console.log();
}

async function printSkills(): Promise<void> {
  console.log();
  try {
    const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
    const skills = await loadSkills();
    if (skills.length === 0) {
      console.log(chalk.gray('  No skills installed yet.'));
    } else {
      console.log(chalk.bold('  🧩 Installed skills:'));
      for (const s of skills) {
        console.log(`  ${chalk.cyan('🔹')} ${chalk.bold(s.title || s.id)} ${chalk.gray(`(${s.id})`)}`);
        if (s.capabilities) console.log(chalk.gray(`    ${s.capabilities}`));
      }
    }
  } catch (e: any) {
    console.log(chalk.gray('  Could not load skills list.'));
    console.log(chalk.gray(`  ${(e?.message || String(e)).slice(0, 80)}`));
    console.log(chalk.gray('  Run: hyperclaw doctor  or  hyperclaw hub  to check setup.'));
  }
  console.log();
  console.log(chalk.bold('  How to add a skill:'));
  console.log(`  ${chalk.gray('1.')} Tell the agent: ${chalk.cyan('"Install the web-search skill"')}`);
  console.log(`  ${chalk.gray('2.')} Paste a link: ${chalk.cyan('"Install this: https://clawhub.ai/user/skill-name"')}`);
  console.log(`  ${chalk.gray('3.')} CLI (outside chat): ${chalk.cyan('hyperclaw skill install <name>')}`);
  console.log(`  ${chalk.gray('4.')} Re-run wizard:      ${chalk.cyan('hyperclaw onboard')}`);
  console.log();
}

async function interactiveChatUpdateCheck(): Promise<void> {
  try {
    const { checkForUpdates, getCurrentVersion } = await import('../infra/update-check');
    const current = await getCurrentVersion();

    const result = await checkForUpdates(current);
    if (!result?.available) return;

    const isWindows = process.platform === 'win32';
    const updateCmd = isWindows ? 'npm install -g hyperclaw@latest' : 'sudo npm install -g hyperclaw@latest';

    console.log();
    console.log(chalk.yellow(`  🦅 New version available! `) + chalk.bold.white(result.latest) + chalk.gray(`  (you have ${current})`));
    console.log(chalk.gray(`  📦 ${updateCmd}`));
    console.log();

    const inquirer = (await import('inquirer')).default;
    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        { name: `🚀  Update now & restart chat   ${chalk.gray('(recommended)')}`, value: 'update' },
        { name: `⏭️   Skip — continue to chat`, value: 'skip' },
      ],
      prefix: '  ✨',
    }]);

    // Clear any leftover inquirer output before continuing
    process.stdout.write('\n');

    if (choice === 'skip') {
      console.log(chalk.gray(`  ⏭️  Skipping — run: ${updateCmd} when ready.\n`));
      return;
    }

    console.log(chalk.cyan('  ⏳ Updating HyperClaw...\n'));
    const updateArgs = isWindows
      ? ['install', '-g', 'hyperclaw@latest']
      : ['npm', 'install', '-g', 'hyperclaw@latest'];
    const updateBin = isWindows ? 'npm' : 'sudo';

    await new Promise<void>((resolve) => {
      const proc = spawn(updateBin, updateArgs, { stdio: 'inherit', shell: true });
      proc.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`\n  ✅ Updated to ${result.latest}! Restarting chat...\n`));
          // Re-exec with the new binary — original args preserved
          const newProc = spawn(process.argv[0]!, process.argv.slice(1), {
            stdio: 'inherit',
            shell: false,
            detached: false,
          });
          newProc.on('close', (c) => process.exit(c ?? 0));
          newProc.on('error', () => {
            console.log(chalk.yellow('  ⚠️  Could not auto-restart. Run: hyperclaw chat\n'));
            process.exit(0);
          });
          // Don't resolve — let new process take over
        } else {
          console.log(chalk.red(`\n  ❌ Update failed (exit ${code}). Continuing with current version...\n`));
          if (!isWindows) {
            console.log(chalk.gray('  💡 If you use nvm/fnm, try without sudo: npm install -g hyperclaw@latest\n'));
          }
          resolve();
        }
      });
      proc.on('error', () => resolve());
    });
  } catch {
    // silently skip — never block chat startup on update check failure
  }
}

function makeSessionId(): string {
  const { randomBytes } = require('crypto');
  return randomBytes(5).toString('hex');
}

export async function runChat(opts: {
  sessionId?: string;
  model?: string;
  thinking?: 'high' | 'medium' | 'low' | 'none';
  workspace?: string;
  daemonMode?: boolean;
}): Promise<void> {
  // Load config
  const cfg = await fs.readJson(getConfigPath()).catch(() => null);
  if (!cfg) {
    console.log(chalk.red('\n  No configuration found.\n'));
    console.log(chalk.gray('  Chat works without the gateway. Run: hyperclaw onboard\n'));
    return;
  }

  const { getProviderCredentialAsync } = await import('../infra/env-resolve');
  const apiKey = await getProviderCredentialAsync(cfg).catch(() => null);
  const isLocal = ['local', 'ollama', 'lmstudio'].includes(cfg?.provider?.providerId ?? '');
  if (!apiKey && !isLocal) {
    console.log(chalk.red('\n  No API key configured.\n'));
    console.log(chalk.gray('  Chat uses your AI provider directly (no gateway needed). Run: hyperclaw config set-key\n'));
    return;
  }

  const { getProvider } = await import('./providers');
  const providerMeta = getProvider(cfg?.provider?.providerId ?? '');
  const CUSTOM_IDS = new Set(['groq','mistral','deepseek','perplexity','huggingface','ollama','lmstudio','local','xai','openai','google','minimax','moonshot','qwen','zai','litellm','cloudflare','copilot','vercel-ai','opencode-zen']);
  const isAnthropicVariant = ['anthropic','anthropic-oauth','anthropic-setup-token'].includes(cfg?.provider?.providerId ?? '');
  const provider: 'anthropic' | 'openrouter' | 'custom' = isAnthropicVariant ? 'anthropic'
    : (cfg?.provider?.providerId === 'custom' || isLocal || CUSTOM_IDS.has(cfg?.provider?.providerId ?? '')) ? 'custom' : 'openrouter';

  let rawModel = opts.model || cfg?.provider?.modelId || 'claude-sonnet-4-5';
  const model = rawModel.startsWith('ollama/') ? rawModel.slice(7) : rawModel;
  const resolvedBaseUrl = cfg?.provider?.baseUrl || providerMeta?.baseUrl || (isLocal ? 'http://localhost:11434/v1' : undefined);

  const THINKING_BUDGET: Record<string, number> = { high: 10000, medium: 4000, low: 1000, none: 0 };
  const thinkingBudget = THINKING_BUDGET[opts.thinking ?? 'none'] ?? 0;
  const maxTokens = thinkingBudget > 0 ? thinkingBudget + 4096 : 4096;

  // Build context + tools (once, reused for entire session)
  const baseContext = (await loadWorkspaceContext(opts.workspace)) + (await loadSkillsContext());

  const tools = await resolveTools({
    config: cfg,
    source: 'cli',
    elevated: true,
    daemonMode: false,
  });

  // Session-level prompt customization
  let sessionExtraPrompt = '';
  const sessionActiveSkills = new Map<string, string>(); // id → context snippet

  function buildSystemPrompt(): string {
    let sys = baseContext;
    if (sessionExtraPrompt) sys += `\n\n## Session Instructions\n${sessionExtraPrompt}`;
    if (sessionActiveSkills.size > 0) {
      sys += `\n\n## Session Skills\n`;
      for (const [id, ctx] of sessionActiveSkills) {
        sys += `### ${id}\n${ctx}\n\n`;
      }
    }
    return sys || '';
  }

  const engineOpts: any = {
    model,
    apiKey,
    provider,
    system: buildSystemPrompt() || undefined,
    tools,
    maxTokens,
    onToken: () => {},
    ...(provider === 'custom' ? { baseUrl: resolvedBaseUrl || '' } : {}),
    ...(thinkingBudget > 0 && model.includes('claude')
      ? { thinking: { budget_tokens: thinkingBudget } } : {}),
  };

  const sessionId = opts.sessionId ?? makeSessionId();
  const messages: InferenceMessage[] = [];

  // Create once per session so the turn counter accumulates correctly
  let autoMem: any = null;
  try {
    const { AutoMemory } = await import('../../packages/core/src/agent/memory-auto');
    autoMem = new AutoMemory({ extractEveryNTurns: 3 });
  } catch {}

  printHeader(rawModel, sessionId);

  // Interactive update check — prompt user before entering chat
  await interactiveChatUpdateCheck();

  // Flush stdout after inquirer to prevent duplicate prompts (inquirer leaves terminal dirty)
  process.stdout.write('\x1B[0m');

  // Set up readline — ensure stdin stays in flowing mode (fixes early close on Windows/some terminals)
  if (process.stdin.isTTY) process.stdin.resume();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Graceful exit on Ctrl+C
  rl.on('SIGINT', () => {
    console.log(chalk.gray('\n\n  Bye!\n'));
    rl.close();
    process.exit(0);
  });

  const daemonMode = opts.daemonMode ?? false;
  const t = (await import('../infra/theme')).getTheme(daemonMode);

  await new Promise<void>((resolve) => {
  rl.on('close', resolve);

  const BOX_W = 60;
  const INNER_W = BOX_W - 6; // width between "  │ " and " │"
  const TOP = t.a('  ╭' + '─'.repeat(BOX_W) + '╮');
  const BOT = t.a('  ╰' + '─'.repeat(BOX_W) + '╯');
  const PLACEHOLDER_TEXT = 'Say something to HyperClaw, press Enter';
  const PAD = Math.max(0, INNER_W - 2 - PLACEHOLDER_TEXT.length); // "❯ " = 2
  const MIDDLE_LINE = t.a('  │ ') + t.bold('❯ ') + t.muted(PLACEHOLDER_TEXT) + ' '.repeat(PAD) + t.a(' │');
  const INPUT_PROMPT = t.a('  │ ') + t.bold('❯ ');

  const prompt = () => {
    process.stdout.write('\n' + TOP + '\n');
    process.stdout.write(MIDDLE_LINE + '\n');
    process.stdout.write(BOT + '\n');
    process.stdout.write('\x1b[1A\x1b[1A'); // cursor up 2 lines (to middle line)
    process.stdout.write('\x1b[6C');        // cursor forward 6 (after "  │ ❯ ")
    let placeholderCleared = false;
    const rlInput = (rl as any).input as NodeJS.ReadableStream | undefined;
    const clearPlaceholder = (chunk?: Buffer | string) => {
      if (placeholderCleared) return;
      placeholderCleared = true;
      process.stdout.write('\x1b[K'); // clear from cursor to end of line
      if (rlInput) rlInput.removeListener('data', onData);
      if (chunk !== undefined && rlInput && typeof (rlInput as any).unshift === 'function') (rlInput as any).unshift(chunk);
    };
    const onData = (chunk: Buffer | string) => {
      clearPlaceholder(chunk);
    };
    if (rlInput) rlInput.once('data', onData);
    rl.question('', (input) => {
      if (rlInput) rlInput.removeListener('data', onData);
      process.stdout.write('\n');
      // stdin EOF (null) — keep prompting instead of exiting
      if (input === null || input === undefined) { prompt(); return; }
      void (async () => {
      const text = input.trim();

      if (!text) { prompt(); return; }

      // Built-in commands
      if (['/exit', '/quit', '/bye', 'exit', 'quit', 'bye'].includes(text.toLowerCase())) {
        console.log(chalk.gray('\n  Bye!\n'));
        rl.close();
        process.exit(0);
      }
      if (text === '/help') { printHelp(); prompt(); return; }
      if (text === '/skills') { await printSkills(); prompt(); return; }
      if (text === '/model' || text.startsWith('/model ')) {
        const newModelArg = text.slice(7).trim().replace(/^<|>$/g, '');
        if (newModelArg) {
          rawModel = newModelArg;
          engineOpts.model = rawModel.startsWith('ollama/') ? rawModel.slice(7) : rawModel;
          console.log(chalk.green(`\n  🤖 Model switched to: ${chalk.bold(rawModel)}\n`));
        } else if (providerMeta?.models?.length) {
          // Arrow-key selection via inquirer
          rl.pause();
          try {
            const inquirer = (await import('inquirer')).default;
            const defaultIdx = Math.max(0, providerMeta.models.findIndex((m: any) => m.id === rawModel));
            const { selected } = await inquirer.prompt([{
              type: 'list',
              name: 'selected',
              message: chalk.cyan('Select model') + chalk.gray(' (↑↓ arrows, Enter to confirm):'),
              choices: providerMeta.models.map((m: any) => ({
                name: `${m.id}  ${chalk.gray(m.name)}`,
                value: m.id,
                short: m.id,
              })),
              default: defaultIdx,
              prefix: '  ',
            }]);
            rawModel = selected;
            engineOpts.model = rawModel.startsWith('ollama/') ? rawModel.slice(7) : rawModel;
            console.log(chalk.green(`\n  🤖 Model switched to: ${chalk.bold(rawModel)}\n`));
          } catch {
            console.log(chalk.gray('\n  Selection failed. Use: /model <model-id>  (e.g. claude-sonnet-4-5)\n'));
          } finally {
            rl.resume();
          }
        } else {
          console.log(chalk.gray(`\n  Current model: ${chalk.bold(rawModel)}`));
          console.log(chalk.gray('  Use: /model <model-id>\n'));
        }
        prompt(); return;
      }
      if (text === '/clear') {
        messages.length = 0;
        console.log(chalk.gray('\n  🗑️  Conversation cleared.\n'));
        prompt(); return;
      }

      // ── /prompt ─────────────────────────────────────────────────────────────
      if (text === '/prompt' || text.startsWith('/prompt ')) {
        const arg = text.slice(7).trim();
        if (!arg) {
          console.log();
          if (sessionExtraPrompt) {
            console.log(chalk.bold('  📝 Session prompt:'));
            console.log(chalk.white(`  ${sessionExtraPrompt.slice(0, 400)}${sessionExtraPrompt.length > 400 ? '…' : ''}`));
          } else {
            console.log(chalk.gray('  📝 No extra prompt set. Use: /prompt <text>'));
          }
          console.log();
        } else if (arg === 'clear') {
          sessionExtraPrompt = '';
          engineOpts.system = buildSystemPrompt() || undefined;
          console.log(chalk.green('\n  🧹 Extra prompt cleared.\n'));
        } else {
          sessionExtraPrompt = arg;
          engineOpts.system = buildSystemPrompt() || undefined;
          console.log(chalk.green(`\n  ✅ Session prompt set: ${chalk.white(arg.slice(0, 60))}${arg.length > 60 ? '…' : ''}\n`));
        }
        prompt(); return;
      }

      // ── /skill ───────────────────────────────────────────────────────────────
      if (text === '/skill' || text.startsWith('/skill ')) {
        const arg = text.slice(6).trim();
        const [subCmd, ...rest] = arg.split(/\s+/);
        const skillId = rest.join(' ').trim();

        if (!subCmd || subCmd === 'list') {
          await printSkills(); prompt(); return;
        }

        if (subCmd === 'add') {
          if (!skillId) {
            console.log(chalk.gray('\n  Usage: /skill add <skill-id>\n'));
            prompt(); return;
          }
          try {
            const { loadSkills } = await import('../../packages/core/src/agent/skill-loader');
            const allSkills = await loadSkills();
            const found = allSkills.find(s => s.id === skillId || (s.title ?? '').toLowerCase() === skillId.toLowerCase());
            if (!found) {
              console.log(chalk.yellow(`\n  ⚠️  Skill "${skillId}" not found. Use /skills to list installed.\n`));
            } else {
              const ctx = [
                found.title ? `**${found.title}**` : found.id,
                found.capabilities ? found.capabilities : '',
                (found as any).description ? (found as any).description : '',
              ].filter(Boolean).join('\n');
              sessionActiveSkills.set(found.id, ctx);
              engineOpts.system = buildSystemPrompt() || undefined;
              console.log(chalk.green(`\n  ✅ Skill activated: ${chalk.bold(found.title || found.id)}\n`));
            }
          } catch (e: any) {
            console.log(chalk.red(`\n  ❌ Error loading skills: ${e?.message || String(e)}\n`));
          }
          prompt(); return;
        }

        if (subCmd === 'remove') {
          if (!skillId) {
            console.log(chalk.gray('\n  Usage: /skill remove <skill-id>\n'));
            prompt(); return;
          }
          if (sessionActiveSkills.has(skillId)) {
            sessionActiveSkills.delete(skillId);
            engineOpts.system = buildSystemPrompt() || undefined;
            console.log(chalk.green(`\n  ✅ Skill deactivated: ${skillId}\n`));
          } else {
            console.log(chalk.gray(`\n  ℹ️  Skill "${skillId}" is not active in this session.\n`));
          }
          prompt(); return;
        }

        console.log(chalk.gray('\n  ℹ️  Usage: /skill list | /skill add <id> | /skill remove <id>\n'));
        prompt(); return;
      }

      // Add user message to transcript
      messages.push({ role: 'user', content: text });

      // Echo user message with styling
      console.log(chalk.gray('  ' + '─'.repeat(56)));
      console.log(chalk.bold.green('  💬 You › ') + chalk.white(text));
      console.log(chalk.gray('  ' + '─'.repeat(56)));

      // Working indicator with elapsed time
      let responseText = '';
      let elapsed = 0;
      let ticker: ReturnType<typeof setInterval> | undefined;
      const spinner = ora({ text: chalk.cyan(`  🤔 Thinking... (${elapsed}s • Ctrl+C to cancel)`), prefixText: '' }).start();
      ticker = setInterval(() => {
        elapsed++;
        spinner.text = chalk.cyan(`  🤔 Thinking... (${elapsed}s • Ctrl+C to cancel)`);
      }, 1000);

      try {
        const engine = new InferenceEngine({
          ...engineOpts,
          onToken: () => {
            // Buffer silently — we render the complete response as markdown after run()
            if (spinner.isSpinning) spinner.text = chalk.cyan(`  📥 Receiving... (${elapsed}s • Ctrl+C to cancel)`);
          },
          onToolCall: (name: string) => {
            spinner.stop();
            console.log(chalk.yellow(`\n  🔧 ${chalk.bold(name)}`));
            spinner.start(chalk.cyan(`  ⚙️  Working (${elapsed}s • Ctrl+C to cancel)`));
          },
        });

        const result = await engine.run(messages);
        responseText = result.text || '';
        if (ticker) clearInterval(ticker);
        spinner.stop();

        console.log(chalk.bold.blue('\n  🦅 Agent ›'));
        if (responseText) {
          process.stdout.write(renderMarkdown(responseText));
        } else {
          process.stdout.write(chalk.gray('  (empty — try rephrasing or check model/tools)'));
        }
        console.log('\n');
        console.log(chalk.gray('  ' + '─'.repeat(56)));

        if (result.usage) {
          console.log(chalk.gray(`  📊 Tokens in: ${result.usage.input}  out: ${result.usage.output}  ·  ${rawModel}\n`));
        } else {
          console.log();
        }
      } catch (e: any) {
        if (ticker) clearInterval(ticker);
        spinner.stop();
        const msg = e?.message || String(e);
        responseText = `Error: ${msg}`;
        console.log(chalk.red(`\n  Error: ${msg}\n`));
        const hint = (() => {
          if (/401|unauthorized|invalid.*key|authentication/i.test(msg)) return '🔑 Check API key: hyperclaw config set-key';
          if (/429|rate.?limit|quota/i.test(msg)) return '⏱️  Rate limited. Wait a moment and retry.';
          if (/500|503|service.?unavailable/i.test(msg)) return '🔌 Provider temporarily down. Try again later.';
          if (/network|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) return '🌐 Network error. Check connection and base URL.';
          if (/model|not found|invalid model/i.test(msg)) return '🤖 Try: /model <id> to switch model.';
          return '🩺 Run: hyperclaw doctor  for setup checks.';
        })();
        console.log(chalk.gray(`  ${hint}\n`));
      }

      // Add assistant response to transcript for next turn
      if (responseText) {
        messages.push({ role: 'assistant', content: responseText });
      }

      // Auto memory extraction in background (uses session-level instance)
      if (autoMem) {
        autoMem.addTurn('user', text);
        if (responseText) autoMem.addTurn('assistant', responseText);
        autoMem.extract().catch(() => {});
      }

      prompt();
      })().catch((err) => {
        console.error(chalk.red('\n  Unexpected error:'), err?.message || err);
        prompt();
      });
    });
  };

  prompt();
  }); // end new Promise
}
