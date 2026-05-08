// ROADMAP 4.0 I3.3 — variable-cost telemetry per user.
//
// The alarm that prevents the freemium subsidy from turning into a death
// spiral. Sums LLM token spend per user per day, exposes a median query
// across cohorts, and fires a (no-op) alert when the cohort median crosses
// a threshold.

const mockCoachMessageFindMany = jest.fn();
const mockUserFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    coachMessage: { findMany: (...a: unknown[]) => mockCoachMessageFindMany(...a) },
    user: { findMany: (...a: unknown[]) => mockUserFindMany(...a) },
  },
}));

import {
  calculateMessageCost,
  getDailyCostForUser,
  getCohortMedianCost,
  checkCohortBudgetAlert,
  MODEL_PRICING,
  COHORT_ALERT_THRESHOLDS,
} from '../../src/services/userCostTelemetry';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculateMessageCost — pure pricing', () => {
  it('uses gemini-flash-latest pricing ($0.075/$0.30 per 1M)', () => {
    // 1M input + 1M output tokens
    const cost = calculateMessageCost({
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'gemini-flash-latest',
    });
    // 0.075 + 0.30 = $0.375
    expect(cost).toBeCloseTo(0.375, 4);
  });

  it('claude-haiku-4-5 pricing applied separately', () => {
    const cost = calculateMessageCost({
      promptTokens: 100_000,
      completionTokens: 50_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-haiku-4-5-20251001',
    });
    expect(cost).toBeGreaterThan(0);
    // Haiku is more expensive than Gemini Flash for the same tokens
    const gemini = calculateMessageCost({
      promptTokens: 100_000,
      completionTokens: 50_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'gemini-flash-latest',
    });
    expect(cost).toBeGreaterThan(gemini);
  });

  it('cache reads price at the input rate (not free) but cheaper than fresh input', () => {
    const fresh = calculateMessageCost({
      promptTokens: 100_000,
      completionTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-6',
    });
    const cached = calculateMessageCost({
      promptTokens: 0,
      completionTokens: 0,
      cacheReadTokens: 100_000,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-6',
    });
    expect(cached).toBeGreaterThan(0);
    expect(cached).toBeLessThan(fresh);
  });

  it('zero tokens returns zero cost', () => {
    expect(
      calculateMessageCost({
        promptTokens: 0,
        completionTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        model: 'gemini-flash-latest',
      }),
    ).toBe(0);
  });

  it('null/unknown model falls back to a documented default (no crash)', () => {
    const cost = calculateMessageCost({
      promptTokens: 1000,
      completionTokens: 1000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: null,
    });
    expect(cost).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(cost)).toBe(true);
  });

  it('exposes MODEL_PRICING for cap-test inspection', () => {
    expect(MODEL_PRICING['gemini-flash-latest']).toBeDefined();
    expect(MODEL_PRICING['gemini-flash-latest'].input).toBeGreaterThan(0);
    expect(MODEL_PRICING['gemini-flash-latest'].output).toBeGreaterThan(
      MODEL_PRICING['gemini-flash-latest'].input,
    );
  });
});

describe('getDailyCostForUser', () => {
  it('sums all messages in the user-day window', async () => {
    mockCoachMessageFindMany.mockResolvedValue([
      {
        promptTokens: 1000,
        completionTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelUsed: 'gemini-flash-latest',
      },
      {
        promptTokens: 2000,
        completionTokens: 1000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelUsed: 'gemini-flash-latest',
      },
    ]);

    const result = await getDailyCostForUser({
      userId: 'u1',
      dayUTC: new Date('2026-05-08T00:00:00Z'),
    });

    expect(result.totalUsd).toBeGreaterThan(0);
    expect(result.messageCount).toBe(2);
    expect(result.totalTokens.input).toBe(3000);
    expect(result.totalTokens.output).toBe(1500);
  });

  it('returns zero when user had no messages that day', async () => {
    mockCoachMessageFindMany.mockResolvedValue([]);
    const result = await getDailyCostForUser({
      userId: 'u1',
      dayUTC: new Date('2026-05-08T00:00:00Z'),
    });
    expect(result.totalUsd).toBe(0);
    expect(result.messageCount).toBe(0);
  });

  it('queries the [start, end) UTC window for the day', async () => {
    mockCoachMessageFindMany.mockResolvedValue([]);
    await getDailyCostForUser({
      userId: 'u1',
      dayUTC: new Date('2026-05-08T15:30:00Z'),
    });
    const call = mockCoachMessageFindMany.mock.calls[0][0];
    const start = call.where.createdAt.gte;
    const end = call.where.createdAt.lt;
    expect(start.toISOString()).toBe('2026-05-08T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-09T00:00:00.000Z');
    expect(call.where.userId).toBe('u1');
  });

  it('rejects empty userId', async () => {
    await expect(
      getDailyCostForUser({ userId: '', dayUTC: new Date() }),
    ).rejects.toThrow(/userId/i);
  });
});

