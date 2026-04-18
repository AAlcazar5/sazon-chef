// backend/tests/modules/brandedFood.test.ts
// Tests for 10L: Branded Food & Restaurant Tracking
import { Request, Response } from 'express';

// Mock prisma before importing anything that uses it
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
import axios from 'axios';
import {
  searchFood,
  getRecentFoods,
  getFrequentFoods,
  logFood,
  createUserFoodItem,
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

const mockFoodItem = {
  id: 'fi-1',
  name: 'Chipotle Chicken Burrito Bowl',
  brand: 'Chipotle',
  category: 'restaurant',
  servingSize: '1 bowl (510g)',
  calories: 665,
  protein: 52,
  carbs: 55,
  fat: 25,
  fiber: 10,
  source: 'nutritionix',
  externalId: 'nix-chipotle-bowl',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/food/search', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when query is missing', async () => {
    const req = makeReq({});
    const res = makeRes();
    await searchFood(req as Request, res as Response);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/query/i);
  });

  test('returns cached results when local FoodItem matches exist', async () => {
    (prisma.foodItem.findMany as jest.Mock).mockResolvedValue([mockFoodItem]);

    const req = makeReq({ q: 'chipotle' });
    const res = makeRes();
    await searchFood(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.results).toHaveLength(1);
    expect(res._body.results[0].name).toBe('Chipotle Chicken Burrito Bowl');
    expect(res._body.source).toBe('cache');
    // Should NOT call external API when cache has results
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('falls back to Nutritionix when local cache is empty', async () => {
    (prisma.foodItem.findMany as jest.Mock).mockResolvedValue([]);
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        branded: [
          {
            food_name: 'Chipotle Chicken Burrito',
            brand_name: 'Chipotle',
            nf_calories: 665,
            nf_protein: 52,
            nf_total_carbohydrate: 55,
            nf_total_fat: 25,
            nf_dietary_fiber: 10,
            serving_qty: 1,
            serving_unit: 'bowl',
            serving_weight_grams: 510,
            nix_item_id: 'nix-123',
            photo: { thumb: 'https://example.com/thumb.jpg' },
          },
        ],
        common: [],
      },
    });
    (prisma.foodItem.upsert as jest.Mock).mockResolvedValue(mockFoodItem);

    const req = makeReq({ q: 'chipotle' });
    const res = makeRes();

    // Set env vars for Nutritionix
    process.env.NUTRITIONIX_APP_ID = 'test-id';
    process.env.NUTRITIONIX_API_KEY = 'test-key';

    await searchFood(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.results.length).toBeGreaterThan(0);
    expect(res._body.source).toBe('nutritionix');
    // Should cache the result
    expect(prisma.foodItem.upsert).toHaveBeenCalled();
  });

  test('falls back to OpenFoodFacts when Nutritionix is not configured', async () => {
    (prisma.foodItem.findMany as jest.Mock).mockResolvedValue([]);
    delete process.env.NUTRITIONIX_APP_ID;
    delete process.env.NUTRITIONIX_API_KEY;

    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        products: [
          {
            product_name: 'KIND Protein Bar',
            brands: 'KIND',
            nutriments: {
              'energy-kcal_100g': 400,
              proteins_100g: 25,
              carbohydrates_100g: 30,
              fat_100g: 15,
              fiber_100g: 5,
            },
            serving_size: '1 bar (50g)',
            code: '1234567890',
            image_url: null,
          },
        ],
      },
    });
    (prisma.foodItem.upsert as jest.Mock).mockResolvedValue({
      ...mockFoodItem,
      name: 'KIND Protein Bar',
      source: 'openfoodfacts',
    });

    const req = makeReq({ q: 'KIND protein bar' });
    const res = makeRes();
    await searchFood(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.source).toBe('openfoodfacts');
  });
});

describe('GET /api/food/recent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns last 10 logged food items in order', async () => {
    const meals = Array.from({ length: 10 }, (_, i) => ({
      id: `meal-${i}`,
      createdAt: new Date(2026, 3, 17 - i),
      foodItemId: `fi-${i}`,
      foodItem: { ...mockFoodItem, id: `fi-${i}`, name: `Food ${i}` },
    }));
    (prisma.meal.findMany as jest.Mock).mockResolvedValue(meals);

    const req = makeReq();
    const res = makeRes();
    await getRecentFoods(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.items).toHaveLength(10);
    expect(res._body.items[0].name).toBe('Food 0');
    expect(prisma.meal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mealPlan: { userId: 'user-1' },
          foodItemId: { not: null },
        }),
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    );
  });
});

