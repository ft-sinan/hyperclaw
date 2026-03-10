<a name="top"></a>

# HyperClaw — All Commands (Commands Reference)

<div align="center">

[🏠 Main README](README.md) &nbsp;•&nbsp; [📋 Changelog](CHANGELOG.md)

</div>

---

All HyperClaw CLI commands with explanations of what they do.

---

## Setup & Init

| Command | Description |
|---------|-------------|
| `hyperclaw init` | Runs the interactive setup wizard. Options: `-a --auto-config`, `-d --daemon`, `-s --start-now`. |
| `hyperclaw onboard` | Full onboarding wizard — preferred setup path. Options: `--install-daemon`, `--quick`, `--reset`, `--non-interactive`, `--json`. |
| `hyperclaw quickstart` | Zero-config quick start. Options: `-c --channels`, `-v --voice`. |
| `hyperclaw setup` | Manage basic settings (alias for onboard). |

---

## Gateway & Daemon

| Command | Description |
|---------|-------------|
| `hyperclaw gateway status` | Shows gateway status (port, running/stopped). |
| `hyperclaw gateway start` | Starts the gateway (runs in this terminal). |
| `hyperclaw gateway stop` | Stops the gateway. |
| `hyperclaw gateway restart` | Restarts the gateway. |
| `hyperclaw gateway config` | Configure: `--set-token`, `--regenerate-token`, `--set-port`, `--set-bind`. |
| `hyperclaw daemon <action>` | Manage daemon: `start` \| `stop` \| `restart` \| `status` \| `logs` \| `install` \| `uninstall`. The `start` action runs the gateway with red banner. |
| `hyperclaw gateway:serve` | Internal command — starts the gateway server (used by daemon). |

---

## Chat & Agent

| Command | Description |
|---------|-------------|
| `hyperclaw chat` | Interactive terminal chat with the agent. Options: `--session`, `--model`, `--thinking`, `--workspace`. In-chat commands: `/exit`, `/clear`, `/model`, `/skills`, `/help`. |
| `hyperclaw agent -m "message"` | Sends a one-off message to the agent (non-streaming). Options: `--thinking`, `--model`, `--session`, `--multi-step`, `--parallel`, `--verbose`. |

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
| `hyperclaw devices pair` | Create a new pairing request and show the setup code. |
| `hyperclaw devices approve <requestId>` | Approve a pairing request. |
| `hyperclaw devices reject <requestId>` | Reject a pairing request. |
| `hyperclaw devices unpair <deviceId>` | Remove a paired device. |

---

## Skills & Hub

| Command | Description |
|---------|-------------|
| `hyperclaw hub` | Opens the Skill Hub — marketplace, browse, install, scan. |
| `hyperclaw skill search [query]` | Search ClawHub. |
| `hyperclaw skill list` | List installed skills. |
| `hyperclaw skill install <id>` | Install a skill from ClawHub. |

---

## Memory

| Command | Description |
|---------|-------------|
| `hyperclaw memory show` | Show AGENTS.md, MEMORY.md, SOUL.md. |
| `hyperclaw memory add-rule <rule>` | Add a rule to AGENTS.md. |
| `hyperclaw memory add-fact <fact>` | Add a fact to memory. |
| `hyperclaw memory search <query>` | Search memory. |
| `hyperclaw memory auto-show` | Show auto-extracted memory. |
| `hyperclaw memory clear` | Clear memory. |
| `hyperclaw memory save <text>` | Save text to memory. |

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
| `hyperclaw auth add <service_id>` | Add API key for a service. |
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
| `hyperclaw cron add <schedule> <prompt>` | Add a cron task. |
| `hyperclaw cron remove <id>` | Remove a cron task. |
| `hyperclaw gmail watch-setup` | Set up Gmail Pub/Sub for push. |
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
| `hyperclaw bot start` | Start the bot (background). |
| `hyperclaw bot stop` | Stop the bot. |

---

## Other

| Command | Description |
|---------|-------------|
| `hyperclaw message send` | Send a message via a channel. Options: `-t --to`, `-m --message`, `-c --channel`. |
| `hyperclaw menu-bar` | Launch the macOS menu bar app. |
| `hyperclaw update` | Update HyperClaw. |
| `hyperclaw deploy` | Deploy helpers (Docker, fly.io, etc.). |
| `hyperclaw osint [workflow]` | OSINT / Ethical Hacking mode. Presets: recon, bugbounty, pentest, footprint, custom, chat. |
| `hyperclaw developer-key create` | Create a developer API key. |
| `hyperclaw developer-key list` | List developer keys. |
| `hyperclaw developer-key revoke <id>` | Revoke a developer key. |
| `hyperclaw agents bindings` | Show agent bindings. |
| `hyperclaw agents bind` | Interactive agent binding. |
| `hyperclaw agents unbind` | Unbind an agent. |
| `hyperclaw sandbox explain` | Show effective sandbox mode and tool policy. |

---

## Web UI & Terminal API (v5.2.8+)

- **Web UI**: After `hyperclaw gateway` or `hyperclaw daemon start`, open `http://localhost:18789` (or your gateway port). Dashboard, Chat with New chat / Clear messages, and **Local terminal** panel below the chat — with Build, Install, Test, Doctor buttons.
- **Terminal API**: `POST /api/terminal` with `{ "command": "npm run build" }` — runs a command in the gateway's cwd.

---

<div align="center">

[▲ Back to top](#top)

</div>