describe('getCohortMedianCost', () => {
  it('returns the median monthly cost across users in the cohort', async () => {
    // 5 free users — daily costs aggregated over 30 days yield monthly totals
    // Costs in dollars per user per month: $0.05, $0.10, $0.15, $0.20, $0.30
    // Median = $0.15
    mockUserFindMany.mockResolvedValue([
      { id: 'u1' },
      { id: 'u2' },
      { id: 'u3' },
      { id: 'u4' },
      { id: 'u5' },
    ]);

    // Each user's findMany returns messages summing to N tokens
    const monthlyCostByUser: Record<string, number> = {
      u1: 0.05,
      u2: 0.10,
      u3: 0.15,
      u4: 0.20,
      u5: 0.30,
    };

    mockCoachMessageFindMany.mockImplementation(({ where }: { where: { userId: string } }) => {
      const target = monthlyCostByUser[where.userId];
      // Choose tokens so cost ≈ target. Gemini Flash output is $0.30/1M.
      const outputTokens = Math.round((target / 0.3) * 1_000_000);
      return Promise.resolve([
        {
          promptTokens: 0,
          completionTokens: outputTokens,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          modelUsed: 'gemini-flash-latest',
        },
      ]);
    });

    const result = await getCohortMedianCost({
      tier: 'free',
      windowDays: 30,
      asOf: new Date('2026-05-08T00:00:00Z'),
    });

    expect(result.sampleSize).toBe(5);
    expect(result.medianUsd).toBeCloseTo(0.15, 2);
    expect(result.windowDays).toBe(30);
  });

  it('returns null median when no users in cohort', async () => {
    mockUserFindMany.mockResolvedValue([]);
    const result = await getCohortMedianCost({
      tier: 'free',
      windowDays: 30,
      asOf: new Date(),
    });
    expect(result.medianUsd).toBeNull();
    expect(result.sampleSize).toBe(0);
  });

  it('filters by tier in the user query', async () => {
    mockUserFindMany.mockResolvedValue([]);
    await getCohortMedianCost({ tier: 'free', windowDays: 30, asOf: new Date() });
    const call = mockUserFindMany.mock.calls[0][0];
    expect(call.where.subscriptionStatus).not.toBe('active');
  });
});

describe('checkCohortBudgetAlert', () => {
  it('reports breached=true when median exceeds threshold', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'u1' }]);
    mockCoachMessageFindMany.mockResolvedValue([
      {
        // ~$0.60/month — over the $0.50 threshold
        promptTokens: 0,
        completionTokens: 2_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelUsed: 'gemini-flash-latest',
      },
    ]);

    const result = await checkCohortBudgetAlert({
      tier: 'free',
      asOf: new Date('2026-05-08T00:00:00Z'),
    });

    expect(result.breached).toBe(true);
    expect(result.medianUsd).toBeGreaterThan(COHORT_ALERT_THRESHOLDS.free);
    expect(result.threshold).toBe(COHORT_ALERT_THRESHOLDS.free);
  });

  it('reports breached=false when median is under threshold', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'u1' }]);
    mockCoachMessageFindMany.mockResolvedValue([
      {
        // tiny spend
        promptTokens: 100,
        completionTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelUsed: 'gemini-flash-latest',
      },
    ]);

    const result = await checkCohortBudgetAlert({
      tier: 'free',
      asOf: new Date(),
    });

    expect(result.breached).toBe(false);
  });

  it('reports breached=false when sample size is empty (cannot conclude)', async () => {
    mockUserFindMany.mockResolvedValue([]);
    const result = await checkCohortBudgetAlert({
      tier: 'free',
      asOf: new Date(),
    });
    expect(result.breached).toBe(false);
    expect(result.sampleSize).toBe(0);
  });

  it('exposes thresholds for cap-test inspection', () => {
    expect(COHORT_ALERT_THRESHOLDS.free).toBeGreaterThan(0);
    // Free threshold tighter than premium
    expect(COHORT_ALERT_THRESHOLDS.free).toBeLessThan(
      COHORT_ALERT_THRESHOLDS.premium,
    );
  });
});
