// Group 10Y Phase 3 + Phase 7: Coach tool-use bridge — read + write tools.
// Read tools surface personalization (70/30 + adjacency). Write tools (Pro-only)
// compose plates and log meals through the existing services.

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { calculateRecipeScore } from '@/utils/scoring';
import { calculateAdjacencyBoost } from '@/utils/cuisineAdjacency';
import { matchesPantry, isStaple } from './pantryMatchService';
import type { CoachTier } from './coachService';
import { saveComposedPlate } from '@/services/mealComponentService';
import { emit as emitAnalytics } from '@/services/coachAnalytics';

export type CoachToolName =
  | 'search_cookbook'
  | 'get_pantry'
  | 'get_today_remaining_macros'
  | 'find_recipes'
  | 'compose_plate'
  | 'log_meal';

const READ_TOOL_NAMES: ReadonlySet<CoachToolName> = new Set([
  'search_cookbook',
  'get_pantry',
  'get_today_remaining_macros',
  'find_recipes',
]);

const WRITE_TOOL_NAMES: ReadonlySet<CoachToolName> = new Set([
  'compose_plate',
  'log_meal',
]);

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
  {
    name: 'compose_plate',
    description:
      "PRO-ONLY WRITE TOOL. Compose a Build-a-Plate (10X) plate from per-slot component IDs or queries and persist it for the user. Only use after the user has explicitly confirmed they want to build/save a plate in chat — never call speculatively. Runs an allergen safety check against the user's profile before persisting.",
    input_schema: {
      type: 'object',
      properties: {
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slot: {
                type: 'string',
                enum: ['protein', 'veg', 'carb', 'sauce', 'extra'],
              },
              componentId: { type: 'string' },
              query: { type: 'string' },
            },
            required: ['slot'],
          },
        },
        servings: { type: 'number' },
      },
      required: ['slots'],
    },
  },
  {
    name: 'log_meal',
    description:
      "PRO-ONLY WRITE TOOL. Record a meal the user actually ate to their meal history. Only use after the user has explicitly confirmed they want to log a meal — never call speculatively. Exactly one of recipeId / plateId / foodItemId must be provided. Runs an allergen safety check before writing.",
    input_schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string' },
        plateId: { type: 'string' },
        foodItemId: { type: 'string' },
        servings: { type: 'number' },
        mealType: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        },
        eatenAt: { type: 'string' },
      },
      required: ['servings', 'mealType'],
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

// ─── Phase 7: write tools ────────────────────────────────────────────────

// Coach tool slot vocabulary differs slightly from 10X composer slots.
type CoachSlot = 'protein' | 'veg' | 'carb' | 'sauce' | 'extra';
type ComposerSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';

const COACH_TO_COMPOSER_SLOT: Record<CoachSlot, ComposerSlot> = {
  protein: 'protein',
  veg: 'vegetable',
  carb: 'base',
  sauce: 'sauce',
  extra: 'garnish',
};

interface ComposeSlotInput {
  slot: CoachSlot;
  componentId?: string;
  query?: string;
}

interface ComposePlateInput {
  slots: ComposeSlotInput[];
  servings?: number;
}

interface LogMealInput {
  recipeId?: string;
  plateId?: string;
  foodItemId?: string;
  servings: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  eatenAt?: string;
}

interface AllergenCheckResult {
  ok: boolean;
  violations: string[];
}

function safeJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function checkAllergens(
  ingredientTexts: string[],
  bannedIngredientNames: string[],
): AllergenCheckResult {
  if (bannedIngredientNames.length === 0) return { ok: true, violations: [] };
  const lowerIngredients = ingredientTexts.map((t) => t.toLowerCase());
  const violations: string[] = [];
  for (const banned of bannedIngredientNames) {
    const lower = banned.toLowerCase().trim();
    if (!lower) continue;
    if (lowerIngredients.some((ing) => ing.includes(lower))) {
      violations.push(banned);
    }
  }
  return { ok: violations.length === 0, violations };
}

