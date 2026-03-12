<a name="top"></a>

# Roadmap

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📚 Docs](docs/README.md)

</div>

---

> This roadmap outlines what's been built and what's coming next.  
> Items marked 🔄 are actively in development. Items marked 📅 are planned but not yet started.  
> Want to contribute to a planned feature? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## ✅ Shipped (v5.x)

### Core
- [x] One-command install + interactive onboard wizard (`hyperclaw onboard`)
- [x] Config hot-reload — changes apply without daemon restart
- [x] `hyperclaw dashboard` — TUI with live status, channels, skills, logs
- [x] Daemon management (Windows Task Scheduler / macOS LaunchAgent / Linux systemd)
- [x] Security audit (`hyperclaw security --fix`) with auto-remediation
- [x] DM allowlist / pairing — no strangers by default

### Channels (28+)
- [x] Telegram, Discord, WhatsApp (Meta Cloud API + Baileys)
- [x] Signal, Matrix, Mattermost, Microsoft Teams
- [x] Slack, Twitch, Google Chat
- [x] Nostr, Tlon/Urbit, Zalo, LINE
- [x] Nextcloud Talk, Synology Chat, Feishu/Lark
- [x] iMessage (via BlueBubbles), SMS

### AI Providers (20+)
- [x] OpenAI, Anthropic, Google Gemini
- [x] xAI Grok, Mistral, DeepSeek, Perplexity
- [x] Groq, MiniMax, Moonshot/Kimi, Qwen, Z.AI
- [x] HuggingFace, Ollama, LM Studio (local models)
- [x] OpenRouter, LiteLLM, Cloudflare AI Gateway
- [x] GitHub Copilot, Custom OpenAI-compatible endpoints

### Tools & Integrations
- [x] Weather (Open-Meteo — free, no key)
- [x] Image generation (DALL-E 3, Stability AI)
- [x] Spotify, Home Assistant, GitHub, Trello, Obsidian
- [x] Gmail, Philips Hue, Sonos, 8Sleep, 1Password
- [x] Apple Notes / Reminders / Things 3 / Bear (macOS)
- [x] Browser control, Canvas/A2UI, iMessage
- [x] MCP (Model Context Protocol) — custom tool servers

### Security & Advanced
- [x] Docker sandboxing for agent tools
- [x] OSINT / Ethical hacking mode (`hyperclaw osint`)
- [x] Responsible disclosure program (SECURITY.md)
- [x] `trustedProxies` for nginx/Caddy/Cloudflare deployments
- [x] `session.dmScope` per-channel DM isolation
- [x] Voice transcription (Google Gemini + OpenAI Whisper)

### Apps
- [x] macOS companion app
- [x] macOS menu-bar app
- [x] iOS companion app
- [x] Android companion app

---

## 🔄 In Progress

- [x] **Web UI** — apps/web React dashboard (chat, terminal panel, theme)
- [x] **Dashboard v2** — `apps/web/DASHBOARD_V2.md` plan (card layout, i18n, responsive)
- [x] **Skill marketplace** — `hyperclaw hub` (search, install, list, marketplace) + community registry
- [x] **RAG** — `packages/rag` scaffold, chunkText for document indexing
- [x] **Multi-user mode** — config schema `multiUser.users`, scaffold

---

## 📅 Planned

### Short-term (next release)
- [x] **Voice-first mode** — `alwaysOn` config in voice-call extension, wake-word
- [x] **Scheduled skills** — cron task runner with skillId (`hyperclaw cron add -s <skillId>`, cron-tasks.json)
- [x] **Telegram inline mode** — `inlineMode: true`, @botname query, answerInlineQuery
- [x] **Encrypted config** — HYPERCLAW_CONFIG_KEY (32-byte hex), AES-256-GCM

