<a name="top"></a>

# HyperClaw — All Commands (Commands Reference)

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📋 Changelog](CHANGELOG.md)

</div>

---

All HyperClaw CLI commands with explanations of what they do.

**Global options** (any command): `--profile <name>` — use isolated gateway profile (e.g. `hyperclaw --profile rescue gateway`). `-V, --version`, `-h, --help`.

---

## Setup & Init

| Command | Description |
|---------|-------------|
| `hyperclaw init` | Runs the interactive setup wizard. Options: `-a --auto-config`, `-d --daemon`, `-s --start-now`. |
| `hyperclaw onboard` | Full onboarding wizard — preferred setup path. Options: `--install-daemon`, `--quick`, `--reset`, `--reset-scope config|config+creds|full`, `--non-interactive`, `--json`, `--anthropic-api-key`, `--openai-api-key`, `--gateway-port`, `--gateway-bind`, `--daemon-runtime`, `--skip-skills`, `--skip-search`. |
| `hyperclaw quickstart` | Zero-config quick start. Options: `-c --channels`, `-v --voice`. |
| `hyperclaw setup` | Manage basic settings (alias for onboard). |

---

## Gateway & Daemon

| Command | Description |
|---------|-------------|
| `hyperclaw gateway status` | Show gateway status (port, running/stopped). |
| `hyperclaw gateway start` | Start the gateway (foreground). |
| `hyperclaw gateway stop` | Stop the gateway. |
| `hyperclaw gateway restart` | Restart the gateway. |
| `hyperclaw gateway config` | Configure gateway. Options: `--set-token`, `--regenerate-token`, `--set-port <port>`, `--set-bind <addr>`. |
| `hyperclaw daemon <action>` | Manage daemon: `start` \| `stop` \| `restart` \| `status` \| `logs` \| `install` \| `uninstall`. |
| `hyperclaw gateway:serve` | Internal — start gateway server (used by daemon). |

---

## Chat & Agent

| Command | Description |
|---------|-------------|
| `hyperclaw web` | Launch React Web UI — auto `npm install` + `npm run dev`. Options: `--skip-install`, `--port <port>`. |
| `hyperclaw chat` | Interactive terminal chat. Options: `--session`, `--model`, `--thinking`, `--workspace`. **In-chat commands:** `/exit` quit, `/clear` clear history, `/model` change model, `/skills` list skills, `/help` show help. |
| `hyperclaw agent -m "message"` | One-off message (non-streaming). Options: `--thinking`, `--model`, `--session`, `--multi-step` (run multiple tool rounds), `--parallel` (parallel tool calls), `--verbose`. |

---

## Channels

| Command | Description |
|---------|-------------|
| `hyperclaw channels list` | List available channels. |
| `hyperclaw channels add [channel]` | Add a channel (e.g. telegram, discord). |
| `hyperclaw channels remove <channel>` | Remove a channel. |
| `hyperclaw channels login [channel]` | Login / OAuth for a channel. |
| `hyperclaw channels status` | Channel status (optional `--probe`). |

---

## Hooks

| Command | Description |
|---------|-------------|
| `hyperclaw hooks list` | List hooks. |
| `hyperclaw hooks info <id>` | Info for a specific hook. |
| `hyperclaw hooks enable <id>` | Enable a hook. |
| `hyperclaw hooks disable <id>` | Disable a hook. |
| `hyperclaw hooks install <pack>` | Install a hook from a package. |

---

## Pairing & Devices

| Command | Description |
|---------|-------------|
| `hyperclaw pairing list [channel]` | Show pending DM pairing requests. |
| `hyperclaw pairing approve <channel> <code>` | Approve a pairing code and add the user to the allowlist. |
| `hyperclaw devices list` | List pending and paired devices. |
| `hyperclaw devices pair` | Create a new pairing request and show the setup code. Options: `-u --gateway-url`, `-n --name`. |
| `hyperclaw devices approve <requestId>` | Approve a pairing request. |
| `hyperclaw devices reject <requestId>` | Reject a pairing request. |
| `hyperclaw devices unpair <deviceId>` | Remove a paired device. |

---

## Skills & Hub

| Command | Description |
|---------|-------------|
| `hyperclaw hub` | Browse Skill Hub — curated marketplace. |
| `hyperclaw hub search [query]` | Search skills (ClawHub + community registry + bundled). Options: `-c --category`. |
| `hyperclaw hub install <id>` | Install skill. Options: `-v --version`, `--force`. |
| `hyperclaw hub list` | List installed skills. |
| `hyperclaw hub scan <id>` | Security scan a skill. |
| `hyperclaw hub marketplace` | Full marketplace view. Options: `--hide-suspicious`. |
| `hyperclaw skill search [query]` | Alias for hub search. |
| `hyperclaw skill list` | Alias for hub list. |
| `hyperclaw skill install <id>` | Alias for hub install. Options: `-v --version`, `--force`. |

---

## Memory

