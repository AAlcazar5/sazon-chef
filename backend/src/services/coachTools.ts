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
import { computeSkillTier, type SkillTier } from '@/services/skillTierService';
import type {
  CoachProfileInput,
  GoalPhase,
} from '@/services/coachPromptService';

export type CoachToolName =
  | 'search_cookbook'
  | 'get_pantry'
  | 'get_today_remaining_macros'
  | 'find_recipes'
  | 'find_recipes_smart'
  | 'propose_tonight'
  | 'compose_plate'
  | 'log_meal'
  // S16 — universal-agent expansion (4 read + 3 write tools).
  | 'get_meal_plan'
  | 'get_shopping_list'
  | 'get_user_profile'
  | 'get_recipe_detail'
  | 'add_to_shopping_list'
  | 'schedule_meal'
  | 'generate_recipe';

const READ_TOOL_NAMES: ReadonlySet<CoachToolName> = new Set([
  'search_cookbook',
  'get_pantry',
  'get_today_remaining_macros',
  'find_recipes',
  'find_recipes_smart',
  'propose_tonight',
  'get_meal_plan',
  'get_shopping_list',
  'get_user_profile',
  'get_recipe_detail',
]);

const WRITE_TOOL_NAMES: ReadonlySet<CoachToolName> = new Set([
  'compose_plate',
  'log_meal',
  'add_to_shopping_list',
  'schedule_meal',
  'generate_recipe',
]);

