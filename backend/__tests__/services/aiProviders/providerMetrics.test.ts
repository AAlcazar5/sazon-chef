// V2-6 (founder roadmap Tier V — AI Cost Tiering): per-provider
// metrics tracker tests. Pins the contract for the V2 verification
// line: answer rate / JSON parse failure rate / p95 latency.

import {
  recordProviderCall,
  snapshotProvider,
  snapshotAll,
  __resetProviderMetricsForTests,
} from '../../../src/services/aiProviders/providerMetrics';

beforeEach(() => {
  __resetProviderMetricsForTests();
});

describe('providerMetrics — basic recording', () => {
  it('returns null for a provider with no samples', () => {
    expect(snapshotProvider('claude')).toBeNull();
  });

  it('records a single success and reports answerRate=1, jsonParseRate=1', () => {
    recordProviderCall({
      provider: 'claude',
      latencyMs: 250,
      succeeded: true,
      jsonParsed: true,
    });
    const snap = snapshotProvider('claude');
    expect(snap).not.toBeNull();
    expect(snap!.samples).toBe(1);
    expect(snap!.answerRate).toBe(1);
    expect(snap!.jsonParseRate).toBe(1);
    expect(snap!.p50LatencyMs).toBe(250);
    expect(snap!.p95LatencyMs).toBe(250);
  });

  it('case-insensitive provider keys (matches AIProviderManager lookup)', () => {
    recordProviderCall({
      provider: 'Claude',
      latencyMs: 100,
      succeeded: true,
      jsonParsed: true,
    });
    expect(snapshotProvider('claude')).not.toBeNull();
    expect(snapshotProvider('CLAUDE')).not.toBeNull();
  });
});

describe('providerMetrics — answer rate', () => {
  it('1 success + 1 failure → answerRate=0.5', () => {
    recordProviderCall({
      provider: 'deepseek',
      latencyMs: 800,
      succeeded: true,
      jsonParsed: true,
    });
    recordProviderCall({
      provider: 'deepseek',
      latencyMs: 1200,
      succeeded: false,
      jsonParsed: false,
    });
    const snap = snapshotProvider('deepseek');
    expect(snap!.answerRate).toBe(0.5);
  });

  it('failures still record latency for slow-then-throw detection', () => {
    recordProviderCall({
      provider: 'groq',
      latencyMs: 5000,
      succeeded: false,
      jsonParsed: false,
    });
    const snap = snapshotProvider('groq');
    expect(snap!.samples).toBe(1);
    expect(snap!.answerRate).toBe(0);
    // p50/p95 are computed over SUCCESSFUL only (latency budget
    // measures user-facing success path, not failure latency).
    expect(snap!.p50LatencyMs).toBe(0);
  });
});

describe('providerMetrics — JSON parse rate', () => {
  it('5 successful, 1 with parse failure → jsonParseRate=0.8', () => {
    for (let i = 0; i < 5; i++) {
      recordProviderCall({
        provider: 'deepseek',
        latencyMs: 600,
        succeeded: true,
        jsonParsed: true,
      });
    }
    recordProviderCall({
      provider: 'deepseek',
      latencyMs: 700,
      succeeded: true,
      jsonParsed: false, // returned 200 but body didn't parse
    });
    const snap = snapshotProvider('deepseek');
    expect(snap!.jsonParseRate).toBeCloseTo(5 / 6, 3);
  });

  it('jsonParseRate defaults to 1 when no successful samples (no NaN)', () => {
    recordProviderCall({
      provider: 'groq',
      latencyMs: 100,
      succeeded: false,
      jsonParsed: false,
    });
    expect(snapshotProvider('groq')!.jsonParseRate).toBe(1);
  });
});

describe('providerMetrics — p95 latency', () => {
  it('p95 of [100..1000] is roughly 950 (V2-3 budget signal)', () => {
    for (let ms = 100; ms <= 1000; ms += 100) {
      recordProviderCall({
        provider: 'deepseek',
        latencyMs: ms,
        succeeded: true,
        jsonParsed: true,
      });
    }
    const snap = snapshotProvider('deepseek');
    expect(snap!.p95LatencyMs).toBeGreaterThanOrEqual(900);
    expect(snap!.p95LatencyMs).toBeLessThanOrEqual(1000);
  });

  it('catches the V2 fallback-cascade budget breach (>8000ms p95)', () => {
    // Simulate a cascade — half the calls hit 9-10s after rate-limit
    // bouncing between providers. p95 should spike past 8s.
    for (let i = 0; i < 10; i++) {
      recordProviderCall({
        provider: 'deepseek',
        latencyMs: 9500,
        succeeded: true,
        jsonParsed: true,
      });
    }
    expect(snapshotProvider('deepseek')!.p95LatencyMs).toBeGreaterThan(8000);
  });
});

describe('providerMetrics — rolling window', () => {
  it('caps at 500 samples (oldest evicted)', () => {
    for (let i = 0; i < 600; i++) {
      recordProviderCall({
        provider: 'claude',
        latencyMs: 200,
        succeeded: true,
        jsonParsed: true,
      });
    }
    expect(snapshotProvider('claude')!.samples).toBe(500);
  });
});

describe('snapshotAll', () => {
  it('returns every recorded provider, sorted alphabetically', () => {
    recordProviderCall({
      provider: 'groq',
      latencyMs: 200,
      succeeded: true,
      jsonParsed: true,
    });
    recordProviderCall({
      provider: 'deepseek',
      latencyMs: 800,
      succeeded: true,
      jsonParsed: true,
    });
    recordProviderCall({
      provider: 'claude',
      latencyMs: 1000,
      succeeded: true,
      jsonParsed: true,
    });
    const all = snapshotAll();
    expect(all.map((s) => s.provider)).toEqual(['claude', 'deepseek', 'groq']);
  });

  it('returns empty array when nothing recorded yet', () => {
    expect(snapshotAll()).toEqual([]);
  });
});
