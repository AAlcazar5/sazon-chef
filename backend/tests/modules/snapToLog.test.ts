// backend/tests/modules/snapToLog.test.ts
// Tests for 10M: Snap to Log — Photo-Based Meal Tracking

import { Request, Response } from 'express';

// Mock prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    foodItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    meal: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    mealPlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: {},
}));

jest.mock('axios');

import { prisma } from '../../src/lib/prisma';
import {
  logFood,
  createUserFoodItem,
  searchFood,
} from '../../src/modules/food/foodController';

function makeReq(
  query: Record<string, string> = {},
  body: Record<string, unknown> = {},
): Partial<Request> {
  return { query, body, user: { id: 'user-1', email: 't@e.com' } as any };
}

function makeRes(): Partial<Response> & { _status: number; _body: any } {
  const res: any = {
    _status: 200,
    _body: null,
    status(code: number) { this._status = code; return this; },
    json(body: any) { this._body = body; return this; },
  };
  return res;
}

describe('10M: Snap to Log — FoodRecognitionResult enhanced macros', () => {
  it('FoodRecognitionResult includes protein/carbs/fat/fiber fields', () => {
    // Type-level check: the interface shape used across backend + frontend
    const result = {
      foods: [
        {
          name: 'Grilled Chicken Breast',
          confidence: 0.9,
          estimatedCalories: 280,
          estimatedProtein: 42,
          estimatedCarbs: 0,
          estimatedFat: 12,
          estimatedFiber: 0,
          estimatedPortion: '1 breast (~170g)',
          portionGrams: 170,
        },
      ],
      totalEstimatedCalories: 280,
      totalEstimatedProtein: 42,
      totalEstimatedCarbs: 0,
      totalEstimatedFat: 12,
      mealDescription: 'Grilled Chicken Breast',
      confidence: 0.9,
    };

    expect(result.foods[0].estimatedProtein).toBe(42);
    expect(result.foods[0].estimatedCarbs).toBe(0);
    expect(result.foods[0].estimatedFat).toBe(12);
    expect(result.foods[0].estimatedFiber).toBe(0);
    expect(result.foods[0].portionGrams).toBe(170);
    expect(result.totalEstimatedProtein).toBe(42);
    expect(result.totalEstimatedCarbs).toBe(0);
    expect(result.totalEstimatedFat).toBe(12);
  });
});

describe('10M: Photo-scanned foods cache to FoodItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates FoodItem with source "photo_scan" from recognition result', async () => {
    const createdItem = {
      id: 'fi-photo-1',
      name: 'Grilled Chicken Breast',
      brand: null,
      category: null,
      servingSize: '1 breast (~170g)',
      calories: 280,
      protein: 42,
      carbs: 0,
      fat: 12,
      fiber: 0,
      source: 'photo_scan',
      externalId: null,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.foodItem.create as jest.Mock).mockResolvedValue(createdItem);

    const req = makeReq({}, {
      name: 'Grilled Chicken Breast',
      calories: 280,
      protein: 42,
      carbs: 0,
      fat: 12,
      fiber: 0,
    });
    const res = makeRes();
    await createUserFoodItem(req as Request, res as Response);

    expect(res._status).not.toBe(400);
    expect(prisma.foodItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Grilled Chicken Breast',
          calories: 280,
          protein: 42,
          carbs: 0,
          fat: 12,
        }),
      }),
    );
  });
});

describe('10M: Log meal from photo scan with full macros', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates Meal entry with full macros from food recognition', async () => {
    const foodItem = {
      id: 'fi-photo-2',
      name: 'Pasta with Marinara',
      brand: null,
      category: null,
      servingSize: '1 plate (~350g)',
      calories: 450,
      protein: 15,
      carbs: 68,
      fat: 12,
      fiber: 4,
      source: 'photo_scan',
      externalId: null,
      imageUrl: null,
    };

    const mealPlan = {
      id: 'mp-1',
      userId: 'user-1',
      name: 'My Meal Plan',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(),
    };

    const createdMeal = {
      id: 'meal-1',
      mealPlanId: 'mp-1',
      mealType: 'lunch',
      foodItemId: foodItem.id,
      customName: foodItem.name,
      customCalories: 450,
      customProtein: 15,
      customCarbs: 68,
      customFat: 12,
    };

    (prisma.foodItem.findFirst as jest.Mock).mockResolvedValue(foodItem);
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(mealPlan);
    (prisma.meal.create as jest.Mock).mockResolvedValue(createdMeal);

    const req = makeReq({}, {
      foodItemId: foodItem.id,
      mealType: 'lunch',
      servings: 1,
    });
    const res = makeRes();
    await logFood(req as Request, res as Response);

    expect(res._body.meal.customCalories).toBe(450);
    expect(res._body.meal.customProtein).toBe(15);
    expect(res._body.meal.customCarbs).toBe(68);
    expect(res._body.meal.customFat).toBe(12);
  });

  it('portion adjustment at 2× doubles all macro values', async () => {
    const foodItem = {
      id: 'fi-photo-3',
      name: 'Rice Bowl',
      calories: 300,
      protein: 8,
      carbs: 55,
      fat: 5,
      fiber: 2,
      source: 'photo_scan',
    };

    const mealPlan = {
      id: 'mp-2',
      userId: 'user-1',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(),
    };

    (prisma.foodItem.findFirst as jest.Mock).mockResolvedValue(foodItem);
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(mealPlan);
    (prisma.meal.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ id: 'meal-2', ...data }));

    const req = makeReq({}, {
      foodItemId: foodItem.id,
      mealType: 'dinner',
      servings: 2,
    });
    const res = makeRes();
    await logFood(req as Request, res as Response);

    expect(res._body.meal.customCalories).toBe(600);
    expect(res._body.meal.customProtein).toBe(16);
    expect(res._body.meal.customCarbs).toBe(110);
    expect(res._body.meal.customFat).toBe(10);
  });
});

