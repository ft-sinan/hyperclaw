# Deployment Guide
---

<div align="center">

[← Browser Tool](browser.md) &nbsp;•&nbsp; [📋 Docs Index](README.md) &nbsp;•&nbsp; [Remote Access →](remote-access.md)

</div>

---

## Docker

### Production gateway

```bash
docker compose up -d gateway
```

Port 18789 will be exposed. Configure webhooks to point at your public URL (e.g. `https://your-domain.com/webhook/telegram`).

### Sandbox mode

Run the sandboxed agent (no PC tools, no host fs access):

```bash
docker compose --profile sandbox up -d sandbox
```

### Gateway with browser tools (Puppeteer)

```bash
docker compose --profile browser up -d gateway-browser
```

Uses port 18790 by default (to avoid conflict with the main gateway).

### Full stack

```bash
docker compose up -d
```

Runs the main gateway. Add `--profile sandbox` or `--profile browser` to include those services.

## One-command deploy

```bash
hyperclaw deploy --platform fly      # Fly.io (default)
hyperclaw deploy --platform render  # Render
hyperclaw deploy --platform railway # Railway
hyperclaw deploy --dry-run          # Show commands only
```

## Fly.io

See `fly.toml`. Deploy with:

```bash
fly deploy
```

Set secrets: `fly secrets set OPENROUTER_API_KEY=xxx` etc.

## Render

See `render.yaml`. Connect the repo and deploy; configure env vars in the dashboard.

## Railway

```bash
hyperclaw deploy --platform railway
```

Or: create project at [railway.app/new](https://railway.app/new), deploy from GitHub or Docker. Set env vars: `OPENROUTER_API_KEY`, `HYPERCLAW_GATEWAY_TOKEN`, `PORT=18789`.

## Environment

- `HYPERCLAW_PORT` — port (default 18789)
- `HYPERCLAW_BIND` — bind address (default 127.0.0.1; use 0.0.0.0 for Docker)
- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` — model provider
- Channel tokens: `TELEGRAM_BOT_TOKEN`, `SLACK_BOT_TOKEN`, etc.

## Data persistence

Mount `~/.hyperclaw` (or `$HYPERCLAW_DIR`) for config, credentials, and channel state.

## Kubernetes

Deploy to Kubernetes with raw manifests or [Kind](https://kind.sigs.k8s.io/) for local dev.

### Kind setup (local)

```bash
# Install Kind: https://kind.sigs.k8s.io/docs/user/quick-start/
kind create cluster --name hyperclaw

# Create secrets (replace with your keys)
kubectl create secret generic hyperclaw-secrets \
  --from-literal=OPENAI_API_KEY=sk-... \
  --from-literal=ANTHROPIC_API_KEY=sk-ant-...

# Apply manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml

# Port-forward for local access
kubectl port-forward svc/hyperclaw 18789:18789
```

### Manifests (`k8s/`)

| File | Purpose |
|------|---------|
| `configmap.yaml` | HYPERCLAW_GATEWAY_PORT, env defaults |
| `deployment.yaml` | Deployment, Service (port 18789) |

Use [External Secrets](https://external-secrets.io/) or [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) for production. See [k8s/README.md](../k8s/README.md).

---

## Pi Agent (.pi/)

Lightweight runtime for Raspberry Pi and embedded devices:

```bash
node .pi/index.js
```

Serves on port 18789 (or `HYPERCLAW_GATEWAY_PORT`). Returns a minimal status JSON — point to your main gateway for full agent features. Use for edge nodes that proxy to a central instance.

---

<div align="center">

[← Browser Tool](browser.md) &nbsp;•&nbsp; [📋 Docs Index](README.md) &nbsp;•&nbsp; [Remote Access →](remote-access.md)

</div>
<div align="right"><a href="#top">▲ Back to top</a></div>