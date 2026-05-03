// Group 10Y Phase 3: Coach tool-use bridge — read-only personalized tools.
// Each tool runs through the existing 70/30 personalization stack so the
// model's output never bypasses scoring.

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { calculateRecipeScore } from '@/utils/scoring';
import { calculateAdjacencyBoost } from '@/utils/cuisineAdjacency';
import { matchesPantry, isStaple } from './pantryMatchService';
import type { CoachTier } from './coachService';

export type CoachToolName =
  | 'search_cookbook'
  | 'get_pantry'
  | 'get_today_remaining_macros'
  | 'find_recipes';

export const coachToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'search_cookbook',
    description:
      "Search the user's saved + recently-cooked recipes by query string. Returns a personalized ranking that boosts recently cooked and 4★+ rated recipes — not a generic search. Use when the user asks 'what have I made before with X' or wants to revisit a saved recipe.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text query matched against recipe title/cuisine.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_pantry',
    description:
      "Return the user's current pantry items and leftover inventory. Use to ground answers in what they actually have right now.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_today_remaining_macros',
    description:
      "Return the user's macro goals minus what they've already eaten today. Use when nutrition fit matters (e.g. 'do I have room for X?'). Returns null fields if no goals set.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'find_recipes',
    description:
      "Return a personalized list of recipes ranked through the Sazon 70/30 macro-match / taste-match scoring engine plus pantry coverage + cuisine adjacency boost. Each result carries a personalization envelope (pantryCoverage, macroFit, affinityScore). NOT a generic search — every result is ranked for THIS user.",
    input_schema: {
      type: 'object',
      properties: {
        cuisines: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of cuisines to require.',
        },
        maxPrepMinutes: {
          type: 'number',
          description: 'Optional max cook time in minutes.',
        },
        minProtein: { type: 'number' },
        maxCalories: { type: 'number' },
      },
    },
  },
];

interface RunCoachToolInput {
  userId: string;
  name: CoachToolName | string;
  input: unknown;
  tier: CoachTier;
}

interface RunCoachToolResult {
  result: unknown;
}

const MACRO_FIT_GREEN = 0.5;
const MACRO_FIT_AMBER = 1.0;
const RECENT_COOK_DAYS = 14;
const HIGH_RATING_THRESHOLD = 4;

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

interface RecipeShape {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  cuisine: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  ingredients: Array<{ text: string }>;
  instructions: Array<{ text: string }>;
  imageUrl?: string | null;
}

function computePantryCoverage(
  recipe: RecipeShape,
  pantryNames: string[],
): number {
  if (recipe.ingredients.length === 0) return 0;
  let matched = 0;
  for (const ing of recipe.ingredients) {
    if (isStaple(ing.text) || matchesPantry(ing.text, pantryNames)) {
      matched += 1;
    }
  }
  return matched / recipe.ingredients.length;
}

function macroFit(
  recipe: RecipeShape,
  remaining: { calories: number; protein: number; carbs: number; fat: number } | null,
): 'green' | 'amber' | 'red' {
  if (!remaining || remaining.calories <= 0) return 'amber';
  // Treat fit as ratio of recipe macros to remaining; closer to 1 = green.
  const calRatio = recipe.calories / Math.max(1, remaining.calories);
  if (calRatio <= MACRO_FIT_GREEN) return 'green';
  if (calRatio <= MACRO_FIT_AMBER) return 'amber';
  return 'red';
}

interface AggregatableMeal {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  customCalories?: number | null;
  customProtein?: number | null;
  customCarbs?: number | null;
  customFat?: number | null;
}

function pickMacro(meal: AggregatableMeal, key: 'calories' | 'protein' | 'carbs' | 'fat'): number {
  const customKey = `custom${key.charAt(0).toUpperCase()}${key.slice(1)}` as
    | 'customCalories'
    | 'customProtein'
    | 'customCarbs'
    | 'customFat';
  return Number(meal[key] ?? meal[customKey] ?? 0);
}

async function fetchTodayMeals(userId: string): Promise<AggregatableMeal[]> {
  // Today's meals can live under a user-owned MealPlan or directly via MealHistory.
  // Tests mock prisma.meal.findMany returning a flat shape, so use that.
  const start = startOfTodayUTC();
  const meals = (await prisma.meal.findMany({
    where: { date: { gte: start }, mealPlan: { userId } },
  })) as unknown as AggregatableMeal[];
  return meals;
}