async function loadUserAllergens(userId: string): Promise<string[]> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    include: { bannedIngredients: true },
  });
  const banned = (prefs as { bannedIngredients?: Array<{ name: string }> } | null)
    ?.bannedIngredients ?? [];
  return banned.map((b) => b.name);
}

interface ComponentRow {
  id: string;
  slot: string;
  name: string;
  pantryIngredientNames: string;
  cuisineTags?: string;
  dietaryTags?: string;
}

async function resolveComponentForSlot(
  slot: CoachSlot,
  componentId: string | undefined,
  query: string | undefined,
  userId: string,
): Promise<ComponentRow | null> {
  const composerSlot = COACH_TO_COMPOSER_SLOT[slot];
  if (componentId) {
    const rows = (await prisma.mealComponent.findMany({
      where: { id: componentId },
    })) as unknown as ComponentRow[];
    return rows[0] ?? null;
  }
  if (query) {
    const q = query.trim().toLowerCase();
    const rows = (await prisma.mealComponent.findMany({
      where: {
        slot: composerSlot,
        OR: [{ userId: null }, { userId }],
      },
    })) as unknown as ComponentRow[];
    const match = rows.find((r) => r.name.toLowerCase().includes(q));
    return match ?? null;
  }
  return null;
}

async function runComposePlate(
  userId: string,
  input: ComposePlateInput,
): Promise<unknown> {
  const slots = Array.isArray(input.slots) ? input.slots : [];
  const resolvedSlots: Array<{
    slot: ComposerSlot;
    componentId: string;
    name: string;
    ingredientNames: string[];
  }> = [];
  for (const s of slots) {
    const comp = await resolveComponentForSlot(s.slot, s.componentId, s.query, userId);
    if (!comp) {
      return {
        error: 'COMPONENT_NOT_FOUND',
        slot: s.slot,
        query: s.query ?? null,
        componentId: s.componentId ?? null,
      };
    }
    resolvedSlots.push({
      slot: COACH_TO_COMPOSER_SLOT[s.slot],
      componentId: comp.id,
      name: comp.name,
      ingredientNames: safeJsonStringArray(comp.pantryIngredientNames),
    });
  }

  const allIngredients = resolvedSlots.flatMap((s) => s.ingredientNames);
  const allergens = await loadUserAllergens(userId);
  const allergenCheck = checkAllergens(allIngredients, allergens);
  if (!allergenCheck.ok) {
    return {
      allergenSafe: { violations: allergenCheck.violations },
      slots: resolvedSlots.map((s) => ({
        slot: s.slot,
        componentId: s.componentId,
        name: s.name,
      })),
    };
  }

  const portionMultiplier = typeof input.servings === 'number' && input.servings > 0
    ? input.servings
    : 1;
  const composed = await saveComposedPlate({
    userId,
    components: resolvedSlots.map((s) => ({
      slot: s.slot,
      componentId: s.componentId,
      portionMultiplier,
    })),
    saveAsRecipe: false,
  });

  const plate = composed.plate as {
    id: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    pantryCoveragePercent: number;
  };

  return {
    plateId: plate.id,
    slots: resolvedSlots.map((s) => ({
      slot: s.slot,
      componentId: s.componentId,
      name: s.name,
    })),
    totalMacros: {
      calories: plate.totalCalories,
      protein: plate.totalProtein,
      carbs: plate.totalCarbs,
      fat: plate.totalFat,
    },
    pantryCoverage: plate.pantryCoveragePercent,
    allergenSafe: true,
  };
}

interface RecipeOwnerRow {
  id: string;
  userId: string | null;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ text: string }>;
}

