# Fine-tuned HyperClaw Model (Roadmap)

This document describes the planned **open-weights fine-tuned model** for agent tasks. The model will be trained on HyperClaw-style agent interactions and made available for self-hosted or provider deployment.

## Status

**Planned** — Training infrastructure and release are in progress. This doc describes how to configure and use the model once available.

## Config (Future)

When the model is released, configure it via `hyperclaw.json`:

```json
{
  "provider": {
    "providerId": "openai",
    "modelId": "hyperclaw/v1",
    "baseUrl": "https://your-openai-compatible-endpoint/v1"
  }
}
```

Or with OpenRouter:

```json
{
  "provider": {
    "providerId": "openrouter",
    "modelId": "hyperclaw/hyperclaw-agent-v1"
  }
}
```

## Training Approach (Planned)

- **Base model**: Open-weights LLM (e.g. Llama, Qwen)
- **Dataset**: Synthetic agent turns (tool use, planning, multi-step reasoning)
- **Format**: JSON Schema tool calls, conversation turns with system/assistant structure
- **Tool set**: Subset of HyperClaw builtins (filesystem, browser, shell, sessions)
- **Output**: LoRA adapters or full fine-tune, published under an open license

## Contributing

If you want to contribute to dataset generation or training runs, see [CONTRIBUTING.md](../CONTRIBUTING.md) and open a Discussion.