export const coachToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'search_cookbook',
    description:
      "Search the user's saved + recently-cooked recipes — personalized ranking that boosts recent + highly-rated. Use for 'what have I made with X' / revisit-a-recipe questions.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Matched against recipe title/cuisine.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_pantry',
    description: "Current pantry items + leftover inventory.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today_remaining_macros',
    description:
      "Macro goals minus today's intake. Use for 'do I have room for X' questions. Null fields if no goals set.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'find_recipes',
    description:
      "Personalized recipe list ranked for this user (70/30 macro/taste + pantry coverage + cuisine adjacency). Every row carries pantryCoverage / macroFit / affinityScore. Pass forHouseholdMemberId to rank for that household member instead of the account holder.",
    input_schema: {
      type: 'object',
      properties: {
        cuisines: { type: 'array', items: { type: 'string' } },
        maxPrepMinutes: { type: 'number' },
        minProtein: { type: 'number' },
        maxCalories: { type: 'number' },
        forHouseholdMemberId: { type: 'string' },
      },
    },
  },
  {
    name: 'find_recipes_smart',
    description:
      "Embedding-based recipe retrieval (cosine over cook-history). Up to 5 candidates with allergens + dietary applied. Prefer over find_recipes for 'what should I eat' / 'try a new dish' when no specific constraint is given. Returns { error: 'retrieval_unavailable' } on cold-start.",
    input_schema: {
      type: 'object',
      properties: {
        maxCookTime: { type: 'number' },
        minPantryCoverage: {
          type: 'number',
          description: '0..1 fraction of recipe ingredients already in pantry.',
        },
      },
    },
  },
  {
    name: 'propose_tonight',
    description:
      "PRIMARY 'what should I eat tonight' tool — same engine as the home-feed hero. Returns { recipeId, title, copyLine, eventId }. Errors: cold_start | low_confidence | ranker_unavailable.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'compose_plate',
    description:
      "PRO-ONLY WRITE. Compose + persist a Build-a-Plate from per-slot component IDs or queries. Only call after explicit user confirmation. Allergen-checked.",
    input_schema: {
      type: 'object',
      properties: {
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slot: { type: 'string', enum: ['protein', 'veg', 'carb', 'sauce', 'extra'] },
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
      "PRO-ONLY WRITE. Record an eaten meal to history. Only call after explicit user confirmation. Exactly one of recipeId / plateId / foodItemId. Allergen-checked.",
    input_schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string' },
        plateId: { type: 'string' },
        foodItemId: { type: 'string' },
        servings: { type: 'number' },
        mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        eatenAt: { type: 'string' },
      },
      required: ['servings', 'mealType'],
    },
  },
  // ─── S16 — universal-agent reads ─────────────────────────────────────────
  {
    name: 'get_meal_plan',
    description:
      "Active week meal plan, flattened to (date, mealType) slots. Use for 'what's on my plan' / 'do I have something Wednesday'.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_shopping_list',
    description:
      "Active shopping list — items grouped by category with purchased state. Use for 'what's on my list' / 'do I need eggs'.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_user_profile',
    description:
      "User preference profile: allergens, dietary, liked cuisines, skill tier, macro goals. Use for safety-sensitive or taste-personalization questions.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recipe_detail',
    description:
      'Full recipe by id — ingredients, instructions, macros, cuisine, source. Use to walk a recipe step-by-step or ground a swap.',
    input_schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: 'From any prior tool result.' },
      },
      required: ['recipeId'],
    },
  },
  // ─── S16 — universal-agent writes (Pro-only, explicit-confirm-only) ──────
  {
    name: 'add_to_shopping_list',
    description:
      "PRO-ONLY WRITE. Append items to the active shopping list (creates one if missing). Only call after explicit user confirmation.",
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              category: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'schedule_meal',
    description:
      "PRO-ONLY WRITE. Drop a recipe into the active week plan at (date, mealType). Replaces existing slot. Date ISO YYYY-MM-DD. Only call after explicit user confirmation. Allergen-checked.",
    input_schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string' },
        date: { type: 'string' },
        mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      },
      required: ['recipeId', 'date', 'mealType'],
    },
  },
  {
    name: 'generate_recipe',
    description:
      "PRO-ONLY WRITE. AI-generate a recipe from a free-text brief, persist to cookbook, allergen-checked. Only call when the user explicitly asks or accepts.",
    input_schema: {
      type: 'object',
      properties: {
        brief: {
          type: 'string',
          description: "What the user wants (e.g. 'fesenjan with mushrooms instead of walnuts, 30 min').",
        },
        mealType: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'],
        },
        cuisineOverride: { type: 'string' },
        maxCookTime: { type: 'number' },
      },
      required: ['brief'],
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
  memberAffinityNames: readonly string[] = [],
) {
  const likedCuisines = prefs?.likedCuisines.map((c) => c.name) ?? [];
  const lowerNames = memberAffinityNames.map((n) => n.toLowerCase());
  return recipes
    .map((r) => {
      const score = calculateRecipeScore(r, prefs, macroGoals);
      const pantryCoverage = computePantryCoverage(r, pantryNames);
      const adjacencyBoost = calculateAdjacencyBoost(
        likedCuisines,
        r.cuisine,
        0.3,
      );
      // Per-member affinity boost: count high-affinity component names that
      // appear in the recipe's ingredients. Each match adds 5 points so a
      // member-scoped query produces a *materially different* ranking from the
      // default account-level query.
      let memberBoost = 0;
      if (lowerNames.length > 0) {
        const hay = r.ingredients.map((i) => i.text.toLowerCase()).join(' | ');
        for (const name of lowerNames) {
          if (hay.includes(name)) memberBoost += 5;
        }
      }
      const affinityScore = score.total + adjacencyBoost * 100 + memberBoost;
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
    forHouseholdMemberId?: string;
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

  const allergenNames = ((prefs as PrefsShape | null)?.bannedIngredients ?? []).map((b) => b.name);
  const safeRecipes: RecipeShape[] = [];
  let filteredForAllergens = 0;
  for (const r of recipes) {
    const ingredientTexts = r.ingredients.map((i) => i.text);
    const check = checkAllergens(ingredientTexts, allergenNames);
    if (check.ok) {
      safeRecipes.push(r);
    } else {
      filteredForAllergens += 1;
    }
  }
  const memberAffinityNames = input.forHouseholdMemberId
    ? await loadMemberAffinityComponentNames(userId, input.forHouseholdMemberId)
    : [];
  const ranked = rankRecipes(
    safeRecipes,
    prefs as PrefsShape | null,
    macroGoals,
    pantryNames,
    remaining,
    memberAffinityNames,
  );
  return { recipes: ranked.slice(0, 8), filteredForAllergens };
}

// ─── Tier S S4.1: find_recipes_smart via TB1 retrieval ──────────────────
async function runFindRecipesSmart(
  userId: string,
  input: { maxCookTime?: number; minPantryCoverage?: number },
): Promise<unknown> {
  // Lazy import to avoid Prisma init in unit tests that mock coachTools.
  const { resolveRetrievalCandidates } = await import(
    './recommender/homeFeedRetrievalAdapter'
  );

  const allergens = await loadUserAllergens(userId);
  let result;
  try {
    result = await resolveRetrievalCandidates({
      userId,
      enabled: true,
      k: 12,
      hardFilters: {
        allergens,
        dietaryTags: [],
        maxCookTime: typeof input.maxCookTime === 'number' ? input.maxCookTime : null,
        pantryItems: [],
        minPantryCoverage:
          typeof input.minPantryCoverage === 'number' ? input.minPantryCoverage : 0,
      },
    });
  } catch {
    return { error: 'retrieval_unavailable' };
  }
  if (!result || result.recipeIds.length === 0) {
    return { error: 'retrieval_unavailable' };
  }

  const recipes = (await prisma.recipe.findMany({
    where: { id: { in: result.recipeIds } },
    select: {
      id: true,
      title: true,
      cuisine: true,
      cookTime: true,
      calories: true,
      protein: true,
      imageUrl: true,
    } as any,
  } as any)) as unknown as Array<{
    id: string;
    title: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    imageUrl: string | null;
  }>;

  const scoreById = new Map(
    result.recipeIds.map((id, i) => [id, result.scores[i] ?? 0]),
  );
  const ranked = recipes
    .map((r) => ({
      id: r.id,
      title: r.title,
      cuisine: r.cuisine,
      cookTime: r.cookTime,
      calories: r.calories,
      protein: r.protein,
      imageUrl: r.imageUrl ?? null,
      retrievalScore: Number((scoreById.get(r.id) ?? 0).toFixed(3)),
    }))
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, 5);

  return { recipes: ranked, source: 'tb1_retrieval' };
}

// ─── Tier S S4.2: propose_tonight via TB2 ranker ────────────────────────
async function runProposeTonight(userId: string): Promise<unknown> {
  const { resolveRetrievalCandidates } = await import(
    './recommender/homeFeedRetrievalAdapter'
  );
  const { rankWithLLM } = await import('./recommender/recommenderService');
  const { recordProposal } = await import(
    './recommender/recommenderEventService'
  );

  type RC = import('./recommender/recommenderService').RankCandidate;
  type UC = import('./recommender/recommenderService').UserContext;

  const now = new Date();
  let retrieval;
  try {
    retrieval = await resolveRetrievalCandidates({
      userId,
      enabled: true,
      k: 25,
    });
  } catch {
    return { error: 'ranker_unavailable' };
  }
  if (!retrieval || retrieval.recipeIds.length === 0) {
    return { error: 'cold_start' };
  }

  const recipes = (await prisma.recipe.findMany({
    where: { id: { in: retrieval.recipeIds } },
    select: { id: true, title: true, cuisine: true, cookTime: true } as any,
  } as any)) as Array<{
    id: string;
    title: string;
    cuisine: string;
    cookTime: number;
  }>;
  const scoreById = new Map(
    retrieval.recipeIds.map((id, i) => [id, retrieval.scores[i] ?? 0]),
  );
  const candidates: RC[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    cookTime: r.cookTime,
    retrievalScore: scoreById.get(r.id) ?? 0,
  }));
  if (candidates.length === 0) return { error: 'cold_start' };

  const userContext: UC = {
    tasteSummary: 'lifestyle eater, varied cuisines',
    lastCooks: [],
    dietary: [],
    pantrySummary: '',
    timeOfDay: 'evening',
    dayOfWeek: 'today',
    daysSinceCook: 0,
    expiringItems: [],
  };

  let pick;
  try {
    pick = await rankWithLLM({
      userContext,
      candidates,
      confidenceThreshold: 0.6,
    });
  } catch {
    return { error: 'ranker_unavailable' };
  }
  if (!pick) return { error: 'low_confidence' };

  const eventId = await recordProposal({
    userId,
    asOf: now,
    contextSnapshot: { surface: 'coach' },
    candidateIds: candidates.map((c) => c.id),
    pickedRecipeId: pick.recipeId,
    runnerUpIds: pick.runnerUpIds,
    confidence: pick.confidence,
    copyLine: pick.reason,
    source: pick.source,
  });

  const picked = recipes.find((r) => r.id === pick.recipeId);
  return {
    recipeId: pick.recipeId,
    title: picked?.title ?? '',
    cuisine: picked?.cuisine ?? '',
    copyLine: pick.reason,
    confidence: pick.confidence,
    eventId,
  };
}