| Command | Description |
|---------|-------------|
| `hyperclaw memory show` | Show AGENTS.md, MEMORY.md, SOUL.md. |
| `hyperclaw memory add-rule <rule>` | Add a rule to AGENTS.md. |
| `hyperclaw memory add-fact <fact>` | Add a fact to memory (and vector DB when memory-lancedb available). |
| `hyperclaw memory add-image <path>` | Add image to multimodal vector memory. Options: `-c --caption`. Requires gemini + GOOGLE_AI_API_KEY. |
| `hyperclaw memory add-audio <path>` | Add audio to multimodal vector memory. Options: `-t --transcript`. Requires gemini + GOOGLE_AI_API_KEY. |
| `hyperclaw memory search <query>` | Text search memory. |
| `hyperclaw memory search-vector <query>` | Semantic search (requires memory-lancedb). Options: `-n --limit`. |
| `hyperclaw memory auto-show` | Show auto-extracted memory. |
| `hyperclaw memory clear` | Clear memory. |
| `hyperclaw memory save <text>` | Save text to memory. |

---

## Backup

| Command | Description |
|---------|-------------|
| `hyperclaw backup create` | Create timestamped backup. Options: `-o --output <dir>`. |
| `hyperclaw backup verify <dir>` | Verify backup integrity. |
| `hyperclaw backup restore <dir>` | Restore from backup. Options: `-y --yes`. |

---

## Config & Secrets

| Command | Description |
|---------|-------------|
| `hyperclaw config show` | Show config settings. |
| `hyperclaw config set-key <KEY=value>` | Set an API key or other config value. |
| `hyperclaw config set-service-key <serviceId> [apiKey]` | Set API key for an external service. |
| `hyperclaw config schema` | Show config schema. |
| `hyperclaw secrets audit` | Check required secrets. |
| `hyperclaw secrets set <KEY=value>` | Set a secret in .env. |
| `hyperclaw secrets apply` | Write secrets to shell config. |
| `hyperclaw secrets reload` | Reload secrets into the running gateway. |
| `hyperclaw secrets remove <key>` | Remove a secret. |
| `hyperclaw secrets credentials` | List credential files. |
| `hyperclaw auth add <service_id>` | Add API key for a service. Options: `--key`, `--base-url`, `--env-var`. |
| `hyperclaw auth remove <service_id>` | Remove API key. |
| `hyperclaw auth oauth <provider>` | OAuth flow (google, microsoft, etc.). |
| `hyperclaw auth setup-token <provider>` | Set setup token. |
| `hyperclaw auth oauth-set <provider>` | Set OAuth credentials. |

---

## Security & Health

| Command | Description |
|---------|-------------|
| `hyperclaw doctor` | Health check — misconfigs, DM policies, repairs. Use `--fix` for auto-repair. |
| `hyperclaw health` | Quick gateway probe. |
| `hyperclaw security audit` | Security audit — permissions, DM policies, embedded secrets. Use `--fix` for auto-fixes. |

---

## Status & Dashboard

| Command | Description |
|---------|-------------|
| `hyperclaw status` | System overview. `--all` or `--deep` for full diagnosis. |
| `hyperclaw dashboard` | Live terminal dashboard. `-l --live` for real-time updates. |

---

## Threads (ACP) & Canvas

| Command | Description |
|---------|-------------|
| `hyperclaw acp` | Start ACP server on stdio (IDE integration: VS Code, Cursor, Codex). |
| `hyperclaw threads create` | Create or resume an ACP thread. Options: `--resume <id>`, `--name <name>`, `--channel <id>`. |
| `hyperclaw threads list` | List agent threads. |
| `hyperclaw threads terminate <id>` | Terminate a thread. |
| `hyperclaw canvas show` | Show current canvas components. |
| `hyperclaw canvas add <type> <title>` | Add a component (chart, table, form, etc.). |
| `hyperclaw canvas clear` | Clear the canvas. |
| `hyperclaw canvas export` | Export canvas to HTML. |

---

## MCP & Nodes

| Command | Description |
|---------|-------------|
| `hyperclaw mcp list` | List MCP servers. |
| `hyperclaw mcp add` | Add an MCP server. |
| `hyperclaw mcp remove <id>` | Remove an MCP server. |
| `hyperclaw mcp probe [id]` | Test MCP connection. |
| `hyperclaw node list` | List paired nodes. |
| `hyperclaw node add` | Add / pair a node. |
| `hyperclaw node probe [id]` | Probe a node. |
| `hyperclaw node remove <id>` | Remove a node. |
| `hyperclaw node queue [nodeId]` | List work queued for dormant (offline) nodes. Work is enqueued when a node is offline; it drains when you run `hyperclaw node probe`. |
| `hyperclaw nodes` | List connected mobile nodes (iOS/Android Connect). |

---

## Delivery, Webhooks, Logs

