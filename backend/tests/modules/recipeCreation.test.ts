// backend/tests/modules/recipeCreation.test.ts
// Tests for generateFromDescription and forkRecipe controller methods.

jest.mock('../../src/services/healthifyService', () => ({
  healthifyService: {
    healthifyRecipe: jest.fn().mockResolvedValue({}),
    generateHealthMetrics: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../src/services/flavorBoostService', () => ({
  flavorBoostService: { boost: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../src/services/substitutionService', () => ({
  substitutionService: {
    getSubstitutions: jest.fn().mockResolvedValue([]),
    applySubstitution: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: {
    generateFromDescription: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { recipeController } from '../../src/modules/recipe/recipeController';
import { aiRecipeService } from '../../src/services/aiRecipeService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGenerateFromDescription = aiRecipeService.generateFromDescription as jest.Mock;

function makeReq(overrides: Partial<Request> = {}, user = { id: 'user-1' }): Partial<Request> {
  return { body: {}, params: {}, query: {}, user, ...overrides } as any;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

const GENERATED_RECIPE = {
  title: 'Oat Protein Pancakes with Chia Seeds',
  description: 'High-protein breakfast pancakes loaded with oats and chia seeds.',
  cuisine: 'American',
  mealType: 'breakfast',
  cookTime: 15,
  difficulty: 'easy',
  servings: 2,
  calories: 350,
  protein: 28,
  carbs: 40,
  fat: 8,
  fiber: 6,
  ingredients: [
    { amount: '1', unit: 'cup', name: 'rolled oats' },
    { amount: '1', unit: 'scoop', name: 'vanilla protein powder' },
    { amount: '2', unit: 'tbsp', name: 'chia seeds' },
    { amount: '2', unit: '', name: 'egg whites' },
  ],
  instructions: [
    { instruction: 'Blend oats into flour.' },
    { instruction: 'Mix all ingredients.' },
    { instruction: 'Cook pancakes on medium heat.' },
  ],
  tips: ['Top with berries for extra antioxidants'],
  tags: ['high-protein', 'breakfast'],
};

describe('generateFromDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateFromDescription.mockResolvedValue(GENERATED_RECIPE);
  });

  it('returns valid recipe from "oat protein pancakes with chia seeds"', async () => {
    const { res, json } = makeRes();
    await recipeController.generateFromDescription(
      makeReq({ body: { description: 'oat protein pancakes with chia seeds' } }) as Request,
      res as Response,
    );

    expect(mockGenerateFromDescription).toHaveBeenCalledWith('oat protein pancakes with chia seeds');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          recipe: expect.objectContaining({
            title: 'Oat Protein Pancakes with Chia Seeds',
            calories: 350,
            protein: 28,
            ingredients: expect.arrayContaining([
              expect.stringContaining('chia seeds'),
            ]),
            instructions: expect.arrayContaining([
              expect.stringContaining('Blend'),
            ]),
          }),
        }),
      }),
    );
  });

  it('returns 400 when description is missing', async () => {
    const { res, status } = makeRes();
    await recipeController.generateFromDescription(
      makeReq({ body: {} }) as Request,
      res as Response,
    );
    expect(status).toHaveBeenCalledWith(400);
  });
});

const ORIGINAL_RECIPE = {
  id: 'recipe-original',
  userId: null,
  isUserCreated: false,
  title: 'Classic Grilled Chicken',
  description: 'Simple grilled chicken breast',
  cookTime: 25,
  cuisine: 'American',
  mealType: 'dinner',
  difficulty: 'easy',
  servings: 2,
  calories: 350,
  protein: 42,
  carbs: 5,
  fat: 12,
  fiber: 1,
  imageUrl: null,
  ingredients: [
    { id: 'ing-1', text: 'chicken breast', order: 0 },
    { id: 'ing-2', text: 'olive oil', order: 1 },
    { id: 'ing-3', text: 'garlic', order: 2 },
  ],
  instructions: [
    { id: 'ins-1', step: 1, text: 'Season chicken.' },
    { id: 'ins-2', step: 2, text: 'Grill for 6 minutes per side.' },
  ],
};

describe('forkRecipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.recipe.findUnique as jest.Mock)
      .mockResolvedValueOnce(ORIGINAL_RECIPE) // first call: find original
      .mockResolvedValueOnce({ ...ORIGINAL_RECIPE, id: 'recipe-forked', userId: 'user-1', isUserCreated: true }); // second call: return full forked
    (mockPrisma.recipe.create as jest.Mock).mockResolvedValue({
      ...ORIGINAL_RECIPE,
      id: 'recipe-forked',
      userId: 'user-1',
      isUserCreated: true,
      parentRecipeId: 'recipe-original',
    });
    (mockPrisma.recipeInstruction.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.savedRecipe.create as jest.Mock).mockResolvedValue({});
  });

  it('creates user-owned copy with isUserCreated: true', async () => {
    const { res, json } = makeRes();
    await recipeController.forkRecipe(
      makeReq({ params: { id: 'recipe-original' }, body: {} }) as Request,
      res as Response,
    );

    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          isUserCreated: true,
          parentRecipeId: 'recipe-original',
        }),
      }),
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('preserves original ingredients, instructions, and macros', async () => {
    const { res } = makeRes();
    await recipeController.forkRecipe(
      makeReq({ params: { id: 'recipe-original' }, body: {} }) as Request,
      res as Response,
    );

    const createCall = (mockPrisma.recipe.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.calories).toBe(350);
    expect(createCall.data.protein).toBe(42);
    expect(createCall.data.carbs).toBe(5);
    expect(createCall.data.fat).toBe(12);
    expect(createCall.data.ingredients.create).toHaveLength(3);
    expect(createCall.data.ingredients.create[0].text).toBe('chicken breast');

    // Instructions are created separately
    expect(mockPrisma.recipeInstruction.create).toHaveBeenCalledTimes(2);
  });

  it('forked recipe has a new ID distinct from original', async () => {
    const { res, json } = makeRes();
    await recipeController.forkRecipe(
      makeReq({ params: { id: 'recipe-original' }, body: {} }) as Request,
      res as Response,
    );

    const createCall = (mockPrisma.recipe.create as jest.Mock).mock.calls[0][0];
    // No id in create data — Prisma auto-generates
    expect(createCall.data.id).toBeUndefined();

    const response = json.mock.calls[0][0];
    expect(response.data.id).not.toBe('recipe-original');
  });

  it('returns 404 when recipe not found', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockReset();
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

    const { res, status } = makeRes();
    await recipeController.forkRecipe(
      makeReq({ params: { id: 'nonexistent' }, body: {} }) as Request,
      res as Response,
    );
    expect(status).toHaveBeenCalledWith(404);
  });
});