async function runLogMeal(
  userId: string,
  input: LogMealInput,
): Promise<unknown> {
  const sources = [input.recipeId, input.plateId, input.foodItemId].filter(Boolean);
  if (sources.length !== 1) {
    return {
      error: 'INVALID_INPUT',
      message: 'Exactly one of recipeId, plateId, or foodItemId is required.',
    };
  }
  if (!Number.isFinite(input.servings) || input.servings <= 0) {
    return { error: 'INVALID_INPUT', message: 'servings must be > 0' };
  }

  // Phase 7 ships recipe-backed log_meal — plateId/foodItemId paths land in Phase 8.
  if (!input.recipeId) {
    return {
      error: 'NOT_IMPLEMENTED',
      message: 'plateId / foodItemId logging arrives in Phase 8.',
    };
  }

  const recipe = (await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    include: { ingredients: true },
  })) as unknown as RecipeOwnerRow | null;

  if (!recipe) {
    return { error: 'NOT_FOUND', message: 'Recipe not found' };
  }
  // Recipes with userId === null are global/seeded; those are loggable. User
  // recipes must belong to the caller.
  if (recipe.userId !== null && recipe.userId !== userId) {
    return { error: 'NOT_FOUND', message: 'Recipe not found' };
  }

  const allergens = await loadUserAllergens(userId);
  const ingredientTexts = (recipe.ingredients ?? []).map((i) => i.text);
  const allergenCheck = checkAllergens(ingredientTexts, allergens);
  if (!allergenCheck.ok) {
    return {
      error: 'ALLERGEN_VIOLATION',
      details: { violations: allergenCheck.violations },
    };
  }

  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date();
  const mh = await prisma.mealHistory.create({
    data: {
      recipeId: recipe.id,
      userId,
      date: eatenAt,
      consumed: true,
    },
  });

  const servings = input.servings;
  return {
    id: (mh as { id: string }).id,
    totalCalories: recipe.calories * servings,
    totalProtein: recipe.protein * servings,
    totalCarbs: recipe.carbs * servings,
    totalFat: recipe.fat * servings,
    mealType: input.mealType,
    eatenAt: eatenAt.toISOString(),
  };
}

function isWriteTool(name: string): boolean {
  return WRITE_TOOL_NAMES.has(name as CoachToolName);
}

function isKnownTool(name: string): boolean {
  return READ_TOOL_NAMES.has(name as CoachToolName) || WRITE_TOOL_NAMES.has(name as CoachToolName);
}

function extractErrorCode(result: unknown): string | undefined {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    const code = (result as { error: unknown }).error;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

async function dispatchTool(
  args: RunCoachToolInput,
): Promise<unknown> {
  const { userId, name, input, tier } = args;

  if (isWriteTool(name) && tier !== 'premium') {
    return {
      error: 'PRO_FEATURE',
      feature: 'write_tools',
      message: 'Logging and plate composition are Pro features.',
    };
  }

  switch (name) {
    case 'get_pantry':
      return runGetPantry(userId);
    case 'get_today_remaining_macros':
      return runGetTodayRemainingMacros(userId);
    case 'find_recipes':
      return runFindRecipes(
        userId,
        (input ?? {}) as {
          cuisines?: string[];
          maxPrepMinutes?: number;
          minProtein?: number;
          maxCalories?: number;
        },
      );
    case 'search_cookbook':
      return runSearchCookbook(userId, (input ?? {}) as { query: string });
    case 'compose_plate':
      return runComposePlate(userId, (input ?? { slots: [] }) as ComposePlateInput);
    case 'log_meal':
      return runLogMeal(userId, (input ?? {}) as LogMealInput);
    default:
      throw new Error(`Unknown coach tool: ${name}`);
  }
}

export async function runCoachTool(
  args: RunCoachToolInput,
): Promise<RunCoachToolResult> {
  if (!isKnownTool(args.name)) {
    throw new Error(`Unknown coach tool: ${args.name}`);
  }

  const result = await dispatchTool(args);
  const errorCode = extractErrorCode(result);
  emitAnalytics('coach_tool_call', {
    userId: args.userId,
    tool: args.name,
    tier: args.tier,
    success: errorCode === undefined,
    ...(errorCode !== undefined ? { errorCode } : {}),
  });
  return { result };
}