// ─── Tier S S4.3: write RecommenderEvent outcome on accepted recipe ─────
// When the user logs/saves a recipe Sazon proposed in this conversation,
// we mark the proposal as `accepted` so the data flywheel learns from coach
// turns the same way it learns from /api/tonight outcomes.
async function recordCoachAcceptOutcome(
  userId: string,
  recipeId: string,
): Promise<void> {
  try {
    const { recordOutcome } = await import(
      './recommender/recommenderEventOutcomeService'
    );
    // Find the most-recent uncompleted proposal that picked this recipe in
    // the last 60 minutes (a coach turn that landed on this recipe).
    const sinceMs = 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - sinceMs);
    const event = await (prisma as any).recommenderEvent.findFirst({
      where: {
        userId,
        pickedRecipeId: recipeId,
        createdAt: { gte: cutoff },
        outcome: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!event?.id) return;
    await recordOutcome({ eventId: event.id, outcome: 'accepted', latencyMs: 0 });
  } catch {
    // Never let event logging break the user-facing reply.
  }
}

async function loadMemberAffinityComponentNames(
  userId: string,
  householdMemberId: string,
): Promise<string[]> {
  // Defence-in-depth: verify the member belongs to the caller before issuing
  // the affinity query. The slotAffinity scope already filters by userId, so
  // a foreign id would return empty rows — but the LLM-supplied id should
  // never reach the DB query in the first place.
  const member = await prisma.householdMember.findFirst({
    where: { id: householdMemberId, userId },
    select: { id: true },
  });
  if (!member) {
    return [];
  }

  const prismaUntyped = prisma as unknown as Record<string, PrismaModelMaybe>;
  const rows = await safeFindMany<{ score: number; component: { name: string } | null }>(
    prismaUntyped.slotAffinity,
    {
      where: { userId, householdMemberId, score: { gt: 0 } },
      include: { component: { select: { name: true } } },
      orderBy: { score: 'desc' },
      take: 20,
    },
  );
  return rows
    .map((r) => r.component?.name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
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

  const allergenNames = ((prefs as PrefsShape | null)?.bannedIngredients ?? []).map((b) => b.name);
  let filteredForAllergens = 0;
  const safeSaved = filtered.filter((s) => {
    const r = s.recipe as unknown as RecipeShape;
    const ingredientTexts = r.ingredients.map((i) => i.text);
    const check = checkAllergens(ingredientTexts, allergenNames);
    if (!check.ok) {
      filteredForAllergens += 1;
      return false;
    }
    return true;
  });

  const recipes = safeSaved.map((s) => s.recipe as unknown as RecipeShape);
  const ratingByRecipe = new Map<string, number | null>();
  for (const s of safeSaved) {
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

  return { recipes: ranked, filteredForAllergens };
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

// Tokenize an ingredient string by non-word boundaries, lowercase each token,
// and strip a trailing 's' for naive plural handling. "Coconut milk" →
// ["coconut", "milk"]; "peanuts" → ["peanut"]. This avoids the Sec H2 bug
// where `String.includes` matched "nut" inside "coconut".
function tokenizeIngredient(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 0)
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

function bannedTokens(banned: string): string[] {
  return banned
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 0)
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

export function checkAllergens(
  ingredientTexts: string[],
  bannedIngredientNames: string[],
): AllergenCheckResult {
  if (bannedIngredientNames.length === 0) return { ok: true, violations: [] };
  const ingredientTokenSets = ingredientTexts.map((t) => new Set(tokenizeIngredient(t)));
  const violations: string[] = [];
  for (const banned of bannedIngredientNames) {
    const tokens = bannedTokens(banned);
    if (tokens.length === 0) continue;
    // Multi-word banned (e.g. "shellfish broth") matches if every token is
    // present in any single ingredient. Single-word banned matches that token.
    const hit = ingredientTokenSets.some((set) => tokens.every((t) => set.has(t)));
    if (hit) violations.push(banned);
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
    // Restrict to seed components (userId: null) or components owned by the
    // caller. Without this, a guessed/leaked componentId from another user's
    // private library would resolve and end up on this user's plate.
    const rows = (await prisma.mealComponent.findMany({
      where: { id: componentId, OR: [{ userId: null }, { userId }] },
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

  // Tier S S4.3: if Sazon proposed this recipe in the last hour (via
  // propose_tonight), mark that proposal's outcome as `accepted`. Closes the
  // TB3 data-flywheel loop for coach-driven cooks. Fire-and-forget; never
  // surface an error to the user.
  void recordCoachAcceptOutcome(userId, recipe.id);

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

// ─── S16 — universal-agent read tools ───────────────────────────────────────

interface MealPlanSlot {
  id: string;
  date: string;
  mealType: string;
  recipeId: string | null;
  recipeTitle: string | null;
  isCompleted: boolean;
  customName: string | null;
}

async function runGetMealPlan(userId: string): Promise<unknown> {
  const plan = (await prisma.mealPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: 'desc' },
    include: {
      meals: {
        include: { recipe: { select: { id: true, title: true } } },
        orderBy: [{ date: 'asc' }],
      },
    },
  })) as null | {
    id: string;
    name: string | null;
    startDate: Date;
    endDate: Date;
    meals: Array<{
      id: string;
      date: Date;
      mealType: string;
      recipeId: string | null;
      recipe: { id: string; title: string } | null;
      isCompleted: boolean;
      customName: string | null;
    }>;
  };

  if (!plan) {
    return { plan: null, slots: [] as MealPlanSlot[] };
  }
  const slots: MealPlanSlot[] = plan.meals.map((m) => ({
    id: m.id,
    date: m.date.toISOString().slice(0, 10),
    mealType: m.mealType,
    recipeId: m.recipe?.id ?? null,
    recipeTitle: m.recipe?.title ?? null,
    isCompleted: m.isCompleted,
    customName: m.customName,
  }));
  return {
    plan: {
      id: plan.id,
      name: plan.name,
      startDate: plan.startDate.toISOString().slice(0, 10),
      endDate: plan.endDate.toISOString().slice(0, 10),
    },
    slots,
  };
}

async function runGetShoppingList(userId: string): Promise<unknown> {
  const list = (await prisma.shoppingList.findFirst({
    where: { userId, isActive: true, tier: 'active' },
    orderBy: { updatedAt: 'desc' },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          category: true,
          purchased: true,
          recipeId: true,
        },
        orderBy: [{ purchased: 'asc' }, { category: 'asc' }, { name: 'asc' }],
      },
    },
  })) as null | {
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      quantity: string;
      category: string | null;
      purchased: boolean;
      recipeId: string | null;
    }>;
  };

  if (!list) {
    return { list: null, items: [] };
  }
  return {
    list: { id: list.id, name: list.name },
    items: list.items,
  };
}

async function runGetUserProfile(userId: string): Promise<unknown> {
  // computeSkillTier takes a count, not a userId — fetch the count first.
  // Wrap the call in try/catch so a missing composedPlate count never breaks
  // the whole profile read.
  let skill: SkillTier | null = null;
  try {
    const platesCooked = await (prisma as any).composedPlate.count({
      where: { userId },
    });
    skill = computeSkillTier(Number(platesCooked) || 0);
  } catch {
    skill = null;
  }
  const [prefs, macroGoals] = await Promise.all([
    prisma.userPreferences.findUnique({
      where: { userId },
      include: {
        bannedIngredients: true,
        likedCuisines: true,
        dietaryRestrictions: true,
        preferredSuperfoods: true,
      },
    }) as unknown as Promise<{
      cookTimePreference?: number | null;
      spiceLevel?: string | null;
      bannedIngredients: Array<{ name: string }>;
      likedCuisines: Array<{ name: string }>;
      dietaryRestrictions: Array<{ name: string }>;
    } | null>,
    prisma.macroGoals.findUnique({ where: { userId } }),
  ]);
  return {
    allergies: (prefs?.bannedIngredients ?? []).map((b: { name: string }) => b.name),
    dietaryRestrictions: (prefs?.dietaryRestrictions ?? []).map(
      (d: { name: string }) => d.name,
    ),
    likedCuisines: (prefs?.likedCuisines ?? []).map((c: { name: string }) => c.name),
    cookTimePreference: prefs?.cookTimePreference ?? null,
    spiceLevel: prefs?.spiceLevel ?? null,
    skillTier: skill,
    macroGoals: macroGoals
      ? {
          calories: macroGoals.calories,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fat: macroGoals.fat,
        }
      : null,
  };
}

interface GetRecipeDetailInput {
  recipeId: string;
}

async function runGetRecipeDetail(
  input: GetRecipeDetailInput,
): Promise<unknown> {
  if (!input.recipeId) {
    return { error: 'INVALID_INPUT', message: 'recipeId required' };
  }
  const recipe = (await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    include: {
      ingredients: { select: { text: true, order: true }, orderBy: { order: 'asc' } },
      instructions: { select: { text: true, step: true }, orderBy: { step: 'asc' } },
    },
  })) as null | {
    id: string;
    title: string;
    description: string | null;
    cuisine: string | null;
    cookTime: number | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    imageUrl: string | null;
    source: string | null;
    sourceUrl: string | null;
    ingredients: Array<{ text: string; order: number }>;
    instructions: Array<{ text: string; step: number }>;
  };
  if (!recipe) {
    return { error: 'NOT_FOUND', message: `Recipe ${input.recipeId} not found.` };
  }
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    cookTime: recipe.cookTime,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    fiber: recipe.fiber,
    imageUrl: recipe.imageUrl,
    source: recipe.source,
    sourceUrl: recipe.sourceUrl,
    ingredients: recipe.ingredients.map((i) => i.text),
    instructions: recipe.instructions.map((i) => i.text),
  };
}