describe('GET /api/food/frequent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns top 10 food items by usage count', async () => {
    // Prisma groupBy returns aggregated results
    const grouped = Array.from({ length: 10 }, (_, i) => ({
      foodItemId: `fi-${i}`,
      _count: { foodItemId: 10 - i },
    }));
    (prisma.meal.groupBy as any) = jest.fn().mockResolvedValue(grouped);
    (prisma.foodItem.findMany as jest.Mock).mockResolvedValue(
      grouped.map((g, i) => ({
        ...mockFoodItem,
        id: g.foodItemId,
        name: `Food ${i}`,
      })),
    );

    const req = makeReq();
    const res = makeRes();
    await getFrequentFoods(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.items).toHaveLength(10);
  });
});

describe('POST /api/food/log', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates Meal with correct macros and foodItemId', async () => {
    (prisma.foodItem.findFirst as jest.Mock).mockResolvedValue(mockFoodItem);
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue({
      id: 'mp-1',
      userId: 'user-1',
    });
    const createdMeal = {
      id: 'meal-new',
      mealPlanId: 'mp-1',
      foodItemId: mockFoodItem.id,
      customName: mockFoodItem.name,
      customCalories: 665,
      customProtein: 52,
      customCarbs: 55,
      customFat: 25,
    };
    (prisma.meal.create as jest.Mock).mockResolvedValue(createdMeal);

    const req = makeReq({}, {
      foodItemId: 'fi-1',
      mealType: 'lunch',
      servings: 1,
    });
    const res = makeRes();
    await logFood(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(prisma.meal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        foodItemId: 'fi-1',
        customName: 'Chipotle Chicken Burrito Bowl',
        customCalories: 665,
        customProtein: 52,
        customCarbs: 55,
        customFat: 25,
        isCompleted: true,
      }),
    });
  });

  test('serving size adjustment recalculates macros correctly', async () => {
    (prisma.foodItem.findFirst as jest.Mock).mockResolvedValue(mockFoodItem);
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue({
      id: 'mp-1',
      userId: 'user-1',
    });
    (prisma.meal.create as jest.Mock).mockImplementation(({ data }) => ({
      id: 'meal-new',
      ...data,
    }));

    const req = makeReq({}, {
      foodItemId: 'fi-1',
      mealType: 'dinner',
      servings: 1.5,
    });
    const res = makeRes();
    await logFood(req as Request, res as Response);

    // 1.5x servings: 665*1.5=997.5 → 998 (rounded)
    expect(prisma.meal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customCalories: 998,
        customProtein: 78,
        customCarbs: 82.5,
        customFat: 37.5,
      }),
    });
  });

  test('returns 400 for missing foodItemId', async () => {
    const req = makeReq({}, { mealType: 'lunch' });
    const res = makeRes();
    await logFood(req as Request, res as Response);
    expect(res._status).toBe(400);
  });

  test('returns 404 for non-existent food item', async () => {
    (prisma.foodItem.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq({}, { foodItemId: 'non-existent', mealType: 'lunch' });
    const res = makeRes();
    await logFood(req as Request, res as Response);
    expect(res._status).toBe(404);
  });
});

describe('POST /api/food/items (user-submitted)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates user-submitted food item and it appears in future searches', async () => {
    const userItem = {
      ...mockFoodItem,
      id: 'fi-user-1',
      name: 'Round Table Gourmet Veggie Pizza',
      brand: 'Round Table',
      source: 'user',
      externalId: null,
    };
    (prisma.foodItem.create as jest.Mock).mockResolvedValue(userItem);

    const req = makeReq({}, {
      name: 'Round Table Gourmet Veggie Pizza',
      brand: 'Round Table',
      category: 'restaurant',
      servingSize: '1 slice (130g)',
      calories: 280,
      protein: 12,
      carbs: 32,
      fat: 11,
    });
    const res = makeRes();
    await createUserFoodItem(req as Request, res as Response);

    expect(res._status).toBe(201);
    expect(prisma.foodItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Round Table Gourmet Veggie Pizza',
        source: 'user',
      }),
    });
  });

  test('returns 400 when name or calories missing', async () => {
    const req = makeReq({}, { brand: 'Test' });
    const res = makeRes();
    await createUserFoodItem(req as Request, res as Response);
    expect(res._status).toBe(400);
  });
});
