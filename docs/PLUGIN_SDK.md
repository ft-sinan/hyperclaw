# HyperClaw Plugin SDK — Stable API

The Plugin SDK provides a **stable public API** for building third-party channel connectors, tools, and skills. The interfaces in `src/sdk/` are versioned and follow semantic versioning.

## Stability Promise

- **API surface**: `HyperClawPlugin`, `ChannelExtension`, `Tool`, `PluginContext` and all sub-interfaces are stable within a major version
- **Breaking changes** only in major releases (e.g. 6.0.0)
- **Additions** (new optional fields, new events) are non-breaking
- **Deprecation**: deprecated APIs are supported for at least one minor release before removal

## Import

```ts
import {
  definePlugin,
  defineChannelExtension,
  defineTool,
  type HyperClawPlugin,
  type ChannelExtension,
  type Tool,
  SDK_VERSION,
  SDK_COMPAT
} from 'hyperclaw/sdk';
```

## Core Types

| Type | Purpose |
|------|---------|
| `HyperClawPlugin` | Plugin manifest with capabilities and lifecycle hooks |
| `ChannelExtension` | Connector for external messaging channels (Telegram, Slack, etc.) |
| `Tool` | Custom tool exposed to the agent (with JSON Schema input) |
| `PluginContext` | Injected APIs: config, gateway, tools, hooks, canvas, memory, secrets, log |

## Capabilities

- `message:send` / `message:receive` — Channel messaging
- `gateway:connect` — Gateway presence
- `tools:register` — Register custom tools
- `hooks:register` — Register event handlers
- `canvas:write` — Add/update canvas components
- `memory:read` / `memory:write` — Access MEMORY.md and vector search
- `config:read` — Read config keys
- `secrets:read` — Access secrets (API keys, tokens)

## Quick Start

```ts
// skills/my-skill/index.ts
import { definePlugin, defineTool } from 'hyperclaw/sdk';

export default definePlugin({
  id: 'my-skill',
  name: 'My Skill',
  version: '1.0.0',
  description: 'Custom tool for X',
  author: 'You',
  capabilities: ['tools:register'],
  async onLoad(ctx) {
    ctx.tools.register(defineTool({
      name: 'My Tool',
      description: 'Does X',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
      handler: async (input) => ({ output: String(input.query) })
    }));
  }
});
```

## Version

- **SDK_VERSION**: `5.0.1`
- **SDK_COMPAT**: `>=5.0.1`