// ─── S16 — universal-agent write tools (Pro-only) ───────────────────────────

interface AddToShoppingListInput {
  items: Array<{ name: string; quantity?: string; category?: string }>;
}

async function runAddToShoppingList(
  userId: string,
  input: AddToShoppingListInput,
): Promise<unknown> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { error: 'INVALID_INPUT', message: 'items[] required' };
  }
  const cleaned = input.items
    .filter((i) => i && typeof i.name === 'string' && i.name.trim().length > 0)
    .slice(0, 50);
  if (cleaned.length === 0) {
    return { error: 'INVALID_INPUT', message: 'no items with names' };
  }

  let list = (await prisma.shoppingList.findFirst({
    where: { userId, isActive: true, tier: 'active' },
    orderBy: { updatedAt: 'desc' },
  })) as null | { id: string };
  if (!list) {
    list = (await prisma.shoppingList.create({
      data: { userId, name: 'My Shopping List', isActive: true, tier: 'active' },
    })) as { id: string };
  }
  const created = await prisma.$transaction(
    cleaned.map((it) =>
      prisma.shoppingListItem.create({
        data: {
          shoppingListId: list!.id,
          name: it.name.trim(),
          quantity: it.quantity?.trim() || '',
          category: it.category?.trim() || null,
          purchased: false,
        },
        select: { id: true, name: true },
      }),
    ),
  );
  return { listId: list.id, addedCount: created.length, items: created };
}

