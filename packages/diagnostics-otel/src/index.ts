/**
 * @hyperclaw/diagnostics-otel
 * OpenTelemetry diagnostics for HyperClaw.
 * Enable: HYPERCLAW_OTEL_ENABLED=1, OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 */

import { trace, context, type Span, type Tracer } from '@opentelemetry/api';

export const tracer: Tracer = trace.getTracer('hyperclaw', '0.1.0');

export function initOtel(): void {
  if (!process.env.HYPERCLAW_OTEL_ENABLED) return;
  // Full SDK: use NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
}

export function startSpan(name: string): Span {
  return tracer.startSpan(name);
}

export function runInSpan<T>(name: string, fn: () => T): T {
  const span = tracer.startSpan(name);
  return context.with(trace.setSpan(context.active(), span), () => {
    try {
      return fn();
    } finally {
      span.end();
    }
  });
}
