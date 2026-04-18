// backend/src/modules/food/foodController.ts
// 10L: Branded Food & Restaurant Tracking — search, log, recent, frequent

import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NutritionixBrandedItem {
  food_name: string;
  brand_name?: string;
  nf_calories: number;
  nf_protein: number;
  nf_total_carbohydrate: number;
  nf_total_fat: number;
  nf_dietary_fiber?: number;
  serving_qty?: number;
  serving_unit?: string;
  serving_weight_grams?: number;
  nix_item_id?: string;
  photo?: { thumb?: string };
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number>;
  serving_size?: string;
  code?: string;
  image_url?: string;
}

function nutritionixToFoodItem(item: NutritionixBrandedItem) {
  const servingLabel = item.serving_weight_grams
    ? `${item.serving_qty ?? 1} ${item.serving_unit ?? 'serving'} (${item.serving_weight_grams}g)`
    : `${item.serving_qty ?? 1} ${item.serving_unit ?? 'serving'}`;

  return {
    name: item.food_name,
    brand: item.brand_name ?? null,
    category: 'restaurant' as const,
    servingSize: servingLabel,
    calories: Math.round(item.nf_calories ?? 0),
    protein: Math.round((item.nf_protein ?? 0) * 10) / 10,
    carbs: Math.round((item.nf_total_carbohydrate ?? 0) * 10) / 10,
    fat: Math.round((item.nf_total_fat ?? 0) * 10) / 10,
    fiber: item.nf_dietary_fiber ?? null,
    source: 'nutritionix' as const,
    externalId: item.nix_item_id ?? null,
    imageUrl: item.photo?.thumb ?? null,
  };
}

