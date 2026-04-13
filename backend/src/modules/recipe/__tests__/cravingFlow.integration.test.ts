// backend/src/modules/recipe/__tests__/cravingFlow.integration.test.ts
// Integration tests for POST /api/recipes/craving-flow.

// Mock AI-adjacent services that instantiate AIProviderManager at module load.
jest.mock('../../../services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn(), generateHealthMetrics: jest.fn() },
}));
jest.mock('../../../services/flavorBoostService', () => ({
  flavorBoostService: { boost: jest.fn() },
}));
jest.mock('../../../services/substitutionService', () => ({
  substitutionService: { getSubstitutions: jest.fn(), applySubstitution: jest.fn() },
}));
jest.mock('../../../services/cravingSearchService', () => ({
  mapCravingToSearchTerms: jest.fn().mockResolvedValue({
    searchTerms: ['pizza'],
    flavorTags: ['cheesy'],
    temperature: 'hot',
    texturePrefs: [],
  }),
  scoreCravingMatch: jest.requireActual('../../../services/cravingSearchService').scoreCravingMatch,
}));

const mockHealthifyCraving = jest.fn();
jest.mock('../../../services/cravingFlowService', () => ({
  cravingFlowService: {
    healthifyCraving: mockHealthifyCraving,
  },
}));

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { recipeController } from '../recipeController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(body: object, user: object = { id: 'user-1' }): Partial<Request> {
  return { body, user } as any;
}
function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

const sampleFlow = {
  original: { name: 'Pizza', description: '2 slices', calories: 800, protein: 35, carbs: 90, fat: 32 },
  healthified: {
    title: 'Cauliflower Crust Pizza',
    description: 'light but satisfying',
    cuisine: 'Italian',
    cookTime: 25,
    servings: 1,
    calories: 380,
    protein: 32,
    carbs: 28,
    fat: 14,
    ingredients: [{ text: 'cauliflower crust', order: 1 }],
    instructions: [{ text: 'bake', step: 1 }],
  },
  honestyNote: "Won't lie — not delivery, but it'll crush the craving.",
};

describe('POST /api/recipes/craving-flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.userPreferences.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.macroGoals as any) = { findUnique: jest.fn().mockResolvedValue(null) };
    (mockPrisma.recipe.count as jest.Mock).mockResolvedValue(5);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([]);
    mockHealthifyCraving.mockResolvedValue(sampleFlow);
  });

  it('returns 400 when craving is missing', async () => {
    const { res, status } = makeRes();
    await recipeController.cravingFlow(makeReq({}) as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when craving is empty string', async () => {
    const { res, status } = makeRes();
    await recipeController.cravingFlow(makeReq({ craving: '   ' }) as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns original + healthified + honestyNote + lighterSuggestions', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1', title: 'Flatbread Caprese', description: '', cuisine: 'Italian',
        cookTime: 15, difficulty: 'easy', createdAt: new Date(), isUserCreated: false,
        calories: 350, protein: 18, carbs: 35, fat: 12,
        ingredients: [{ text: 'flatbread' }], instructions: [{ text: 'bake' }],
      },
    ]);

    const { res, json } = makeRes();
    await recipeController.cravingFlow(
      makeReq({ craving: 'pizza' }) as Request,
      res as Response,
    );

    expect(mockHealthifyCraving).toHaveBeenCalledWith(expect.objectContaining({ craving: 'pizza' }));

    const body = json.mock.calls[0][0];
    expect(body.original.calories).toBe(800);
    expect(body.healthified.title).toBe('Cauliflower Crust Pizza');
    expect(body.honestyNote).toContain('crush the craving');
    expect(Array.isArray(body.lighterSuggestions)).toBe(true);
    expect(body.lighterSuggestions.length).toBeGreaterThan(0);
  });

  it('forwards user macro goals to cravingFlowService and uses them as calorie ceiling for lighter search', async () => {
    (mockPrisma.macroGoals as any).findUnique.mockResolvedValue({
      userId: 'user-1', calories: 2000, protein: 150, carbs: 200, fat: 65,
    });

    const { res } = makeRes();
    await recipeController.cravingFlow(
      makeReq({ craving: 'pizza' }) as Request,
      res as Response,
    );

    const serviceCall = mockHealthifyCraving.mock.calls[0][0];
    expect(serviceCall.userMacroGoals).toEqual({
      calories: 2000, protein: 150, carbs: 200, fat: 65,
    });

    // lighter search should use a calorie ceiling derived from daily goal
    const findCall = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.calories).toBeDefined();
    expect(findCall.where.calories.lte).toBeGreaterThan(0);
  });

  it('returns 500 when cravingFlowService throws', async () => {
    mockHealthifyCraving.mockRejectedValueOnce(new Error('AI down'));

    const { res, status } = makeRes();
    await recipeController.cravingFlow(
      makeReq({ craving: 'pizza' }) as Request,
      res as Response,
    );
    expect(status).toHaveBeenCalledWith(500);
  });
});
