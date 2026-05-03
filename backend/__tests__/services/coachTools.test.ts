// Group 10Y Phase 3: Coach tool-use bridge — read-only tool dispatcher tests.

const mockPantryFindMany = jest.fn();
const mockLeftoverFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockMealHistoryFindMany = jest.fn();
const mockMealFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockSavedRecipeFindMany = jest.fn();
const mockCookingLogFindMany = jest.fn();
const mockRecipeFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: {
      findMany: (...a: unknown[]) => mockLeftoverFindMany(...a),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    mealHistory: {
      findMany: (...a: unknown[]) => mockMealHistoryFindMany(...a),
    },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: {
      findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a),
    },
    savedRecipe: {
      findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a),
    },
    cookingLog: {
      findMany: (...a: unknown[]) => mockCookingLogFindMany(...a),
    },
    recipe: { findMany: (...a: unknown[]) => mockRecipeFindMany(...a) },
  },
}));

import {
  coachToolDefinitions,
  runCoachTool,
} from '../../src/services/coachTools';

const baseRecipe = {
  id: 'r1',
  title: 'Mediterranean Chicken Bowl',
  description: 'Bright lemon-herb chicken over rice',
  cookTime: 25,
  cuisine: 'Mediterranean',
  calories: 520,
  protein: 42,
  carbs: 38,
  fat: 18,
  fiber: 6,
  sugar: 4,
  ingredients: [
    { text: 'chicken thigh' },
    { text: 'olive oil' },
    { text: 'lemon' },
    { text: 'rice' },
  ],
  instructions: [{ text: 'cook' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPantryFindMany.mockResolvedValue([]);
  mockLeftoverFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockMealHistoryFindMany.mockResolvedValue([]);
  mockMealFindMany.mockResolvedValue([]);
  mockUserPreferencesFindUnique.mockResolvedValue(null);
  mockSavedRecipeFindMany.mockResolvedValue([]);
  mockCookingLogFindMany.mockResolvedValue([]);
  mockRecipeFindMany.mockResolvedValue([]);
});

describe('coachToolDefinitions', () => {
  it('exposes exactly the 4 read-only tools and no write tools', () => {
    expect(coachToolDefinitions).toHaveLength(4);
    const names = coachToolDefinitions.map((t) => t.name).sort();
    expect(names).toEqual([
      'find_recipes',
      'get_pantry',
      'get_today_remaining_macros',
      'search_cookbook',
    ]);
    // Sanity: write tools are not exposed yet
    for (const t of coachToolDefinitions) {
      expect(t.name).not.toBe('compose_plate');
      expect(t.name).not.toBe('log_meal');
    }
  });

  it('descriptions reference personalized rankings', () => {
    const findRecipes = coachToolDefinitions.find(
      (t) => t.name === 'find_recipes',
    );
    expect(findRecipes?.description?.toLowerCase()).toMatch(
      /personaliz|70\/30|affinity|ranking/,
    );
    const search = coachToolDefinitions.find(
      (t) => t.name === 'search_cookbook',
    );
    expect(search?.description?.toLowerCase()).toMatch(
      /personaliz|cooked|saved|rated/,
    );
  });
});

describe('runCoachTool: get_pantry', () => {
  it('returns Prisma rows scoped to the requesting user', async () => {
    mockPantryFindMany.mockResolvedValue([
      { id: 'p1', name: 'chicken thigh', category: 'protein' },
      { id: 'p2', name: 'lemon', category: 'produce' },
    ]);
    mockLeftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        componentId: 'c1',
        slot: 'protein',
        portionsRemaining: 2,
        expiresAt: new Date('2026-05-08T00:00:00Z'),
      },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_pantry',
      input: {},
      tier: 'free',
    });

    expect(mockPantryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(mockLeftoverFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(result).toMatchObject({
      pantry: expect.any(Array),
      leftoverInventory: expect.any(Array),
    });
    const r = result as { pantry: Array<{ name: string }> };
    expect(r.pantry.map((p) => p.name)).toEqual(['chicken thigh', 'lemon']);
  });
});

describe('runCoachTool: get_today_remaining_macros', () => {
  it('subtracts today consumed macros from goals', async () => {
    mockMacroGoalsFindUnique.mockResolvedValue({
      userId: 'user-1',
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
      fiber: 30,
    });
    mockMealFindMany.mockResolvedValue([
      { calories: 600, protein: 40, carbs: 60, fat: 20, fiber: 5 },
      { calories: 400, protein: 30, carbs: 30, fat: 15, fiber: 4 },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_today_remaining_macros',
      input: {},
      tier: 'free',
    });

    const r = result as {
      remaining: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
    expect(r.remaining.calories).toBe(1000);
    expect(r.remaining.protein).toBe(80);
    expect(r.remaining.carbs).toBe(110);
    expect(r.remaining.fat).toBe(35);
  });

  it('returns nulls when no goals set', async () => {
    mockMacroGoalsFindUnique.mockResolvedValue(null);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_today_remaining_macros',
      input: {},
      tier: 'free',
    });
    const r = result as { remaining: null };
    expect(r.remaining).toBeNull();
  });
});

