/**
 * src/gateway/deps-provider.ts
 * Creates GatewayDeps by wiring src/infra, src/channels, src/hooks, packages/core.
 * Used when starting the gateway from daemon/CLI.
 */

import fs from 'fs-extra';
import path from 'path';
import type { GatewayDeps } from '../../packages/gateway/src/deps';

export async function createDefaultGatewayDeps(): Promise<GatewayDeps> {
  const [paths, envResolve, sessionStore, channelRunner, hookLoader, core, devKeys, pendingApproval, observability, costTracker, tts, nodesRegistry, canvasRenderer, a2ui, daemon] = await Promise.all([
    import('../infra/paths'),
    import('../infra/env-resolve'),
    import('../../packages/core/src/agent/session-store'),
    import('../channels/runner'),
    import('../hooks/loader'),
    import('../../packages/core/src/index'),
    import('../infra/developer-keys'),
    import('../infra/pending-approval'),
    import('../infra/observability'),
    import('../infra/cost-tracker'),
    import('../services/tts-elevenlabs'),
    import('../services/nodes-registry'),
    import('../canvas/renderer'),
    import('../canvas/a2ui-protocol'),
    import('../infra/daemon'),
  ]);

  const createSessionStore = async (baseDir: string) => {
    const store = await sessionStore.createFileSessionStore(baseDir);
    return store as unknown as GatewayDeps['createSessionStore'] extends (b: string) => Promise<infer R> ? R : never;
  };

  const createHookLoader = () => new hookLoader.HookLoader() as unknown as NonNullable<GatewayDeps['createHookLoader']> extends () => infer R ? R : never;

  const getCanvasState = async (): Promise<object> => {
    const renderer = new canvasRenderer.CanvasRenderer();
    const canvas = await renderer.getOrCreate();
    return canvas as object;
  };

  const getCanvasA2UI = async (): Promise<string> => {
    const renderer = new canvasRenderer.CanvasRenderer();
    const canvas = await renderer.getOrCreate();
    const msg = a2ui.toBeginRendering(canvas);
    return a2ui.toJSONL([msg]);
  };

  // Memory V2: auto-index transcript turns into vector DB when memory.vectorDb.enabled
  let vectorSvc: { addMemory: (text: string, category?: string, sessionId?: string) => Promise<void> } | null = null;
  const onTranscriptAppend = (key: string, role: string, content: string): void => {
    try {
      const cfg = (() => {
        try {
          return fs.readJsonSync(paths.getConfigPath()) as { memory?: { vectorDb?: { enabled?: boolean; embeddingProvider?: string } }; provider?: { apiKey?: string } };
        } catch {
          return {};
        }
      })();
      if (!cfg?.memory?.vectorDb?.enabled) return;
      const initVectorSvc = async () => {
        if (vectorSvc) return;
        const mod = await import('@hyperclaw/memory-lancedb').catch(() => null);
        const VectorMemoryService = mod?.VectorMemoryService;
        if (!VectorMemoryService) return;
        const svc = new VectorMemoryService({
          dbPath: path.join(paths.getHyperClawDir(), 'memory-lancedb'),
          apiKey: cfg?.provider?.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.GOOGLE_AI_API_KEY,
          embeddingProvider: (cfg?.memory?.vectorDb?.embeddingProvider as 'openai' | 'gemini') ?? 'openai'
        });
        await svc.init?.();
        vectorSvc = svc;
      };
      initVectorSvc().then(() => {
        const text = content?.trim();
        if (text && text.length > 20) vectorSvc?.addMemory(text, role, key).catch(() => {});
      }).catch(() => {});
    } catch {}
  };

  return {
    getHyperClawDir: paths.getHyperClawDir,
    getConfigPath: paths.getConfigPath,
    resolveGatewayToken: envResolve.resolveGatewayToken,
    validateApiAuth: async (bearer: string) => (await devKeys.validateDeveloperKey(bearer)).valid,
    createSessionStore,
    startChannelRunners: channelRunner.startChannelRunners,
    createHookLoader,
    runAgentEngine: core.runAgentEngine as GatewayDeps['runAgentEngine'],
    createPiRPCHandler: core.createPiRPCHandler as GatewayDeps['createPiRPCHandler'],
    listTraces: observability.listTraces,
    getSessionSummary: costTracker.getSessionSummary,
    getGlobalSummary: costTracker.getGlobalSummary,
    recordUsage: costTracker.recordUsage,
    textToSpeech: tts.textToSpeech as unknown as GatewayDeps['textToSpeech'],
    getPending: pendingApproval.getPending,
    clearPending: pendingApproval.clearPending,
    createRunTracer: observability.createRunTracer as GatewayDeps['createRunTracer'],
    writeTraceToFile: observability.writeTraceToFile as GatewayDeps['writeTraceToFile'],
    NodeRegistry: nodesRegistry.NodeRegistry as GatewayDeps['NodeRegistry'],
    getCanvasState,
    getCanvasA2UI,
    restartDaemon: async () => {
      const dm = new daemon.DaemonManager();
      await dm.restart?.();
    },
    loadConfig: () => {
      try {
        return fs.readJsonSync(paths.getConfigPath());
      } catch {
        return {};
      }
    },
    onTranscriptAppend,
  };
}
