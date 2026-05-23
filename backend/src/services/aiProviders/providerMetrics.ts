// backend/src/services/aiProviders/providerMetrics.ts
//
// V2-6 (founder roadmap Tier V — AI Cost Tiering): per-provider
// instrumentation. Tracks the three metrics the V2 verification line
// names:
//
//   - **answer rate**: success/total per provider — sub-90% means a
//     provider is silently failing more than it succeeds.
//   - **JSON parse failure rate**: parsed/success per provider — high
//     numbers mean the model is drifting from the contract (a fix-the-
//     prompt-not-the-provider signal).
//   - **p95 latency**: rolling per-provider latency. Names the alert
//     threshold from the V2 spec ("if fallback-cascade pushes p95
//     past 8s, defer V2 rollout").
//
// In-memory rolling-window tracker — zero infra dependency. Persists
// for the process lifetime; long-term storage waits on the analytics
// pipeline (Tier T post-PostHog work). The shape locks the contract
// so the dashboard query (when it lands) reads stable keys.

const WINDOW_SIZE = 500;

interface ProviderSample {
  /** ms elapsed for the provider call (from request start to first
   *  parsed response — does NOT include downstream Sazon-side
   *  processing). */
  latencyMs: number;
  /** True iff the provider returned a 2xx-ish response. */
  succeeded: boolean;
  /** True iff `succeeded` AND the body parsed as the expected JSON
   *  shape. Only checked when `succeeded` is true. */
  jsonParsed: boolean;
  /** Wall-clock for window eviction + dashboard-grouping. */
  at: number;
}

const samples = new Map<string, ProviderSample[]>();

export interface ProviderMetricsSnapshot {
  provider: string;
  samples: number;
  /** succeeded / samples */
  answerRate: number;
  /** jsonParsed / succeeded (or 1 when succeeded=0 to avoid NaN). */
  jsonParseRate: number;
  /** p50 of successful samples' latencyMs. */
  p50LatencyMs: number;
  /** p95 of successful samples' latencyMs. NAMED — V2-3 budget. */
  p95LatencyMs: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

/** Record a single provider call. Caller measures the latency. */
export function recordProviderCall(input: {
  provider: string;
  latencyMs: number;
  succeeded: boolean;
  jsonParsed: boolean;
}): void {
  const key = input.provider.toLowerCase();
  const bucket = samples.get(key) ?? [];
  bucket.push({
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    succeeded: !!input.succeeded,
    jsonParsed: !!input.jsonParsed,
    at: Date.now(),
  });
  // Drop the oldest when we exceed the rolling window.
  if (bucket.length > WINDOW_SIZE) bucket.splice(0, bucket.length - WINDOW_SIZE);
  samples.set(key, bucket);
}

/** Snapshot a single provider's current metrics. Returns null when no
 *  samples have been recorded yet. */
export function snapshotProvider(provider: string): ProviderMetricsSnapshot | null {
  const key = provider.toLowerCase();
  const bucket = samples.get(key);
  if (!bucket || bucket.length === 0) return null;
  const successful = bucket.filter((s) => s.succeeded);
  const sortedLatency = successful
    .map((s) => s.latencyMs)
    .sort((a, b) => a - b);
  const jsonParsed = successful.filter((s) => s.jsonParsed).length;
  return {
    provider: key,
    samples: bucket.length,
    answerRate: successful.length / bucket.length,
    jsonParseRate: successful.length > 0 ? jsonParsed / successful.length : 1,
    p50LatencyMs: quantile(sortedLatency, 0.5),
    p95LatencyMs: quantile(sortedLatency, 0.95),
  };
}

/** Snapshot every provider that has at least one recorded call. */
export function snapshotAll(): ProviderMetricsSnapshot[] {
  const out: ProviderMetricsSnapshot[] = [];
  for (const key of samples.keys()) {
    const snap = snapshotProvider(key);
    if (snap) out.push(snap);
  }
  // Stable sort by provider name for dashboard grouping.
  out.sort((a, b) => a.provider.localeCompare(b.provider));
  return out;
}

/** Reset all samples. Used by tests; never call in production. */
export function __resetProviderMetricsForTests(): void {
  samples.clear();
}
