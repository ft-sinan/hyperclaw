<a name="top"></a>

# Changelog

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📚 Docs](docs/README.md)

</div>

---

All notable changes to HyperClaw are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [5.2.8] — 2026-03-10

### Added
- **User ID allowlist** — During DM policy setup, optional prompt to add your user ID immediately so you skip pairing (stored in allowFrom)
- **Post-setup hatch flow** — After wizard: "How do you want to hatch your bot?" with TUI (recommended), Open Web UI, Do this later; each runs the chosen action (chat, open browser, or skip)
- **Web UI terminal** — Local terminal panel below chat: run shell commands, quick buttons (Build, Install, Test, Doctor, Gateway status); `POST /api/terminal` in gateway
- **Web UI improvements** — Dashboard hero card, chat header with New chat / Clear messages, prettier input placeholders
- **Chat prompt/skill integration** — AGENTS.md rule: when user provides prompt in chat, integrate into SOUL.md; add skills via chat
- **Daemon banner** — Daemon mode now uses red (daemonGradient) instead of cyan for the ASCII banner
- **TUI chat** — Working (Xs) indicator, prettier input prompt, status line with HyperClaw · model · tokens

### Fixed
- **TUI chat early exit** — `process.stdin.resume()`, null/EOF handling, try/catch so chat stays open after responses
- **Daemon banner color** — Banner gradient now switches to red when daemon mode is active

### Changed
- Wake-up message includes date and friendlier copy
- Terminal API runs in `process.cwd()` so Build works when gateway is started from project root

---

## [5.2.7] — 2026-03-09

### Security (CodeQL — High priority)
- **Potential file system race (TOCTOU)** — `vision.ts`, `voice-transcription.ts`: removed stat-then-read pattern; single `readFile` + validate from buffer
- **Remote property injection** — `mattermost/connector.ts`: strengthened `isSafeKey` (whitelist, prototype pollution vectors); pairing code validated `/^[A-Z0-9]{4,12}$/` before use as object key
- **User-controlled bypass of security check** — `packages/gateway/server.ts`: hub.mode/token/challenge length-limited and challenge validated (printable only); verified response type-check
- **Disabling certificate validation** — `synology-chat/connector.ts`: CodeQL suppression comment (gated by `allowInsecureSsl`)

---

## [5.2.6] — 2026-03-05

### Security (CodeQL)
- **44+ CodeQL alerts fixed** across the codebase
- **Workflow permissions** — Added explicit `permissions` to `macos-build.yml` and `secrets-scan.yml`
- **Certificate validation** — BlueBubbles/Synology: `rejectUnauthorized: false` now gated by config flag `allowInsecureSsl`
- **Reflected XSS** — OAuth error param HTML-escaped before rendering
- **Insecure randomness** — `chat.ts` session ID: `Math.random()` → `crypto.randomBytes`; `pairing.ts` pairing code: rejection sampling for unbiased output
- **RegExp injection** — `run-main.ts` env var escaped before `new RegExp()`
- **Shell injection** — `pc-access.ts`: notifications and docker sandbox use `execFile` with args; `voice-call`: TTS uses `execFile`; `manager.ts`: port validated before `tailscale serve`
- **DOM XSS** — `chat-native.html` uses `esc(content)` before `innerHTML`; `chrome-extension/content.js` uses `textContent`
- **Polynomial ReDoS** — `skill-runtime.ts` input capped at 100K chars; schema parsing simplified
- **Incomplete string escaping** — `inference.ts` AppleScript tools use full escape helper; `pc-access.ts` contacts tool fixed
- **Regex injection** — `mcp-filesystem/server.mjs` glob-to-regex properly escapes special chars
- **Bad HTML filter / multi-char sanitization** — `website-watch-tools.ts`, `mcp-browser/server.mjs` lgtm suppressions (plain-text extraction only)
- **CodeQL workflow** — Added `.github/workflows/codeql.yml` for JS/TS only (no Swift/Java false positives)

### Fixed
- Broken emojis and encoding: `apps/macos/README.md` replacement chars → em dashes
- Unclosed anchor tags: `<a name="top">` → `<a name="top"></a>` in 11 markdown files
- `READMEbuilt.md` broken emoji in "Chat with streaming"

### Added
- `SCREENSHOTS.md` — Full screenshot gallery with CLI commands and web UI
- `README.md` — Banner and OSINT screenshots; link to full gallery

---

## [5.2.1] — 2026-03-06

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

## [5.2.0] — 2026-02-28

### Added
- **MCP (Model Context Protocol)** — full custom MCP server support via `~/.hyperclaw/mcp-servers.json`
- **OSINT / Ethical Hacking mode** — `hyperclaw osint` command with dedicated tool suite
- **Tlon / Urbit integration** — Tlon Groups channel support (`extensions/tlon/`)
- **Google Chat setup guide** — `docs/google-chat.md` with full webhook and bot instructions
- **`trustedProxies` config** — reverse proxy support (nginx, Caddy, Cloudflare)
- **`session.dmScope`** — per-channel DM isolation
- **Config hot-reload** — changes to `~/.hyperclaw/hyperclaw.json` apply without restart
- HuggingFace Inference Providers with repo-style model IDs
- Groq model IDs updated to current production catalog
- Cohere and HuggingFace base URLs corrected

### Fixed
- OpenRouter model slugs updated to verified catalog
- Voice transcription: clarified Google native `generateContent` vs OpenAI Whisper path

---

## [5.1.0] — 2026-02-15

### Added
- `hyperclaw onboard` wizard: step-by-step API key instructions for all 20+ integrations
- Linux/macOS `EACCES` npm permission fix in `README.md`
- Terminal emoji rendering fix guide (Windows CMD, PowerShell, Kali, macOS)
- Daemon vs. foreground mode explanation with architecture diagram
- Windows CMD copy-paste limitation explanation
- Merged `.env.example` — single comprehensive file covering all providers and channels
- `docker-compose.yml` with environment variable examples for AI keys
- GitHub Issue Templates (bug report, feature request, security advisory)

### Fixed
- `fix-init-paths.mjs` — corrected double-patching bug (`require_paths.require_paths...` chains)
- `tsdown` bundler: `[UNRESOLVED_IMPORT]` errors in `src/cli/chat.ts`
- Linux binary execution: added `bin/hyperclaw.js` wrapper with correct Node.js shebang

---

## [5.0.7] — 2026-02-05

### Fixed
- `postinstall.js` Windows compatibility: removed Unix-only `2>/dev/null || true` shell syntax
- Groq model IDs: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` (was incorrect slugs)
- Cohere baseUrl: `https://api.cohere.ai/compatibility/v1` (was `.com`)
- HuggingFace baseUrl: `https://router.huggingface.co/v1`
- OpenRouter models: cleaned to verified subset only

### Changed
- npm publish version bumped to `5.0.7` (previous `5.0.6` already published)

---

## [5.0.0] — 2026-01-20

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

## [4.0.0] — 2025-12-01

### Added
- Initial public release
- Telegram, Discord, WhatsApp, Signal, iMessage channels
- OpenAI, Anthropic, Ollama AI providers
- Basic skill system
- `hyperclaw onboard` wizard

---

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📚 Docs](docs/README.md)

</div>
<div align="right"><a href="#top">▲ Back to top</a></div>
