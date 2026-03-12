<a name="top"></a>

# Changelog

<div align="center">

[π  Main README](README.md) &nbsp;β€Ά&nbsp; [π“ Docs](docs/README.md)

</div>

---

All notable changes to HyperClaw are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [5.3.45] — 2026-03-13

### Fixed
- **`hyperclaw web` exiting on its own** — The CLI returned to the global `process.exit(0)` path right after starting the Web UI. The `web` command now stays alive until the user closes it and shuts down cleanly on `Ctrl+C`.
- **Static Web UI returning 404 after launch** — The built CLI loaded `fs-extra` via dynamic import and then read files from the wrong object shape in the bundled runtime. The packaged `static/web/` server now serves `index.html` and assets correctly.
- **Web build regressions** — Fixed the CSS `@import` order that broke the React production build and switched the web package config loading to ESM so the Vite CJS deprecation warning is gone.

### Changed
- **Release sync** — Updated the displayed release/version strings to `5.3.45` across package metadata, CLI/UI banners, gateway responses, MCP client info, manifests, install scripts, and command docs.

---

## [5.3.4] β€” 2026-03-13

### Fixed
- **Chat input box rendering** β€” The `β―` prompt and box shape were not rendering correctly on Windows. Replaced the fragile pre-draw-then-reposition approach (ANSI cursor-up sequences `\x1b[1A` that readline would overwrite) with `rl.question(INPUT_PROMPT, ...)` so readline draws the prompt natively. The bottom border now prints after the user presses Enter. Works correctly in PowerShell, CMD, and Windows Terminal.
- **Version always showing 0.0.0 in update check** β€” `getCurrentVersion()` was reading `path.resolve(__dirname, '../../package.json')` which, from the compiled `dist/` directory in a global npm install, resolves two levels above the package root (to `node_modules/package.json`, which does not exist). Added `path.resolve(__dirname, '../package.json')` as the primary candidate so the correct `package.json` at the package root is found. The update notification now only appears when a genuinely newer version is available on npm.
- **`hyperclaw web` fails from any directory** β€” Pre-built React UI now ships inside `static/web/` (part of npm `files`). The `web` command first checks for `static/web/index.html` and serves it with a Node built-in HTTP server (API proxy + WebSocket proxy to gateway on port 18789). Falls back to Vite dev server only when the pre-built files are absent (development workflow). `prepublishOnly` now includes `web:build` so the built UI is always fresh on every publish.

---

## [5.3.3] β€” 2026-03-12

### Added
- **HYPERCLAW banner** β€” Decorative pixel-style banner displayed at the very top of the chat scroll area in both React Web UI and static HTML UI. The banner adapts its color to the active theme and mode (cyan in normal mode, red in daemon mode) using CSS accent variables.
- **Voice input** β€” Microphone button in React Web UI chat header. Uses the browser Web Speech API to transcribe speech directly into the chat input field.
- **Voice output** β€” Toggle button in React Web UI chat header. When active, the assistant's response is read aloud via the browser's speech synthesis API after each reply.
- **Dark / light theme toggle** β€” Moon/sun button in the sidebar. The selected theme is persisted in `localStorage` and restored on next load.
- **Claude.ai-style sidebar** β€” Both React Web UI and static HTML UI now have a sidebar with: New chat, Search (filters chat history), Customize (create custom project agents), Projects section (General, Ethical Hacker, HyperClaw Dev, OSINT presets and user-created custom projects stored in `localStorage`), and Chat history (auto-saved on first message, stored in `localStorage`).
- **Redesigned terminal panel** β€” Codex-style terminal in the React Web UI: traffic-light dots, quick-action buttons, monospace output with color-coded lines (cyan for commands, red for errors), auto-focus on open.
- **CSS variable theme system** β€” Complete CSS custom property system in `index.css` (React) and `chat.html` (static) supporting four states: dark normal (cyan), light normal (cyan), dark daemon (red), light daemon (red). All colors driven by `--accent`, `--bg`, `--text`, etc. with overrides per `data-theme` and `data-daemon` attributes on `<html>`.

