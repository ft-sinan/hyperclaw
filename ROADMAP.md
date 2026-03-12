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

## ✅ Recently shipped (v5.4)

Web UI, Dashboard v2 plan, Skill marketplace, RAG scaffold, Multi-user, Voice-first, Telegram inline, Encrypted config, memory-lancedb, OpenTelemetry, phone-control, device-pair, llm-task, Kubernetes (k8s/), Pi agent (.pi/), i18n, backup create/verify, Discord autoArchiveDuration, TUI agent inference, git hash in --version, HyperClawKit, Brave LLM Context, ACP Provenance, iOS Home Canvas, macOS model picker, Ollama onboarding, OpenCode Go, Multimodal memory, Gemini embedding, ACP resumeSessionId, Node pending queue, LLM thinking override, call_remote_agent, Railway/Render/Fly deploy, Plugin SDK, Memory V2, ACP sessions_spawn + ACPX image prompts. See [CHANGELOG](CHANGELOG.md).

---

## 📅 Planned (next)

### Short-term
- [x] **Dashboard v2 implementation** — Card layout, sessions sparkline, dark/light/system theme, i18n (ja/zh), responsive
- [x] **RAG document ingestion CLI** — `hyperclaw rag add <path>`, auto-chunk and index
- [x] **ACP native image in inference** — Pass image blocks directly to vision models
- [ ] **Discord Voice channels** — Join voice, transcribe, respond (experimental)
- [x] **Telegram Forum topics** — Per-topic sessions, reply in thread via message_thread_id
- [x] **Multi-user runtime** — Per-user workspace (agents.runtime.userWorkspaceEnabled + userId)
- [x] **Kubernetes install docs** — Kind setup, manifests in k8s/, deployment.md

### Medium-term
- [ ] **HyperClaw Cloud**  — Hosted relay for channels 
- [ ] **Mobile-native agent** — Full agent on-device on iOS/Android
- [ ] **Enterprise features** — SSO, audit logs, team management
- [x] **Fine-tuned HyperClaw model** — Provider scaffold + docs (per FINE_TUNED_MODEL.md)

---

## 💡 Community Suggestions

Have an idea? [Open a Discussion](https://github.com/mylo-2001/hyperclaw/discussions) or [file a Feature Request](https://github.com/mylo-2001/hyperclaw/issues/new/choose).

---

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📚 Docs](docs/README.md)

</div>
<div align="right"><a href="#top">▲ Back to top</a></div>