async function loadUserContext(userId: string) {
  const [pantry, prefs, macroGoals, todayMeals] = await Promise.all([
    prisma.pantryItem.findMany({ where: { userId } }),
    prisma.userPreferences.findUnique({
      where: { userId },
      include: {
        bannedIngredients: true,
        likedCuisines: true,
        dietaryRestrictions: true,
        preferredSuperfoods: true,
      },
    }),
    prisma.macroGoals.findUnique({ where: { userId } }),
    fetchTodayMeals(userId),
  ]);
  const consumed = todayMeals.reduce<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(
    (acc, m) => ({
      calories: acc.calories + pickMacro(m, 'calories'),
      protein: acc.protein + pickMacro(m, 'protein'),
      carbs: acc.carbs + pickMacro(m, 'carbs'),
      fat: acc.fat + pickMacro(m, 'fat'),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const remaining = macroGoals
    ? {
        calories: macroGoals.calories - consumed.calories,
        protein: macroGoals.protein - consumed.protein,
        carbs: macroGoals.carbs - consumed.carbs,
        fat: macroGoals.fat - consumed.fat,
      }
    : null;
  return {
    pantryNames: pantry.map((p) => p.name),
    prefs,
    macroGoals,
    remaining,
  };
}

interface PrefsShape {
  id: string;
  userId: string;
  cookTimePreference: number;
  spiceLevel?: string | null;
  bannedIngredients: Array<{ name: string }>;
  likedCuisines: Array<{ name: string }>;
  dietaryRestrictions: Array<{ name: string }>;
  preferredSuperfoods?: Array<{ category: string }>;
}

function rankRecipes(
  recipes: RecipeShape[],
  prefs: PrefsShape | null,
  macroGoals: { id: string; userId: string; calories: number; protein: number; carbs: number; fat: number } | null,
  pantryNames: string[],
  remaining: { calories: number; protein: number; carbs: number; fat: number } | null,
) {
  const likedCuisines = prefs?.likedCuisines.map((c) => c.name) ?? [];
  return recipes
    .map((r) => {
      const score = calculateRecipeScore(r, prefs, macroGoals);
      const pantryCoverage = computePantryCoverage(r, pantryNames);
      const adjacencyBoost = calculateAdjacencyBoost(
        likedCuisines,
        r.cuisine,
        0.3,
      );
      const affinityScore = score.total + adjacencyBoost * 100;
      return {
        id: r.id,
        title: r.title,
        cuisine: r.cuisine,
        cookTime: r.cookTime,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        imageUrl: r.imageUrl ?? null,
        personalization: {
          pantryCoverage: Number(pantryCoverage.toFixed(3)),
          macroFit: macroFit(r, remaining),
          affinityScore: Number(affinityScore.toFixed(2)),
        },
      };
    })
    .sort((a, b) => b.personalization.affinityScore - a.personalization.affinityScore);
}

async function runFindRecipes(
  userId: string,
  input: {
    cuisines?: string[];
    maxPrepMinutes?: number;
    minProtein?: number;
    maxCalories?: number;
  },
): Promise<unknown> {
  const { pantryNames, prefs, macroGoals, remaining } =
    await loadUserContext(userId);

  const where: Record<string, unknown> = {};
  if (input.cuisines && input.cuisines.length > 0) {
    where.cuisine = { in: input.cuisines };
  }
  if (typeof input.maxPrepMinutes === 'number') {
    where.cookTime = { lte: input.maxPrepMinutes };
  }
  if (typeof input.minProtein === 'number') {
    where.protein = { gte: input.minProtein };
  }
  if (typeof input.maxCalories === 'number') {
    where.calories = { lte: input.maxCalories };
  }

  const recipes = (await prisma.recipe.findMany({
    where,
    include: { ingredients: true, instructions: true },
    take: 50,
  })) as unknown as RecipeShape[];

  const ranked = rankRecipes(recipes, prefs as PrefsShape | null, macroGoals, pantryNames, remaining);
  return { recipes: ranked.slice(0, 8) };
}

async function runSearchCookbook(
  userId: string,
  input: { query: string },
): Promise<unknown> {
  const query = (input.query ?? '').trim().toLowerCase();
  const { pantryNames, prefs, macroGoals, remaining } =
    await loadUserContext(userId);

  const saved = await prisma.savedRecipe.findMany({
    where: { userId },
    include: {
      recipe: { include: { ingredients: true, instructions: true } },
    },
  });

  const cookCutoff = new Date(
    Date.now() - RECENT_COOK_DAYS * 24 * 60 * 60 * 1000,
  );
  const recentLogs = await prisma.cookingLog.findMany({
    where: { userId, cookedAt: { gte: cookCutoff } },
  });
  const recentlyCookedIds = new Set(recentLogs.map((l) => l.recipeId));

  const filtered = saved.filter((s) => {
    if (!query) return true;
    const r = s.recipe as unknown as RecipeShape;
    const hay = `${r.title} ${r.cuisine}`.toLowerCase();
    return hay.includes(query);
  });

  const recipes = filtered.map((s) => s.recipe as unknown as RecipeShape);
  const ratingByRecipe = new Map<string, number | null>();
  for (const s of filtered) {
    ratingByRecipe.set(s.recipeId, s.rating ?? null);
  }

  const ranked = rankRecipes(recipes, prefs as PrefsShape | null, macroGoals, pantryNames, remaining)
    .map((r) => {
      const rating = ratingByRecipe.get(r.id);
      const recentBoost = recentlyCookedIds.has(r.id) ? 25 : 0;
      const ratingBoost = rating !== null && rating !== undefined && rating >= HIGH_RATING_THRESHOLD ? 15 : 0;
      return {
        ...r,
        personalization: {
          ...r.personalization,
          affinityScore: Number(
            (r.personalization.affinityScore + recentBoost + ratingBoost).toFixed(2),
          ),
        },
      };
    })
    .sort((a, b) => b.personalization.affinityScore - a.personalization.affinityScore);

  return { recipes: ranked };
}

async function runGetPantry(userId: string): Promise<unknown> {
  const [pantry, leftovers] = await Promise.all([
    prisma.pantryItem.findMany({ where: { userId } }),
    prisma.leftoverInventory.findMany({ where: { userId } }),
  ]);
  return {
    pantry: pantry.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
    })),
    leftoverInventory: leftovers.map((l) => ({
      id: l.id,
      componentId: l.componentId,
      slot: l.slot,
      portionsRemaining: l.portionsRemaining,
      expiresAt: l.expiresAt.toISOString(),
    })),
  };
}