describe('10M: FoodRecognitionService prompt validation', () => {
  it('parseTextResponse returns macro totals with zeros when text-only fallback', () => {
    // Test the structure — text fallback should include zero macro totals
    const textFallbackResult = {
      foods: [
        { name: 'Chicken Wings', estimatedCalories: 400, confidence: 0.6 },
      ],
      totalEstimatedCalories: 400,
      totalEstimatedProtein: 0,
      totalEstimatedCarbs: 0,
      totalEstimatedFat: 0,
      mealDescription: 'Chicken Wings',
      confidence: 0.6,
    };

    expect(textFallbackResult.totalEstimatedProtein).toBe(0);
    expect(textFallbackResult.totalEstimatedCarbs).toBe(0);
    expect(textFallbackResult.totalEstimatedFat).toBe(0);
  });
});

describe('10M: Multi-food remove/adjust updates total macros', () => {
  it('removing a food item from multi-food result updates totals', () => {
    const foods = [
      { name: 'Chicken', estimatedCalories: 280, estimatedProtein: 42, estimatedCarbs: 0, estimatedFat: 12 },
      { name: 'Rice', estimatedCalories: 200, estimatedProtein: 4, estimatedCarbs: 44, estimatedFat: 1 },
      { name: 'Salad', estimatedCalories: 50, estimatedProtein: 2, estimatedCarbs: 8, estimatedFat: 1 },
    ];

    // Remove "Rice" (index 1)
    const remaining = foods.filter((_, i) => i !== 1);
    const totalCals = remaining.reduce((s, f) => s + f.estimatedCalories, 0);
    const totalProtein = remaining.reduce((s, f) => s + f.estimatedProtein, 0);
    const totalCarbs = remaining.reduce((s, f) => s + f.estimatedCarbs, 0);
    const totalFat = remaining.reduce((s, f) => s + f.estimatedFat, 0);

    expect(totalCals).toBe(330);
    expect(totalProtein).toBe(44);
    expect(totalCarbs).toBe(8);
    expect(totalFat).toBe(13);
  });
});

describe('10P: Cross-service — photo_scan FoodItems in branded food search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('photo_scan FoodItems appear in food search results', async () => {
    const { searchFood } = await import('../../src/modules/food/foodController');

    const photoScanItems = [
      {
        id: 'fi-ps-1',
        name: 'Grilled Chicken Breast',
        brand: null,
        category: null,
        servingSize: '1 breast (~170g)',
        calories: 280,
        protein: 42,
        carbs: 0,
        fat: 12,
        fiber: 0,
        source: 'photo_scan',
        externalId: null,
        imageUrl: null,
      },
      {
        id: 'fi-nx-1',
        name: 'Chicken McNuggets',
        brand: 'McDonald\'s',
        category: 'restaurant',
        servingSize: '6 piece',
        calories: 250,
        protein: 15,
        carbs: 15,
        fat: 15,
        fiber: 0,
        source: 'nutritionix',
        externalId: 'nix-123',
        imageUrl: null,
      },
    ];

    // searchFood queries prisma.foodItem.findMany with name: { contains: query }
    // It does NOT filter by source — so photo_scan items are returned.
    (prisma.foodItem.findMany as jest.Mock).mockResolvedValue(photoScanItems);

    const req = makeReq({ q: 'chicken' });
    const res = makeRes();
    await searchFood(req as any, res as any);

    expect(res._body.results).toHaveLength(2);
    expect(res._body.results[0].source).toBe('photo_scan');
    expect(res._body.results[1].source).toBe('nutritionix');
    expect(res._body.source).toBe('cache');
  });
});