### Fixed
- **Daemon mode color detection** β€” `isDaemon` in the React `AppShell` was evaluated as `!!gwStatus?.running`, which is always `true` when the gateway responds (server hardcodes `running: true`). Fixed by: (1) adding `daemonMode: this.config.daemonMode ?? false` to the `/api/status` JSON response in `packages/gateway/src/server.ts`, (2) adding `daemonMode?: boolean` to the `GatewayStatus` TypeScript interface, (3) changing `isDaemon = !!gwStatus?.daemonMode`. The same fix is applied in `static/chat.html` β€” the `/api/status` fetch now reads `d.daemonMode` and sets `data-daemon` on `<html>`.
- **`hyperclaw web` path resolution** β€” Command failed with "React Web UI not found" when run from outside the repo root (e.g. `C:\Windows\system32`). Replaced single-path check with a `findWebDir()` function that tries four strategies: `HYPERCLAW_ROOT` env var, `process.cwd()/apps/web`, walking up to 6 parent directories from `cwd`, and `__dirname`-relative paths. Error message updated to suggest setting `HYPERCLAW_ROOT`.

### Changed
- Color scheme for daemon mode changed from orange to red across all UIs (React, static HTML, terminal output).
- Professional gradient backgrounds added to the messages area and sidebar using `radial-gradient` with the active accent color.

---

## [5.3.2] β€” 2026-03-11

### Added
- π **`hyperclaw web`** β€” Launch React Web UI with auto `npm install` + `npm run dev` (no manual setup)
- β΅ **Quick actions** β€” `hyperclaw` (no args) now shows `hyperclaw web` and `hyperclaw chat` prominently
- π“‹ **`--help`** β€” Full command list including `web` and all subcommands; references READMECOMMAND.md
- π― **Prompt selector** β€” Static + React chat: General, Ethical Hacker, HyperClaw Dev, OSINT presets
- π’¬ **New chat / Clear messages** β€” Buttons in both static and React Web UI
- π–ΌοΈ **Web UI icon** β€” Favicon and header logo use `icon.png`

---

## [5.3.1] β€” 2026-03-13

### Fixed
- π”Ά **Version display** β€” `getCurrentVersion()` in update-check tries multiple paths so "(you have X.Y.Z)" shows the real installed version instead of 0.0.0
- π“¦ **Chat input box** β€” Complete box (top/middle/bottom), placeholder on middle line, clears on first keypress

---

## [5.3.0] β€” 2026-03-12

### Added
- π“¦ **Chat input box** β€” Styled box with borders and placeholder "Say something to HyperClaw, press Enter"
- π¨ **Chat theme by daemon** β€” Input box borders and β― prompt: cyan in normal mode, red when daemon/gateway is running; `hyperclaw chat --daemon` to force red theme

---

## [5.2.9] β€” 2026-03-11

### Fixed
- **Chat version display** β€” Update check now reads correct installed version (no longer shows 0.0.0); prompt only appears when a newer version exists on npm

---

## [5.2.8] β€” 2026-03-10

### Added
- **User ID allowlist** β€” During DM policy setup, optional prompt to add your user ID immediately so you skip pairing (stored in allowFrom)
- **Post-setup hatch flow** β€” After wizard: "How do you want to hatch your bot?" with TUI (recommended), Open Web UI, Do this later; each runs the chosen action (chat, open browser, or skip)
- **Web UI terminal** β€” Local terminal panel below chat: run shell commands, quick buttons (Build, Install, Test, Doctor, Gateway status); `POST /api/terminal` in gateway
- **Web UI improvements** β€” Dashboard hero card, chat header with New chat / Clear messages, prettier input placeholders
- **Chat prompt/skill integration** β€” AGENTS.md rule: when user provides prompt in chat, integrate into SOUL.md; add skills via chat
- **Daemon banner** β€” Daemon mode now uses red (daemonGradient) instead of cyan for the ASCII banner
- **TUI chat** β€” Working (Xs) indicator, prettier input prompt, status line with HyperClaw Β· model Β· tokens

### Fixed
- **TUI chat early exit** β€” `process.stdin.resume()`, null/EOF handling, try/catch so chat stays open after responses
- **Daemon banner color** β€” Banner gradient now switches to red when daemon mode is active