interface ScheduleMealInput {
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

async function runScheduleMeal(
  userId: string,
  input: ScheduleMealInput,
): Promise<unknown> {
  if (!input.recipeId || !input.date || !input.mealType) {
    return { error: 'INVALID_INPUT', message: 'recipeId, date, mealType required' };
  }
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: 'INVALID_INPUT', message: 'date must be ISO YYYY-MM-DD' };
  }
  const recipe = (await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    select: { id: true, title: true, ingredients: { select: { text: true } } },
  })) as null | {
    id: string;
    title: string;
    ingredients: Array<{ text: string }>;
  };
  if (!recipe) {
    return { error: 'NOT_FOUND', message: `Recipe ${input.recipeId} not found.` };
  }

  const prefs = (await prisma.userPreferences.findUnique({
    where: { userId },
    include: { bannedIngredients: true },
  })) as null | { bannedIngredients: Array<{ name: string }> };
  const allergens = (prefs?.bannedIngredients ?? []).map((b) => b.name);
  const allergenCheck = checkAllergens(
    recipe.ingredients.map((i) => i.text),
    allergens,
  );
  if (!allergenCheck.ok) {
    return {
      error: 'ALLERGEN_VIOLATION',
      details: { violations: allergenCheck.violations },
    };
  }

  // Find or create the active meal plan that covers this date.
  let plan = (await prisma.mealPlan.findFirst({
    where: {
      userId,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  })) as null | { id: string; startDate: Date; endDate: Date };
  if (!plan) {
    // Default: a one-week window starting Monday-of the date.
    const start = new Date(date);
    const day = start.getUTCDay();
    const offsetToMonday = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - offsetToMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    plan = (await prisma.mealPlan.create({
      data: { userId, isActive: true, startDate: start, endDate: end },
    })) as { id: string; startDate: Date; endDate: Date };
  }

  // Replace any existing meal in this slot.
  await prisma.meal.deleteMany({
    where: {
      mealPlanId: plan.id,
      date,
      mealType: input.mealType,
    },
  });
  const meal = (await prisma.meal.create({
    data: {
      mealPlanId: plan.id,
      date,
      mealType: input.mealType,
      recipeId: recipe.id,
    },
  })) as { id: string };

  return {
    mealId: meal.id,
    planId: plan.id,
    date: input.date,
    mealType: input.mealType,
    recipeId: recipe.id,
    recipeTitle: recipe.title,
  };
}