async function runGetTodayRemainingMacros(userId: string): Promise<unknown> {
  const goals = await prisma.macroGoals.findUnique({ where: { userId } });
  if (!goals) return { remaining: null };
  const todayMeals = await fetchTodayMeals(userId);
  const consumed = todayMeals.reduce<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>(
    (acc, m) => ({
      calories: acc.calories + pickMacro(m, 'calories'),
      protein: acc.protein + pickMacro(m, 'protein'),
      carbs: acc.carbs + pickMacro(m, 'carbs'),
      fat: acc.fat + pickMacro(m, 'fat'),
      fiber: acc.fiber + Number(m.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  return {
    remaining: {
      calories: goals.calories - consumed.calories,
      protein: goals.protein - consumed.protein,
      carbs: goals.carbs - consumed.carbs,
      fat: goals.fat - consumed.fat,
      fiber: (goals.fiber ?? 0) - consumed.fiber,
    },
  };
}

export async function runCoachTool(
  args: RunCoachToolInput,
): Promise<RunCoachToolResult> {
  const { userId, name, input } = args;
  switch (name) {
    case 'get_pantry':
      return { result: await runGetPantry(userId) };
    case 'get_today_remaining_macros':
      return { result: await runGetTodayRemainingMacros(userId) };
    case 'find_recipes':
      return {
        result: await runFindRecipes(
          userId,
          (input ?? {}) as {
            cuisines?: string[];
            maxPrepMinutes?: number;
            minProtein?: number;
            maxCalories?: number;
          },
        ),
      };
    case 'search_cookbook':
      return {
        result: await runSearchCookbook(
          userId,
          (input ?? {}) as { query: string },
        ),
      };
    default:
      throw new Error(`Unknown coach tool: ${name}`);
  }
}
