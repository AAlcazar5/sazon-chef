// Phase 8 (10Y-E): Pro daily token-budget ceiling.

const mockAggregate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    coachMessage: {
      aggregate: (...a: unknown[]) => mockAggregate(...a),
    },
  },
}));

import {
  dailyTokenBudget,
  getDailyTokenUsage,
  selectModelWithBudget,
  COST_CEILING_NOTICE_TEXT,
} from '../../src/services/coachCostCeilingService';
import { COACH_MODELS } from '../../src/services/coachService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDailyTokenUsage', () => {
  it('reads coachMessage.aggregate _sum and combines promptTokens + cacheReadTokens for input', async () => {
    mockAggregate.mockResolvedValue({
      _sum: {
        promptTokens: 100_000,
        cacheReadTokens: 250_000,
        completionTokens: 40_000,
      },
    });
    const usage = await getDailyTokenUsage('user-1');
    expect(usage.input).toBe(350_000);
    expect(usage.output).toBe(40_000);
  });

  it('uses UTC midnight as the lower bound (not local-time midnight)', async () => {
    mockAggregate.mockResolvedValue({
      _sum: { promptTokens: 0, cacheReadTokens: 0, completionTokens: 0 },
    });
    await getDailyTokenUsage('user-1');
    const args = mockAggregate.mock.calls[0][0];
    const since: Date = args.where.createdAt.gte;
    expect(since.getUTCHours()).toBe(0);
    expect(since.getUTCMinutes()).toBe(0);
    expect(since.getUTCSeconds()).toBe(0);
  });

  it('treats null _sum fields as 0', async () => {
    mockAggregate.mockResolvedValue({ _sum: {} });
    const usage = await getDailyTokenUsage('user-1');
    expect(usage.input).toBe(0);
    expect(usage.output).toBe(0);
  });
});

describe('selectModelWithBudget', () => {
  it('Pro at 95% input usage → keeps Opus, no notice', async () => {
    mockAggregate.mockResolvedValue({
      _sum: {
        promptTokens: Math.floor(dailyTokenBudget.input * 0.95),
        cacheReadTokens: 0,
        completionTokens: Math.floor(dailyTokenBudget.output * 0.5),
      },
    });
    const result = await selectModelWithBudget({
      userId: 'user-pro',
      defaultModel: COACH_MODELS.premium,
    });
    expect(result.model).toBe(COACH_MODELS.premium);
    expect(result.notice).toBeNull();
    expect(result.overBudget).toBe(false);
  });

  it('Pro at 105% input usage → downgrades to Sonnet, returns notice', async () => {
    mockAggregate.mockResolvedValue({
      _sum: {
        promptTokens: Math.floor(dailyTokenBudget.input * 1.05),
        cacheReadTokens: 0,
        completionTokens: 0,
      },
    });
    const result = await selectModelWithBudget({
      userId: 'user-pro',
      defaultModel: COACH_MODELS.premium,
    });
    expect(result.model).toBe(COACH_MODELS.free);
    expect(result.notice).toBe(COST_CEILING_NOTICE_TEXT);
    expect(result.overBudget).toBe(true);
  });

  it('Pro at 105% output usage → downgrades to Sonnet, returns notice', async () => {
    mockAggregate.mockResolvedValue({
      _sum: {
        promptTokens: 0,
        cacheReadTokens: 0,
        completionTokens: Math.floor(dailyTokenBudget.output * 1.05),
      },
    });
    const result = await selectModelWithBudget({
      userId: 'user-pro',
      defaultModel: COACH_MODELS.premium,
    });
    expect(result.model).toBe(COACH_MODELS.free);
    expect(result.notice).toBe(COST_CEILING_NOTICE_TEXT);
    expect(result.overBudget).toBe(true);
  });

  it('combined cacheReadTokens + promptTokens push input over budget', async () => {
    mockAggregate.mockResolvedValue({
      _sum: {
        promptTokens: Math.floor(dailyTokenBudget.input * 0.6),
        cacheReadTokens: Math.floor(dailyTokenBudget.input * 0.5),
        completionTokens: 0,
      },
    });
    const result = await selectModelWithBudget({
      userId: 'user-pro',
      defaultModel: COACH_MODELS.premium,
    });
    expect(result.overBudget).toBe(true);
    expect(result.model).toBe(COACH_MODELS.free);
  });
});