interface GenerateRecipeInput {
  brief: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  cuisineOverride?: string;
  maxCookTime?: number;
}

async function runGenerateRecipe(
  userId: string,
  input: GenerateRecipeInput,
): Promise<unknown> {
  if (!input.brief || input.brief.trim().length < 4) {
    return { error: 'INVALID_INPUT', message: 'brief required (≥4 chars)' };
  }

  // Lazy-require so unit tests that mock prisma don't pull the AI provider stack.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { aiRecipeService } = require('@/services/aiRecipeService') as {
    aiRecipeService: {
      generateRecipe: (params: {
        userId: string;
        mealType?: string;
        cuisineOverride?: string | null;
        userPrompt?: string;
        maxCookTime?: number;
      }) => Promise<unknown>;
      saveGeneratedRecipe: (
        recipe: unknown,
        userId: string | null,
      ) => Promise<{ id: string; title: string } | null>;
    };
  };

  try {
    const generated = await aiRecipeService.generateRecipe({
      userId,
      mealType: input.mealType,
      cuisineOverride: input.cuisineOverride ?? null,
      userPrompt: input.brief.trim(),
      maxCookTime: input.maxCookTime,
    });
    const saved = await aiRecipeService.saveGeneratedRecipe(generated, userId);
    if (!saved) {
      return { error: 'SAVE_FAILED', message: 'Recipe generated but persist failed.' };
    }
    return {
      recipeId: saved.id,
      title: saved.title,
      generated,
    };
  } catch (err) {
    return {
      error: 'GENERATION_FAILED',
      message: err instanceof Error ? err.message : 'unknown',
    };
  }
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
    case 'find_recipes_smart':
      return runFindRecipesSmart(
        userId,
        (input ?? {}) as { maxCookTime?: number; minPantryCoverage?: number },
      );
    case 'propose_tonight':
      return runProposeTonight(userId);
    case 'search_cookbook':
      return runSearchCookbook(userId, (input ?? {}) as { query: string });
    case 'compose_plate':
      return runComposePlate(userId, (input ?? { slots: [] }) as ComposePlateInput);
    case 'log_meal':
      return runLogMeal(userId, (input ?? {}) as LogMealInput);
    // S16 — universal-agent reads
    case 'get_meal_plan':
      return runGetMealPlan(userId);
    case 'get_shopping_list':
      return runGetShoppingList(userId);
    case 'get_user_profile':
      return runGetUserProfile(userId);
    case 'get_recipe_detail':
      return runGetRecipeDetail((input ?? {}) as GetRecipeDetailInput);
    // S16 — universal-agent writes
    case 'add_to_shopping_list':
      return runAddToShoppingList(userId, (input ?? { items: [] }) as AddToShoppingListInput);
    case 'schedule_meal':
      return runScheduleMeal(userId, (input ?? {}) as ScheduleMealInput);
    case 'generate_recipe':
      return runGenerateRecipe(userId, (input ?? {}) as GenerateRecipeInput);
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

