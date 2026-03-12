# Kubernetes Deployment

Deploy HyperClaw gateway to Kubernetes.

## Quick start

```bash
# Create secrets (replace with your API key)
kubectl create secret generic hyperclaw-secrets --from-literal=OPENAI_API_KEY=sk-your-key

# Apply manifests
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
```

## Prerequisites

- Kubernetes cluster
- Docker image: build and push `hyperclaw/gateway:latest` (or use your registry)

## Config

- **ConfigMap** (`configmap.yaml`): HYPERCLAW_GATEWAY_PORT
- **Secret** (`configmap.yaml`): OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
- Use External Secrets / Sealed Secrets for production.
- See [docs/configuration.md](../docs/configuration.md).