### Changed
- Wake-up message includes date and friendlier copy
- Terminal API runs in `process.cwd()` so Build works when gateway is started from project root

---

## [5.2.7] β€” 2026-03-09

### Security (CodeQL β€” High priority)
- **Potential file system race (TOCTOU)** β€” `vision.ts`, `voice-transcription.ts`: removed stat-then-read pattern; single `readFile` + validate from buffer
- **Remote property injection** β€” `mattermost/connector.ts`: strengthened `isSafeKey` (whitelist, prototype pollution vectors); pairing code validated `/^[A-Z0-9]{4,12}$/` before use as object key
- **User-controlled bypass of security check** β€” `packages/gateway/server.ts`: hub.mode/token/challenge length-limited and challenge validated (printable only); verified response type-check
- **Disabling certificate validation** β€” `synology-chat/connector.ts`: CodeQL suppression comment (gated by `allowInsecureSsl`)

---

## [5.2.6] β€” 2026-03-05

### Security (CodeQL)
- **44+ CodeQL alerts fixed** across the codebase
- **Workflow permissions** β€” Added explicit `permissions` to `macos-build.yml` and `secrets-scan.yml`
- **Certificate validation** β€” BlueBubbles/Synology: `rejectUnauthorized: false` now gated by config flag `allowInsecureSsl`
- **Reflected XSS** β€” OAuth error param HTML-escaped before rendering
- **Insecure randomness** β€” `chat.ts` session ID: `Math.random()` β†’ `crypto.randomBytes`; `pairing.ts` pairing code: rejection sampling for unbiased output
- **RegExp injection** β€” `run-main.ts` env var escaped before `new RegExp()`
- **Shell injection** β€” `pc-access.ts`: notifications and docker sandbox use `execFile` with args; `voice-call`: TTS uses `execFile`; `manager.ts`: port validated before `tailscale serve`
- **DOM XSS** β€” `chat-native.html` uses `esc(content)` before `innerHTML`; `chrome-extension/content.js` uses `textContent`
- **Polynomial ReDoS** β€” `skill-runtime.ts` input capped at 100K chars; schema parsing simplified
- **Incomplete string escaping** β€” `inference.ts` AppleScript tools use full escape helper; `pc-access.ts` contacts tool fixed
- **Regex injection** β€” `mcp-filesystem/server.mjs` glob-to-regex properly escapes special chars
- **Bad HTML filter / multi-char sanitization** β€” `website-watch-tools.ts`, `mcp-browser/server.mjs` lgtm suppressions (plain-text extraction only)
- **CodeQL workflow** β€” Added `.github/workflows/codeql.yml` for JS/TS only (no Swift/Java false positives)

### Fixed
- Broken emojis and encoding: `apps/macos/README.md` replacement chars β†’ em dashes
- Unclosed anchor tags: `<a name="top">` β†’ `<a name="top"></a>` in 11 markdown files
- `READMEbuilt.md` broken emoji in "Chat with streaming"

### Added
- `SCREENSHOTS.md` β€” Full screenshot gallery with CLI commands and web UI
- `README.md` β€” Banner and OSINT screenshots; link to full gallery

---

## [5.2.1] β€” 2026-03-06

### Fixed
- `postinstall.js` UTF-8 BOM causing `SyntaxError: Invalid or unexpected token` on Windows
- `../README.md` broken nav link in `SECURITY.md` (now correctly `README.md`)
- Unclosed `<a name="top">` anchor tags in root-level markdown files
- `package-lock.json` regenerated to resolve `isbinaryfile@5.1.0` and `y18n@^5.1.0` CI failures
- macOS CI workflow updated to use `npm ci --ignore-scripts --legacy-peer-deps`

### Added
- Navigation links (Prev / Next / Index / Back to top) in all 54 `.md` documentation files
- Table of Contents with anchor links in `README.md`
- Dashboard screenshot in `README.md`
- Contributors widget + Star History chart in Community section
- `CHANGELOG.md` and `ROADMAP.md`

---

