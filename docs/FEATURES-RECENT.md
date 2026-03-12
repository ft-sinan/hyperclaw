# Recent Features (v5.4.x)

<div align="center">

[📋 Docs Index](README.md) &nbsp;•&nbsp; [Configuration](configuration.md) &nbsp;•&nbsp; [ROADMAP](../ROADMAP.md)

</div>

---

Features shipped in v5.4 (see [ROADMAP](../ROADMAP.md) for full list). Some are CLI commands, others config/API.

---

## AI Providers

### OpenCode Go

Code-focused proxy: Kimi K2.5, GLM-5, MiniMax M2.5. Same API key as OpenCode Zen.

- Config: `provider.providerId: 'opencode-go'`, `OPENCODE_API_KEY`
- Base URL: `https://opencode.ai/zen/go/v1`

### Ollama (Local vs Cloud)

The wizard now asks: **Local** (ollama serve on this machine) or **Cloud** (ollama.com API).

- **Local**: No API key. Base URL `http://localhost:11434/v1`. Run `ollama serve` and `ollama pull <model>`.
- **Cloud**: API key from [ollama.com/settings/keys](https://ollama.com/settings/keys). Base URL `https://ollama.com/v1`. Env: `OLLAMA_API_KEY`.

---

## Web Search

### Brave LLM Context

Built-in tool `brave_llm_context` — web search with pre-extracted snippets for LLM grounding. Configure via wizard (web search → Brave) or `skills.apiKeys.brave` or `BRAVE_API_KEY`. See [Integrations](integrations.md) (Brave LLM Context section).

---

## Nodes

### Node Pending Queue

When a node is offline, work (agent jobs, commands) is queued. View with `hyperclaw node queue [nodeId]`. When the node comes back online, run `hyperclaw node probe` to drain the queue. Config: `~/.hyperclaw/node-pending-queue.json`.

---

## Deploy

### Railway

`hyperclaw deploy --platform railway` — one-click deploy. Add Railway to wizard: Extras → Deploy → Railway. See [Deployment](deployment.md#railway).

---

## Terminal (Web UI)

The Local terminal panel runs commands in the gateway's `process.cwd()`. Path appears in the title bar **after** running any command. To show it immediately: run `cd` (Windows) or `pwd` (Linux/macOS). See [READMECOMMAND.md](../READMECOMMAND.md).

---

## Multi-agent

### call_remote_agent

Agent tool to delegate to another HyperClaw instance. Config: `multiAgent.remotes.<id>.url`, `multiAgent.remotes.<id>.token`. See [Configuration](configuration.md) (multiAgent.remotes).

---

## ACP & IDE

### ACP Provenance

API responses include `X-HyperClaw-Provenance-Source`, `X-HyperClaw-Provenance-Timestamp` headers and `response.provenance` for IDE clients.

### threads create --resume

`hyperclaw threads create --resume <sessionId>` — resume an existing ACP/Codex session.

---

## Memory V2

Semantic search over conversation history. Config: `memory` with `embeddingProvider: 'gemini'`. `onTranscriptAppend` indexes new messages to the vector DB. See [Configuration](configuration.md) (memory).

---

## Dashboard v2

Next-gen dashboard UX. Plan: [apps/web/DASHBOARD_V2.md](../apps/web/DASHBOARD_V2.md). Planned: card layout, real-time charts, dark/light theme, i18n (ja, zh), responsive mobile.

---

## RAG (Retrieval-Augmented Generation)

Package `packages/rag` — local document indexing for semantic search. Requires `@hyperclaw/memory-lancedb`. Config: `dbPath`, `chunkSize`, `chunkOverlap`. See [PACKAGE-STRUCTURE](PACKAGE-STRUCTURE.md).

---

## Pi Agent (.pi/)

Lightweight runtime for Raspberry Pi and embedded devices. Run `node .pi/index.js`. Serves a minimal status endpoint on port 18789; point to main gateway for full agent features. See [Deployment](deployment.md).

---

## i18n (locales)

Web UI supports `locales/ja.json`, `zh.json`, `en.json`. Load via `src/i18n` `loadLocale`, `t()`. Dashboard v2 plan includes i18n for ja, zh.

---

## Extensions (Built-in)

| Extension | Purpose |
|-----------|---------|
| **phone-control** | Handle phone control commands, `handlePhoneControl` |
| **device-pair** | QR payload, pairing flow — `getQRPayload`, `PairResult` |
| **llm-task** | Task decomposition — `decomposeTask`, `runTasks` |

---

## HyperClawKit

Package `packages/hyperclawkit` — shared types for iOS/Android mobile clients: `NodeStatus`, `ChatSession`, `VoiceConfig`, `ConnectParams`, `PairingPayload`.

---

## OpenTelemetry (diagnostics-otel)

Package `packages/diagnostics-otel`. Enable: `HYPERCLAW_OTEL_ENABLED=1`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`. Provides `tracer`, `startSpan`, `runInSpan` for tracing.

---

## Other ROADMAP items

- **iOS Home Canvas** — Home tab in iOS app (welcome + agent overview)
- **macOS model picker** — Settings: modelId + thinkingLevel, persisted
- **Plugin SDK** — [PLUGIN_SDK.md](PLUGIN_SDK.md)