function offToFoodItem(product: OFFProduct) {
  const n = product.nutriments ?? {};
  return {
    name: product.product_name ?? 'Unknown Product',
    brand: product.brands ?? null,
    category: 'packaged' as const,
    servingSize: product.serving_size ?? null,
    calories: Math.round(n['energy-kcal_100g'] ?? 0),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiber: n.fiber_100g ?? null,
    source: 'openfoodfacts' as const,
    externalId: product.code ?? null,
    imageUrl: product.image_url ?? null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/food/search?q=...
// ---------------------------------------------------------------------------

export const searchFood = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string ?? '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    // 1. Check local cache first
    const cached = await prisma.foodItem.findMany({
      where: {
        name: { contains: query },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    if (cached.length > 0) {
      return res.json({ results: cached, source: 'cache' });
    }

    // 2. External API fallback
    const hasNutritionix =
      process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_API_KEY;

    if (hasNutritionix) {
      return await searchNutritionix(query, res);
    }

    return await searchOpenFoodFacts(query, res);
  } catch (error: any) {
    console.error('❌ Food search error:', error);
    res.status(500).json({ error: 'Failed to search food', message: error.message });
  }
};

async function searchNutritionix(query: string, res: Response) {
  const response = await axios.post(
    'https://trackapi.nutritionix.com/v2/search/instant',
    { query },
    {
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID!,
        'x-app-key': process.env.NUTRITIONIX_API_KEY!,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    },
  );

  const branded: NutritionixBrandedItem[] = response.data.branded ?? [];
  const common: NutritionixBrandedItem[] = response.data.common ?? [];
  const items = [...branded, ...common].slice(0, 20);

  // Cache results
  const cached = await Promise.all(
    items.map((item) => {
      const data = nutritionixToFoodItem(item);
      return prisma.foodItem.upsert({
        where: {
          source_externalId: {
            source: data.source,
            externalId: data.externalId ?? '',
          },
        },
        update: data,
        create: data,
      });
    }),
  );

  return res.json({ results: cached, source: 'nutritionix' });
}

async function searchOpenFoodFacts(query: string, res: Response) {
  const response = await axios.get(
    'https://world.openfoodfacts.org/cgi/search.pl',
    {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 20,
      },
      timeout: 5000,
    },
  );

  const products: OFFProduct[] = response.data.products ?? [];
  const items = products.filter((p) => p.product_name);

  const cached = await Promise.all(
    items.map((product) => {
      const data = offToFoodItem(product);
      return prisma.foodItem.upsert({
        where: {
          source_externalId: {
            source: data.source,
            externalId: data.externalId ?? '',
          },
        },
        update: data,
        create: data,
      });
    }),
  );

  return res.json({ results: cached, source: 'openfoodfacts' });
}

// ---------------------------------------------------------------------------
// GET /api/food/recent
// ---------------------------------------------------------------------------

export const getRecentFoods = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const meals = await prisma.meal.findMany({
      where: {
        mealPlan: { userId },
        foodItemId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { foodItem: true },
    });

    // Deduplicate by foodItemId, keep most recent
    const seen = new Set<string>();
    const items = meals
      .filter((m) => {
        if (!m.foodItem || seen.has(m.foodItemId!)) return false;
        seen.add(m.foodItemId!);
        return true;
      })
      .map((m) => m.foodItem!);

    return res.json({ items });
  } catch (error: any) {
    console.error('❌ Recent foods error:', error);
    res.status(500).json({ error: 'Failed to get recent foods' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/food/frequent
// ---------------------------------------------------------------------------

export const getFrequentFoods = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Group meals by foodItemId, count occurrences
    const grouped = await (prisma.meal as any).groupBy({
      by: ['foodItemId'],
      where: {
        mealPlan: { userId },
        foodItemId: { not: null },
      },
      _count: { foodItemId: true },
      orderBy: { _count: { foodItemId: 'desc' } },
      take: 10,
    });

    const foodItemIds = grouped.map(
      (g: { foodItemId: string }) => g.foodItemId,
    );

    const foodItems = await prisma.foodItem.findMany({
      where: { id: { in: foodItemIds } },
    });

    // Preserve frequency order
    const byId = new Map(foodItems.map((fi) => [fi.id, fi]));
    const items = foodItemIds
      .map((id: string) => byId.get(id))
      .filter(Boolean);

    return res.json({ items });
  } catch (error: any) {
    console.error('❌ Frequent foods error:', error);
    res.status(500).json({ error: 'Failed to get frequent foods' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/food/log
// ---------------------------------------------------------------------------

export const logFood = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { foodItemId, mealType, servings = 1, date } = req.body;

    if (!foodItemId) {
      return res.status(400).json({ error: 'foodItemId is required' });
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!mealType || !validMealTypes.includes(mealType)) {
      return res.status(400).json({
        error: 'Valid mealType is required (breakfast, lunch, dinner, snack)',
      });
    }

    const foodItem = await prisma.foodItem.findFirst({
      where: { id: foodItemId },
    });
    if (!foodItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    // Find or create active meal plan
    const today = date ? new Date(date) : new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let mealPlan = await prisma.mealPlan.findFirst({
      where: {
        userId,
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    if (!mealPlan) {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          name: 'My Meal Plan',
          startDate: weekStart,
          endDate: weekEnd,
          isActive: true,
        },
      });
    }

    // Scale macros by servings
    const s = typeof servings === 'number' ? servings : parseFloat(servings) || 1;
    const scaledCalories = Math.round(foodItem.calories * s);
    const scaledProtein = Math.round(foodItem.protein * s * 10) / 10;
    const scaledCarbs = Math.round(foodItem.carbs * s * 10) / 10;
    const scaledFat = Math.round(foodItem.fat * s * 10) / 10;

    const meal = await prisma.meal.create({
      data: {
        mealPlanId: mealPlan.id,
        date: today,
        mealType,
        foodItemId,
        customName: foodItem.name,
        customCalories: scaledCalories,
        customProtein: scaledProtein,
        customCarbs: scaledCarbs,
        customFat: scaledFat,
        isCompleted: true,
        completedAt: today,
      },
    });

    return res.json({ message: 'Food logged successfully', meal });
  } catch (error: any) {
    console.error('❌ Log food error:', error);
    res.status(500).json({ error: 'Failed to log food' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/food/items (user-submitted food item)
// ---------------------------------------------------------------------------

export const createUserFoodItem = async (req: Request, res: Response) => {
  try {
    const { name, brand, category, servingSize, calories, protein, carbs, fat, fiber } =
      req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Food name is required' });
    }
    if (calories == null || calories < 0) {
      return res.status(400).json({ error: 'Calories is required and must be >= 0' });
    }

    const foodItem = await prisma.foodItem.create({
      data: {
        name: name.trim(),
        brand: brand ?? null,
        category: category ?? null,
        servingSize: servingSize ?? null,
        calories: Math.round(calories),
        protein: protein != null ? parseFloat(protein) : 0,
        carbs: carbs != null ? parseFloat(carbs) : 0,
        fat: fat != null ? parseFloat(fat) : 0,
        fiber: fiber != null ? parseFloat(fiber) : null,
        source: 'user',
        externalId: null,
      },
    });

    return res.status(201).json({ foodItem });
  } catch (error: any) {
    console.error('❌ Create food item error:', error);
    res.status(500).json({ error: 'Failed to create food item' });
  }
};