## [5.2.0] β€” 2026-02-28

### Added
- **MCP (Model Context Protocol)** β€” full custom MCP server support via `~/.hyperclaw/mcp-servers.json`
- **OSINT / Ethical Hacking mode** β€” `hyperclaw osint` command with dedicated tool suite
- **Tlon / Urbit integration** β€” Tlon Groups channel support (`extensions/tlon/`)
- **Google Chat setup guide** β€” `docs/google-chat.md` with full webhook and bot instructions
- **`trustedProxies` config** β€” reverse proxy support (nginx, Caddy, Cloudflare)
- **`session.dmScope`** β€” per-channel DM isolation
- **Config hot-reload** β€” changes to `~/.hyperclaw/hyperclaw.json` apply without restart
- HuggingFace Inference Providers with repo-style model IDs
- Groq model IDs updated to current production catalog
- Cohere and HuggingFace base URLs corrected

### Fixed
- OpenRouter model slugs updated to verified catalog
- Voice transcription: clarified Google native `generateContent` vs OpenAI Whisper path

---

## [5.1.0] β€” 2026-02-15

### Added
- `hyperclaw onboard` wizard: step-by-step API key instructions for all 20+ integrations
- Linux/macOS `EACCES` npm permission fix in `README.md`
- Terminal emoji rendering fix guide (Windows CMD, PowerShell, Kali, macOS)
- Daemon vs. foreground mode explanation with architecture diagram
- Windows CMD copy-paste limitation explanation
- Merged `.env.example` β€” single comprehensive file covering all providers and channels
- `docker-compose.yml` with environment variable examples for AI keys
- GitHub Issue Templates (bug report, feature request, security advisory)

### Fixed
- `fix-init-paths.mjs` β€” corrected double-patching bug (`require_paths.require_paths...` chains)
- `tsdown` bundler: `[UNRESOLVED_IMPORT]` errors in `src/cli/chat.ts`
- Linux binary execution: added `bin/hyperclaw.js` wrapper with correct Node.js shebang

---

## [5.0.7] β€” 2026-02-05

### Fixed
- `postinstall.js` Windows compatibility: removed Unix-only `2>/dev/null || true` shell syntax
- Groq model IDs: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` (was incorrect slugs)
- Cohere baseUrl: `https://api.cohere.ai/compatibility/v1` (was `.com`)
- HuggingFace baseUrl: `https://router.huggingface.co/v1`
- OpenRouter models: cleaned to verified subset only

### Changed
- npm publish version bumped to `5.0.7` (previous `5.0.6` already published)

---

## [5.0.0] β€” 2026-01-20

### Added
- Full monorepo structure (`apps/`, `packages/`, `extensions/`, `docs/`)
- `tsdown` (rolldown-based) bundler replacing previous build system
- 20+ AI providers: xAI Grok, MiniMax, Moonshot/Kimi, Qwen, Z.AI, LiteLLM, Cloudflare AI Gateway, GitHub Copilot, Groq, Mistral, DeepSeek, Perplexity, HuggingFace, Ollama, LM Studio
- 28+ messaging channels including Tlon, Nostr, Zalo, LINE, Feishu/Lark, Synology Chat
- `hyperclaw dashboard` TUI with live status, channel list, and log viewer
- Docker sandboxing for agent tool execution
- Security audit command (`hyperclaw security --fix`)
- DaemonManager: Windows Task Scheduler, macOS LaunchAgent, Linux systemd user service
- Voice transcription: Google Gemini native + OpenAI Whisper

### Changed
- Complete rewrite from v4 codebase
- Configuration moved to `~/.hyperclaw/hyperclaw.json`

---

## [4.0.0] β€” 2025-12-01

### Added
- Initial public release
- Telegram, Discord, WhatsApp, Signal, iMessage channels
- OpenAI, Anthropic, Ollama AI providers
- Basic skill system
- `hyperclaw onboard` wizard

---

<div align="center">

[π  Main README](README.md) &nbsp;β€Ά&nbsp; [π“ Docs](docs/README.md)

</div>
<div align="right"><a href="#top">β–² Back to top</a></div>