// ─── Phase 4 hardening: shared profile snapshot loader ───────────────────
// Reused by coachRoutes.buildCoachProfile so the system prompt has full N=1
// signal (pantry, leftovers, slot/pair/cuisine affinity, allergens, dietary
// profile, recent cooks, skill tier).

const LAST_7_COOKS_LIMIT = 7;
const SLOT_AFFINITY_LIMIT = 60;
const PAIR_AFFINITY_LIMIT = 40;

function resolveGoalPhaseFromFitnessGoal(
  fitnessGoal: string | null | undefined,
): GoalPhase {
  switch (fitnessGoal) {
    case 'lose_weight':
      return 'cut';
    case 'gain_muscle':
    case 'gain_weight':
      return 'bulk';
    case 'recomp':
      return 'recomp';
    default:
      return 'maintain';
  }
}

function tierToString(tier: SkillTier): string {
  return tier;
}

interface PrismaModelMaybe {
  findMany?: (...args: unknown[]) => Promise<unknown[]>;
  findUnique?: (...args: unknown[]) => Promise<unknown>;
  count?: (...args: unknown[]) => Promise<number>;
}

async function safeFindMany<T>(
  model: PrismaModelMaybe | undefined,
  args: unknown,
): Promise<T[]> {
  if (!model || typeof model.findMany !== 'function') return [];
  return (await model.findMany(args)) as T[];
}

async function safeFindUnique<T>(
  model: PrismaModelMaybe | undefined,
  args: unknown,
): Promise<T | null> {
  if (!model || typeof model.findUnique !== 'function') return null;
  return (await model.findUnique(args)) as T | null;
}

async function safeCount(
  model: PrismaModelMaybe | undefined,
  args: unknown,
): Promise<number> {
  if (!model || typeof model.count !== 'function') return 0;
  return await model.count(args);
}

