# ACP — Agent Client Protocol

HyperClaw implements the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) for IDE integration. This allows editors like **VS Code**, **Zed**, **Cursor**, and **Codex** to connect to HyperClaw as an AI coding agent.

## Quick Start

Start the ACP server on stdio:

```bash
hyperclaw acp
```

The server communicates via JSON-RPC 2.0 over stdin/stdout using Content-Length delimited messages (LSP-style).

## Supported Methods

| Method | Description |
|--------|-------------|
| `initialize` | Negotiate protocol version and capabilities |
| `session/new` | Create a new session |
| `session/load` | Resume an existing session (from threads or in-memory) |
| `session/prompt` | Send a user prompt; receives `session/update` notifications |
| `session/cancel` | Cancel the current prompt turn |

## IDE Configuration

### Zed

Add to your `settings.json`:

```json
{
  "agent.servers": {
    "hyperclaw": {
      "command": "hyperclaw",
      "args": ["acp"]
    }
  }
}
```

### VS Code / Cursor

If your extension supports ACP agents, configure:

- **Command**: `hyperclaw`
- **Args**: `["acp"]`

## Tool Streaming

During `session/prompt`, HyperClaw streams:

- **agent_message_chunk** — Token-by-token assistant output
- **thought_chunk** — Extended thinking (when using thinking models)
- **tool_call** / **tool_call_update** — Tool invocations and status

## sessions_spawn

The `sessions_spawn` tool allows an agent to spawn child agents for delegation. It is exposed when running in gateway context and is included in `group:sessions`. Gateway support for `spawnChildAgent` is optional; when not available, the tool returns a clear message.

## Session Persistence

- **session/new** — Creates an in-memory session; use `session/load` with the returned `sessionId` to resume in the same run.
- **session/load** — Can load from `~/.hyperclaw/threads/` (ACP threads). Pass the thread ID with `sess_` prefix, e.g. `sess_<threadId>`.

## Related

- [ROADMAP.md](../ROADMAP.md) — ACP Provenance, resumeSessionId
- [Threads CLI](../README.md) — `hyperclaw threads list` / `create` / `terminate`
