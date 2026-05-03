// backend/__tests__/services/recentPlatesService.test.ts

const mockComposedPlateFindMany = jest.fn();
const mockMealComponentFindMany = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    composedPlate: { findMany: (...args: unknown[]) => mockComposedPlateFindMany(...args) },
    mealComponent: { findMany: (...args: unknown[]) => mockMealComponentFindMany(...args) },
  },
}));

import { computeWeeklyPlateSummary } from '../../src/services/recentPlatesService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('computeWeeklyPlateSummary', () => {
  it('returns zeros when no plates this week', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([]);
    const result = await computeWeeklyPlateSummary('user-1');
    expect(result).toEqual({ totalPlatesThisWeek: 0, greenVegCount: 0 });
    expect(mockMealComponentFindMany).not.toHaveBeenCalled();
  });

  it('counts plates with no vegetables but no green count', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([
      { componentIds: JSON.stringify([{ slot: 'protein', componentId: 'p_salmon' }]) },
      { componentIds: JSON.stringify([{ slot: 'base', componentId: 'b_farro' }]) },
    ]);
    const result = await computeWeeklyPlateSummary('user-1');
    expect(result).toEqual({ totalPlatesThisWeek: 2, greenVegCount: 0 });
  });

  it('counts greens by name match (spinach, broccoli, kale)', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([
      {
        componentIds: JSON.stringify([
          { slot: 'protein', componentId: 'p_salmon' },
          { slot: 'vegetable', componentId: 'v_spinach' },
        ]),
      },
      {
        componentIds: JSON.stringify([
          { slot: 'vegetable', componentId: 'v_broccoli' },
        ]),
      },
      {
        componentIds: JSON.stringify([
          { slot: 'vegetable', componentId: 'v_carrots' },
        ]),
      },
    ]);
    mockMealComponentFindMany.mockResolvedValueOnce([
      { id: 'v_spinach', name: 'Sautéed Spinach' },
      { id: 'v_broccoli', name: 'Roasted Broccoli' },
      { id: 'v_carrots', name: 'Roasted Carrots' },
    ]);
    const result = await computeWeeklyPlateSummary('user-1');
    expect(result.totalPlatesThisWeek).toBe(3);
    expect(result.greenVegCount).toBe(2);
  });

  it('counts repeated greens across plates', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([
      { componentIds: JSON.stringify([{ slot: 'vegetable', componentId: 'v_kale' }]) },
      { componentIds: JSON.stringify([{ slot: 'vegetable', componentId: 'v_kale' }]) },
    ]);
    mockMealComponentFindMany.mockResolvedValueOnce([{ id: 'v_kale', name: 'Massaged Kale' }]);
    const result = await computeWeeklyPlateSummary('user-1');
    expect(result.greenVegCount).toBe(2);
  });

  it('skips malformed componentIds JSON without crashing', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([
      { componentIds: '{not json' },
      { componentIds: JSON.stringify([{ slot: 'vegetable', componentId: 'v_spinach' }]) },
    ]);
    mockMealComponentFindMany.mockResolvedValueOnce([{ id: 'v_spinach', name: 'Spinach' }]);
    const result = await computeWeeklyPlateSummary('user-1');
    expect(result.totalPlatesThisWeek).toBe(2);
    expect(result.greenVegCount).toBe(1);
  });

  it('queries plates from the last 7 days for the user', async () => {
    mockComposedPlateFindMany.mockResolvedValueOnce([]);
    await computeWeeklyPlateSummary('user-42');
    const call = mockComposedPlateFindMany.mock.calls[0][0];
    expect(call.where.userId).toBe('user-42');
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    const ageMs = Date.now() - call.where.createdAt.gte.getTime();
    expect(ageMs).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
    expect(ageMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
  });
});