export async function buildCoachProfileSnapshot(
  userId: string,
): Promise<CoachProfileInput> {
  const prismaUntyped = prisma as unknown as Record<string, PrismaModelMaybe>;

  // Each loader is wrapped in a safe-* helper because some test fixtures only
  // mock a subset of prisma models. Missing model → empty default.
  const [
    pantryRows,
    leftoverRows,
    slotAffinityRows,
    pairAffinityRows,
    macroGoals,
    physical,
    todayMealsMaybe,
    prefs,
    cookingLogs,
    platesCount,
  ] = await Promise.all([
    safeFindMany<{ name: string }>(prismaUntyped.pantryItem, { where: { userId } }),
    safeFindMany<{ componentId: string; portionsRemaining: number; expiresAt: Date }>(
      prismaUntyped.leftoverInventory,
      { where: { userId } },
    ),
    safeFindMany<{ componentId: string; slot: string; score: number }>(
      prismaUntyped.slotAffinity,
      {
        // Coach prompt uses the household head's own affinity context — per-
        // member rows are excluded so the cached system prompt stays N=1 for
        // the account holder, not noisy from kid plates.
        where: { userId, householdMemberId: null },
        orderBy: { score: 'desc' },
        take: SLOT_AFFINITY_LIMIT,
      },
    ),
    safeFindMany<{ componentIdA: string; componentIdB: string; score: number }>(
      prismaUntyped.pairAffinity,
      {
        where: { userId },
        orderBy: { score: 'desc' },
        take: PAIR_AFFINITY_LIMIT,
      },
    ),
    safeFindUnique<{
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number | null;
    }>(prismaUntyped.macroGoals, { where: { userId } }),
    safeFindUnique<{ fitnessGoal: string | null }>(
      prismaUntyped.userPhysicalProfile,
      { where: { userId } },
    ),
    (typeof prismaUntyped.meal?.findMany === 'function'
      ? fetchTodayMeals(userId)
      : Promise.resolve([] as AggregatableMeal[])),
    safeFindUnique<PrefsShape & { dietaryRestrictions?: Array<{ name: string }> }>(
      prismaUntyped.userPreferences,
      {
        where: { userId },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
        },
      },
    ),
    safeFindMany<{
      recipeId: string;
      cookedAt: Date;
      recipe?: { id: string; title: string } | null;
    }>(prismaUntyped.cookingLog, {
      where: { userId },
      orderBy: { cookedAt: 'desc' },
      take: LAST_7_COOKS_LIMIT,
      include: { recipe: { select: { id: true, title: true } } },
    }),
    safeCount(prismaUntyped.composedPlate, { where: { userId } }),
  ]);
  const todayMeals = todayMealsMaybe;

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

  const remainingMacros = macroGoals
    ? {
        calories: macroGoals.calories - consumed.calories,
        protein: macroGoals.protein - consumed.protein,
        carbs: macroGoals.carbs - consumed.carbs,
        fat: macroGoals.fat - consumed.fat,
        fiber:
          macroGoals.fiber !== null && macroGoals.fiber !== undefined
            ? macroGoals.fiber - consumed.fiber
            : null,
      }
    : null;

  const prefsTyped = prefs as
    | (PrefsShape & {
        dietaryRestrictions?: Array<{ name: string }>;
      })
    | null;
  const allergens = (prefsTyped?.bannedIngredients ?? []).map((b) => b.name);
  const dietaryProfile = (prefsTyped?.dietaryRestrictions ?? []).map((d) => d.name);
  const likedCuisines = (prefsTyped?.likedCuisines ?? []).map((c) => c.name);

  // Cuisine affinity: count cuisines from cooking logs, blend with liked.
  const cuisineCounts = new Map<string, number>();
  const last7Cooks = cookingLogs.map((log) => {
    const r = (log as { recipe?: { id: string; title: string } | null }).recipe;
    return {
      recipeId: r?.id ?? log.recipeId,
      title: r?.title ?? '',
      cookedAt: log.cookedAt,
      rating: null as number | null,
    };
  });
  for (const liked of likedCuisines) {
    cuisineCounts.set(liked, (cuisineCounts.get(liked) ?? 0) + 1);
  }
  const cuisineAffinity = Array.from(cuisineCounts.entries()).map(
    ([cuisine, score]) => ({ cuisine, score }),
  );

  const skillTier = tierToString(computeSkillTier(platesCount));

  return {
    userId,
    pantry: pantryRows.map((p) => p.name),
    leftoverInventory: leftoverRows.map((l) => ({
      name: l.componentId,
      portions: l.portionsRemaining,
      expiresAt: l.expiresAt,
    })),
    slotAffinity: slotAffinityRows.map((r) => ({
      componentId: r.componentId,
      slot: r.slot,
      score: r.score,
    })),
    pairAffinity: pairAffinityRows.map((r) => ({
      componentIdA: r.componentIdA,
      componentIdB: r.componentIdB,
      score: r.score,
    })),
    remainingMacros,
    last7Cooks,
    dietaryProfile,
    allergens,
    cuisineAffinity,
    skillTier,
    goalPhase: resolveGoalPhaseFromFitnessGoal(physical?.fitnessGoal),
    currentMealPlanDay: null,
  };
}