| Command | Description |
|---------|-------------|
| `hyperclaw delivery status` | Delivery queue status. |
| `hyperclaw delivery retry <id>` | Retry a failed delivery. |
| `hyperclaw webhooks list` | List webhooks. |
| `hyperclaw webhooks remove <id>` | Remove a webhook. |
| `hyperclaw webhooks toggle <id>` | Enable/disable a webhook. |
| `hyperclaw logs` | Show gateway logs. `-n --lines`, `-f --follow` for streaming. |

---

## Cron, Gmail, Auto-reply

| Command | Description |
|---------|-------------|
| `hyperclaw cron list` | List scheduled tasks. |
| `hyperclaw cron add <schedule> <prompt>` | Add a cron task. Options: `-n --name`, `-s --skill <skillId>`. |
| `hyperclaw cron remove <id>` | Remove a cron task. |
| `hyperclaw gmail watch-setup` | Set up Gmail Pub/Sub for push. Required: `-t --topic <name>`. Options: `-l --labels <ids>`. |
| `hyperclaw auto-reply list` | List auto-reply rules. |
| `hyperclaw auto-reply toggle <id>` | Toggle a rule. |
| `hyperclaw auto-reply remove <id>` | Remove a rule. |

---

## Voice, Theme, Workspace

| Command | Description |
|---------|-------------|
| `hyperclaw voice-call` | Terminal voice session (microphone → agent → TTS). |
| `hyperclaw voice` | Voice settings (wake word, language). |
| `hyperclaw theme list` | List themes (dark, grey, white). |
| `hyperclaw theme set <theme>` | Set theme. |
| `hyperclaw theme preview` | Preview themes. |
| `hyperclaw workspace init [dir]` | Initialize workspace files (SOUL.md, AGENTS.md, etc.). |
| `hyperclaw workspace show [dir]` | Show workspace contents. |

---

## PC Access & Bot

| Command | Description |
|---------|-------------|
| `hyperclaw pc status` | PC access status (enabled/disabled). |
| `hyperclaw pc enable` | Enable PC access for the agent. |
| `hyperclaw pc disable` | Disable PC access. |
| `hyperclaw pc log` | Show pc-access.log. |
| `hyperclaw pc run <command>` | Run a command (CLI test). |
| `hyperclaw bot status` | HyperClaw Bot status. |
| `hyperclaw bot setup` | Set up HyperClaw Bot. |
| `hyperclaw bot start` | Start the bot. Options: `--background`. |
| `hyperclaw bot stop` | Stop the bot. |

---

## Other

| Command | Description |
|---------|-------------|
| `hyperclaw message send` | Send a message via channel. Options: `-t --to`, `-m --message`, `-c --channel`, `--session`. |
| `hyperclaw menu-bar` | Launch macOS menu bar companion. |
| `hyperclaw update` | Update HyperClaw. Options: `-c --channel stable|beta|dev`. |
| `hyperclaw deploy` | One-click deploy (Fly.io, Render, Railway). Options: `-p --platform fly|render|railway`, `--dry-run`. |
| `hyperclaw osint [workflow]` | OSINT / Ethical Hacking mode. Presets: recon, bugbounty, pentest, footprint, custom, chat, setup. Options: `--show`, `--reset`, `--model`. |
| `hyperclaw developer-key create` | Create developer API key. |
| `hyperclaw developer-key list` | List developer keys. |
| `hyperclaw developer-key revoke <id>` | Revoke a developer key. |
| `hyperclaw agents bindings` | Show agent bindings. |
| `hyperclaw agents bind` | Interactive agent binding. |
| `hyperclaw agents unbind` | Unbind an agent. |
| `hyperclaw sandbox explain` | Show effective sandbox mode and tool policy. Options: `--json`. |
| `hyperclaw logs` | View gateway logs. Options: `-n --lines`, `-f --follow`. |

---

## React Web UI (optional)

Recommended: `hyperclaw web` — auto-installs deps and starts the dev server.

Or manually:

```bash
cd apps/web
npm install
npm run dev
```

Then open `http://localhost:5173` (Vite dev server). Point it at your gateway with `VITE_GATEWAY_URL=http://localhost:18789` if the gateway runs elsewhere.

The gateway’s built-in chat at `http://localhost:18789/chat` uses the static HTML UI. The React app offers more features.

---

## Web UI & Terminal API (v5.4.1+)

- **Web UI**: After `hyperclaw gateway` or `hyperclaw daemon start`, open `http://localhost:18789` (or your gateway port). Dashboard, Chat with New chat / Clear messages, and **Local terminal** panel below the chat — with Build, Install, Test, Doctor buttons.
- **Terminal API**: `POST /api/terminal` with `{ "command": "npm run build" }` — runs a command in the gateway's cwd.
- **Terminal working directory (path)**: The terminal runs in the gateway's `process.cwd()` (where you started the gateway). Works on Windows, Linux, and Mac. The path appears in the terminal title bar **after** you run any command. To show it immediately, run `cd` (Windows/PowerShell) or `pwd` (Linux/macOS). You'll then see `PS C:\Users\...>` or `user@hostname:/path` in the header.

---

<div align="center">

[▲ Back to top](#top)

</div>