### Medium-term
- [x] **memory-lancedb** — Vector DB memory (`packages/memory-lancedb`), `hyperclaw memory add-fact` + `search-vector`
- [x] **OpenTelemetry diagnostics** — `packages/diagnostics-otel`, tracer, startSpan, runInSpan
- [x] **phone-control extension** — `extensions/phone-control`, handlePhoneControl
- [x] **device-pair extension** — `extensions/device-pair`, getQRPayload, PairResult
- [x] **Kubernetes deployment** — `k8s/` deployment, Service, configmap, secrets
- [x] **Pi agent runtime** — `.pi/` lightweight HTTP server
- [x] **i18n** — `locales/ja.json`, `zh.json`, `en.json`, `src/i18n` loadLocale, t()
- [x] **backup create/verify** — CLI backup, verify, restore for local state
- [x] **Talk mode silenceTimeoutMs** — config for auto-send after silence (VAD)
- [x] **Discord autoArchiveDuration** — thread archiving config (1h/1d/3d/1w)
- [x] **TUI agent inference** — auto-detect agent from workspace in `hyperclaw chat`
- [x] **git hash in --version** — short commit hash in version output
- [x] **HyperClawKit** — NodeStatus, ChatSession, VoiceConfig types (packages/hyperclawkit)
- [x] **llm-task extension** — `extensions/llm-task`, decomposeTask, runTasks
- [x] **Brave LLM Context mode** — web search with grounding snippets
- [x] **ACP Provenance** — X-HyperClaw-Provenance-* headers + response.provenance
- [x] **iOS Home Canvas** — Home tab with welcome + agent overview + quick actions
- [x] **macOS model picker** — Settings: modelId + thinkingLevel, persisted, used in chat thinking level
- [x] **Ollama onboarding** — first-class Ollama wizard (cloud + local mode)
- [x] **OpenCode Go provider** — new AI provider for code
- [x] **Multimodal memory** — image + audio indexing with Gemini embeddings (`hyperclaw memory add-image`, `add-audio`)
- [x] **Gemini embedding** — gemini-embedding-2-preview for memory search (VectorMemoryService: embeddingProvider: 'gemini')
- [x] **ACP resumeSessionId** — resume existing ACP/Codex session (threads create --resume & create({ resumeSessionId }))
- [x] **Node pending work queue** — queue for dormant nodes (`hyperclaw node queue`, node-pending-queue.ts)
- [x] **LLM thinking override** — per-workflow thinking level (AgentListItem.thinking, API body.thinking)
- [x] **Multi-agent collaboration** — `call_remote_agent` tool, `multiAgent.remotes` config
- [x] **One-click cloud deploy** — Railway / Render / Fly.io deploy (`hyperclaw deploy -p railway|render|fly`)
- [x] **Plugin SDK** — stable API (docs/PLUGIN_SDK.md, src/sdk/ types + definePlugin/defineTool)
- [x] **Memory V2** — semantic search over conversation history (onTranscriptAppend → vector DB indexing)
- [x] **Fine-tuned HyperClaw model** — roadmap + config docs (docs/FINE_TUNED_MODEL.md)

> **ACP (Agent Client Protocol)** — [x] stdio server (`hyperclaw acp`) with initialize, session/new, session/load, session/prompt, session/cancel; tool streaming to IDE via session/update. [ ] sessions_spawn gateway impl; [ ] ACPX runtime for image prompts.

### Long-term
- [ ] **HyperClaw Cloud** (optional) — hosted relay for channels that 

- [ ] **Mobile-native agent** — full agent running on-device on iOS/Android
- [ ] **Enterprise features** — SSO, audit logs, team management

---

## 💡 Community Suggestions

Have an idea? [Open a Discussion](https://github.com/mylo-2001/hyperclaw/discussions) or [file a Feature Request](https://github.com/mylo-2001/hyperclaw/issues/new/choose).

---

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📚 Docs](docs/README.md)

</div>
<div align="right"><a href="#top">▲ Back to top</a></div>
