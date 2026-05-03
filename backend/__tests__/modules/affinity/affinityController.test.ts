// Group 10R-Phase2: affinity controller integration with mocked Prisma.

const mockCookingLogFindMany = jest.fn();
const mockSavedRecipeFindMany = jest.fn();
const mockRecipeFeedbackFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockUserPhysicalProfileFindUnique = jest.fn();
const mockMealPlanFindFirst = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    savedRecipe: { findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a) },
    recipeFeedback: { findMany: (...a: unknown[]) => mockRecipeFeedbackFindMany(...a) },
    macroGoals: { findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a) },
    userPhysicalProfile: { findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a) },
    mealPlan: { findFirst: (...a: unknown[]) => mockMealPlanFindFirst(...a) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: () => 'user_test',
}));

import { Request, Response } from 'express';
import { affinityController } from '../../../src/modules/affinity/affinityController';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCookingLogFindMany.mockResolvedValue([]);
  mockSavedRecipeFindMany.mockResolvedValue([]);
  mockRecipeFeedbackFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockMealPlanFindFirst.mockResolvedValue(null);
});

describe('affinityController.getSnapshot', () => {
  it('returns the empty snapshot for a brand-new user', async () => {
    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.topAffinityIngredients).toEqual([]);
    expect(payload.rolling7dNutrientGaps).toEqual([]);
    expect(payload.last7DaysIngredients).toEqual([]);
    expect(payload.goalPhase).toBe('maintain');
  });

  it('plumbs cooking logs through the pure service', async () => {
    mockCookingLogFindMany.mockResolvedValue([
      {
        cookedAt: new Date(),
        recipe: {
          id: 'r1',
          cuisine: 'Italian',
          calories: 600,
          protein: 50,
          carbs: 40,
          fat: 20,
          fiber: 8,
          ingredients: [{ text: 'chicken breast' }, { text: 'olive oil' }],
        },
      },
    ]);

    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.topAffinityIngredients).toContain('chicken breast');
    expect(payload.last7DaysIngredients).toContain('chicken breast');
  });

  it('reflects fitness goal mapping in goalPhase', async () => {
    mockUserPhysicalProfileFindUnique.mockResolvedValue({ fitnessGoal: 'lose_weight' });
    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);
    expect((res.json as jest.Mock).mock.calls[0][0].goalPhase).toBe('cut');
  });

  it('active meal plan mode overrides fitness goal', async () => {
    mockUserPhysicalProfileFindUnique.mockResolvedValue({ fitnessGoal: 'maintain' });
    mockMealPlanFindFirst.mockResolvedValue({ planningMode: 'cut' });
    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);
    expect((res.json as jest.Mock).mock.calls[0][0].goalPhase).toBe('cut');
  });

  it('queries cookingLog with a 90-day cutoff and a 500-row cap', async () => {
    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);
    expect(mockCookingLogFindMany).toHaveBeenCalledTimes(1);
    const args = mockCookingLogFindMany.mock.calls[0][0];
    expect(args.take).toBe(500);
    expect(args.where.userId).toBe('user_test');
    expect(args.where.cookedAt.gte).toBeInstanceOf(Date);
  });

  it('returns 500 on database error', async () => {
    mockCookingLogFindMany.mockRejectedValueOnce(new Error('boom'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeRes();
    await affinityController.getSnapshot({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
    consoleSpy.mockRestore();
  });
});