describe('runCoachTool: find_recipes', () => {
  it('filters by cuisine and maxPrepMinutes; results carry personalization', async () => {
    mockRecipeFindMany.mockResolvedValue([
      baseRecipe,
      {
        ...baseRecipe,
        id: 'r2',
        title: 'Slow Italian Lasagna',
        cuisine: 'Italian',
        cookTime: 90,
      },
      {
        ...baseRecipe,
        id: 'r3',
        title: 'Quick Greek Salad',
        cuisine: 'Greek',
        cookTime: 10,
      },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      cookTimePreference: 30,
      spiceLevel: 'medium',
      bannedIngredients: [],
      likedCuisines: [{ name: 'Mediterranean' }],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    mockMacroGoalsFindUnique.mockResolvedValue({
      id: 'mg-1',
      userId: 'user-1',
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });
    mockPantryFindMany.mockResolvedValue([
      { name: 'chicken thigh' },
      { name: 'olive oil' },
      { name: 'lemon' },
      { name: 'rice' },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'find_recipes',
      input: {
        cuisines: ['Mediterranean', 'Greek'],
        maxPrepMinutes: 30,
      },
      tier: 'free',
    });

    const r = result as {
      recipes: Array<{
        id: string;
        title: string;
        cuisine: string;
        cookTime: number;
        personalization: {
          pantryCoverage: number;
          macroFit: 'green' | 'amber' | 'red';
          affinityScore: number;
        };
      }>;
    };

    expect(r.recipes.length).toBeGreaterThan(0);
    // Verify the Prisma query was built with cuisine + cookTime filters.
    expect(mockRecipeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cuisine: { in: ['Mediterranean', 'Greek'] },
          cookTime: { lte: 30 },
        }),
      }),
    );
    // All returned items carry the personalization envelope
    for (const rec of r.recipes) {
      expect(rec.personalization.pantryCoverage).toBeGreaterThanOrEqual(0);
      expect(rec.personalization.pantryCoverage).toBeLessThanOrEqual(1);
      expect(['green', 'amber', 'red']).toContain(
        rec.personalization.macroFit,
      );
      expect(typeof rec.personalization.affinityScore).toBe('number');
    }
    // Mediterranean recipe has full pantry coverage
    const med = r.recipes.find((x) => x.id === 'r1');
    expect(med?.personalization.pantryCoverage).toBe(1);
  });

  it('returns empty list when no recipes match filters', async () => {
    mockRecipeFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'find_recipes',
      input: { cuisines: ['Martian'] },
      tier: 'free',
    });
    const r = result as { recipes: unknown[] };
    expect(r.recipes).toEqual([]);
  });
});

describe('runCoachTool: search_cookbook', () => {
  it('boosts recently-cooked + 4-star+ rated recipes in the ranking', async () => {
    const old = new Date('2025-01-01T00:00:00Z');
    const recent = new Date('2026-05-01T00:00:00Z');

    // Three saved recipes; r2 is recently cooked, r3 has 5-star rating, r1 is plain
    mockSavedRecipeFindMany.mockResolvedValue([
      {
        id: 's1',
        recipeId: 'r1',
        userId: 'user-1',
        savedDate: old,
        rating: null,
        recipe: { ...baseRecipe, id: 'r1', title: 'Plain Chicken' },
      },
      {
        id: 's2',
        recipeId: 'r2',
        userId: 'user-1',
        savedDate: old,
        rating: null,
        recipe: { ...baseRecipe, id: 'r2', title: 'Chicken Recently Cooked' },
      },
      {
        id: 's3',
        recipeId: 'r3',
        userId: 'user-1',
        savedDate: old,
        rating: 5,
        recipe: { ...baseRecipe, id: 'r3', title: 'Chicken Highly Rated' },
      },
    ]);
    mockCookingLogFindMany.mockResolvedValue([
      { recipeId: 'r2', cookedAt: recent },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    mockPantryFindMany.mockResolvedValue([]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'search_cookbook',
      input: { query: 'chicken' },
      tier: 'free',
    });

    const r = result as { recipes: Array<{ id: string }> };
    expect(r.recipes.length).toBe(3);
    // The plain (no boost) recipe should rank below the boosted ones
    const ids = r.recipes.map((x) => x.id);
    expect(ids.indexOf('r1')).toBeGreaterThan(ids.indexOf('r2'));
    expect(ids.indexOf('r1')).toBeGreaterThan(ids.indexOf('r3'));
  });

  it('returns empty list when no cookbook matches the query', async () => {
    mockSavedRecipeFindMany.mockResolvedValue([]);
    mockCookingLogFindMany.mockResolvedValue([]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'search_cookbook',
      input: { query: 'pizza' },
      tier: 'free',
    });
    const r = result as { recipes: unknown[] };
    expect(r.recipes).toEqual([]);
  });
});

describe('runCoachTool: tier gating', () => {
  it('all 4 read-only tools run on free tier', async () => {
    mockPantryFindMany.mockResolvedValue([]);
    mockLeftoverFindMany.mockResolvedValue([]);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    mockMealFindMany.mockResolvedValue([]);
    mockSavedRecipeFindMany.mockResolvedValue([]);
    mockCookingLogFindMany.mockResolvedValue([]);
    mockRecipeFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);

    const names = ['get_pantry', 'get_today_remaining_macros', 'find_recipes', 'search_cookbook'] as const;
    for (const name of names) {
      await expect(
        runCoachTool({
          userId: 'user-1',
          name,
          input: name === 'search_cookbook' ? { query: 'x' } : {},
          tier: 'free',
        }),
      ).resolves.toBeDefined();
    }
  });

  it('rejects unknown tool names', async () => {
    await expect(
      runCoachTool({
        userId: 'user-1',
        name: 'compose_plate' as never,
        input: {},
        tier: 'premium',
      }),
    ).rejects.toThrow();
  });
});
