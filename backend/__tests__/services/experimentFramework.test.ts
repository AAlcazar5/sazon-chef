// backend/__tests__/services/experimentFramework.test.ts
// ROADMAP 4.0 Tier B4 — Algorithmic A/B framework (TDD).

import {
  getVariant,
  getExperimentResults,
  registerExperiment,
  resetExperimentRegistryForTesting,
} from '../../src/services/experimentFramework';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  resetExperimentRegistryForTesting();
  if (!mockPrisma.surfaceYieldSnapshot) {
    mockPrisma.surfaceYieldSnapshot = { findMany: jest.fn() };
  } else {
    mockPrisma.surfaceYieldSnapshot.findMany = jest.fn();
  }
});

describe('getVariant — deterministic bucketing', () => {
  it('returns the same variant for the same (experimentId, userId) on repeated calls', () => {
    registerExperiment({ id: 'exp1', variants: ['baseline', 'experiment_X'] });
    const a = getVariant('exp1', 'user-a');
    const b = getVariant('exp1', 'user-a');
    const c = getVariant('exp1', 'user-a');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('different users CAN land in different variants for the same experiment', () => {
    registerExperiment({ id: 'exp1', variants: ['baseline', 'experiment_X'] });
    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      variants.add(getVariant('exp1', `user-${i}`));
    }
    // Across 100 users we expect to see both buckets at least once
    expect(variants.size).toBe(2);
  });

  it('the same user can land in different variants across DIFFERENT experiments', () => {
    registerExperiment({ id: 'exp1', variants: ['a', 'b'] });
    registerExperiment({ id: 'exp2', variants: ['a', 'b'] });
    // Just confirms experiments are independently bucketed; we don't
    // require divergence per user across experiments, only that the
    // experimentId enters the hash so it's possible.
    const counts = { same: 0, different: 0 };
    for (let i = 0; i < 1000; i++) {
      const v1 = getVariant('exp1', `user-${i}`);
      const v2 = getVariant('exp2', `user-${i}`);
      if (v1 === v2) counts.same += 1;
      else counts.different += 1;
    }
    expect(counts.different).toBeGreaterThan(0);
  });

  it('produces a roughly uniform distribution across 1000 users (2 variants ≈ 50/50, ±10%)', () => {
    registerExperiment({ id: 'exp1', variants: ['a', 'b'] });
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[getVariant('exp1', `user-${i}`)] += 1;
    }
    expect(counts.a).toBeGreaterThan(400);
    expect(counts.a).toBeLessThan(600);
    expect(counts.b).toBeGreaterThan(400);
    expect(counts.b).toBeLessThan(600);
    expect(counts.a + counts.b).toBe(1000);
  });

  it('produces a roughly uniform distribution across 3 variants (≈33/33/33, ±15%)', () => {
    registerExperiment({ id: 'exp3', variants: ['a', 'b', 'c'] });
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 1500; i++) {
      counts[getVariant('exp3', `user-${i}`)] += 1;
    }
    Object.values(counts).forEach((c) => {
      expect(c).toBeGreaterThan(350);
      expect(c).toBeLessThan(650);
    });
  });

  it('throws when the experimentId is not registered', () => {
    expect(() => getVariant('unknown-exp', 'user-x')).toThrow(/registered/i);
  });

  it('throws when registering an experiment with fewer than 2 variants', () => {
    expect(() => registerExperiment({ id: 'bad', variants: ['only-one'] })).toThrow(/variants/i);
  });

  it('throws when registering an experiment with duplicate variants', () => {
    expect(() => registerExperiment({ id: 'bad', variants: ['a', 'a'] })).toThrow(/duplicate/i);
  });
});

describe('getExperimentResults', () => {
  it('reads per-variant yields from SurfaceYieldSnapshot (B3 pipeline)', async () => {
    mockPrisma.surfaceYieldSnapshot.findMany.mockResolvedValue([
      {
        surface: 'today_hero',
        asOfDate: new Date('2026-05-04'),
        variant: 'baseline',
        impressions: 1000,
        taps: 200,
        cooks: 80,
        rates: 40,
        signalYield: 0.12,
      },
      {
        surface: 'today_hero',
        asOfDate: new Date('2026-05-04'),
        variant: 'experiment_X',
        impressions: 1000,
        taps: 240,
        cooks: 100,
        rates: 60,
        signalYield: 0.16,
      },
    ]);

    registerExperiment({
      id: 'today-rerank',
      variants: ['baseline', 'experiment_X'],
      surface: 'today_hero',
    });

    const results = await getExperimentResults({
      experimentId: 'today-rerank',
      asOfDate: new Date('2026-05-04'),
    });

    expect(results.experimentId).toBe('today-rerank');
    expect(results.surface).toBe('today_hero');
    expect(results.variants).toHaveLength(2);
    const baseline = results.variants.find((v) => v.variant === 'baseline');
    const exp = results.variants.find((v) => v.variant === 'experiment_X');
    expect(baseline?.signalYield).toBeCloseTo(0.12, 5);
    expect(exp?.signalYield).toBeCloseTo(0.16, 5);
    // experiment_X has higher yield → reported as winner
    expect(results.winner).toBe('experiment_X');
  });

  it('returns winner=null when only one variant has data', async () => {
    mockPrisma.surfaceYieldSnapshot.findMany.mockResolvedValue([
      {
        surface: 'today_hero',
        asOfDate: new Date('2026-05-04'),
        variant: 'baseline',
        impressions: 1000,
        taps: 200,
        cooks: 80,
        rates: 40,
        signalYield: 0.12,
      },
    ]);
    registerExperiment({
      id: 'today-rerank',
      variants: ['baseline', 'experiment_X'],
      surface: 'today_hero',
    });

    const results = await getExperimentResults({
      experimentId: 'today-rerank',
      asOfDate: new Date('2026-05-04'),
    });
    expect(results.winner).toBeNull();
  });

  it('throws when the experiment is not registered', async () => {
    await expect(
      getExperimentResults({
        experimentId: 'no-such-exp',
        asOfDate: new Date(),
      })
    ).rejects.toThrow(/registered/i);
  });

  it('throws when the experiment has no surface tied to it', async () => {
    registerExperiment({
      id: 'no-surface',
      variants: ['a', 'b'],
      // surface omitted
    });
    await expect(
      getExperimentResults({ experimentId: 'no-surface', asOfDate: new Date() })
    ).rejects.toThrow(/surface/i);
  });
});
