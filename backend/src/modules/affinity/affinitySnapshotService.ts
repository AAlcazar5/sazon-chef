// Group 10R-Phase2: Affinity snapshot — pure function that derives the user-state
// dimensions the Food Intel matcher and Kitchen IQ ranker need.
//
// Inputs are plain data; the controller wires the Prisma reads. This keeps the
// computation testable without touching the database.

export type GoalPhase = 'cut' | 'maintain' | 'bulk' | 'recomp';

export interface RecipeForAffinity {
  id: string;
  cuisine?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  ingredients: string[];
}

export interface CookingLogForAffinity {
  recipe: RecipeForAffinity;
  cookedAt: Date;
}

export interface SavedRecipeForAffinity {
  recipeId: string;
  rating: number | null;
  recipe?: RecipeForAffinity;
}

export interface RecipeFeedbackForAffinity {
  recipeId: string;
  liked: boolean;
  disliked: boolean;
}

export interface MacroGoalsForAffinity {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
}

export interface SnapshotInput {
  cookingLogs: CookingLogForAffinity[];
  savedRecipes: SavedRecipeForAffinity[];
  recipeFeedback: RecipeFeedbackForAffinity[];
  macroGoals: MacroGoalsForAffinity | null;
  fitnessGoal: string | null;
  activeMealPlanMode: string | null;
  now: Date;
}

export interface AffinitySnapshot {
  topAffinityIngredients: string[];
  rolling7dNutrientGaps: string[];
  goalPhase: GoalPhase;
  last7DaysIngredients: string[];
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_AFFINITY_CAP = 30;
const RATING_BOOST_THRESHOLD = 4;
const RATING_BOOST_FACTOR = 3;
const NUTRIENT_GAP_THRESHOLD = 0.80;

const IRON_RICH_KEYWORDS = [
  'spinach',
  'kale',
  'beef',
  'lentils',
  'beans',
  'liver',
  'sardines',
  'tofu',
  'chickpeas',
  'oysters',
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function mapFitnessGoalToPhase(
  fitnessGoal: string | null | undefined,
  activeMealPlanMode: string | null | undefined,
): GoalPhase {
  // Active meal plan mode overrides — short-term planning beats long-term goal.
  if (activeMealPlanMode) {
    const mode = activeMealPlanMode.toLowerCase();
    if (mode === 'cut') return 'cut';
    if (mode === 'maintain') return 'maintain';
    if (mode === 'build' || mode === 'bulk') return 'bulk';
  }

  if (fitnessGoal) {
    const goal = fitnessGoal.toLowerCase();
    if (goal === 'lose_weight') return 'cut';
    if (goal === 'maintain') return 'maintain';
    if (goal === 'gain_muscle' || goal === 'gain_weight') return 'bulk';
  }

  return 'maintain';
}

function computeTopAffinityIngredients(input: SnapshotInput): string[] {
  const cutoff = input.now.getTime() - NINETY_DAYS_MS;
  const dislikedRecipeIds = new Set(
    input.recipeFeedback.filter((f) => f.disliked).map((f) => f.recipeId),
  );
  const ratingByRecipeId: Record<string, number> = {};
  for (const sr of input.savedRecipes) {
    if (typeof sr.rating === 'number') ratingByRecipeId[sr.recipeId] = sr.rating;
  }

  const counts: Record<string, number> = {};

  // Cooks within 90 days, weighted +1 per cook (×3 if rating ≥ 4).
  for (const log of input.cookingLogs) {
    if (log.cookedAt.getTime() < cutoff) continue;
    if (dislikedRecipeIds.has(log.recipe.id)) continue;
    const rating = ratingByRecipeId[log.recipe.id];
    const weight = rating !== undefined && rating >= RATING_BOOST_THRESHOLD
      ? RATING_BOOST_FACTOR
      : 1;
    for (const ing of log.recipe.ingredients) {
      const key = normalize(ing);
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + weight;
    }
  }

  // Highly-rated saved recipes (even if never cooked) seed the top list.
  for (const sr of input.savedRecipes) {
    if (sr.rating === null || sr.rating < RATING_BOOST_THRESHOLD) continue;
    if (!sr.recipe) continue;
    if (dislikedRecipeIds.has(sr.recipeId)) continue;
    for (const ing of sr.recipe.ingredients) {
      const key = normalize(ing);
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + RATING_BOOST_FACTOR;
    }
  }

  const ranked = Object.entries(counts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, TOP_AFFINITY_CAP)
    .map(([name]) => name);

  return ranked;
}

function computeRolling7dGaps(input: SnapshotInput): string[] {
  const cutoff = input.now.getTime() - SEVEN_DAYS_MS;
  const recent = input.cookingLogs.filter((l) => l.cookedAt.getTime() >= cutoff);

  if (recent.length === 0 || !input.macroGoals) return [];

  const totals = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const ingredients = new Set<string>();
  for (const log of recent) {
    totals.protein += log.recipe.protein ?? 0;
    totals.carbs += log.recipe.carbs ?? 0;
    totals.fat += log.recipe.fat ?? 0;
    totals.fiber += log.recipe.fiber ?? 0;
    for (const ing of log.recipe.ingredients) ingredients.add(normalize(ing));
  }

  const dailyAvg = {
    protein: totals.protein / 7,
    carbs: totals.carbs / 7,
    fat: totals.fat / 7,
    fiber: totals.fiber / 7,
  };

  const gaps: string[] = [];
  const target = input.macroGoals;
  if (dailyAvg.protein < target.protein * NUTRIENT_GAP_THRESHOLD) gaps.push('protein');
  if (target.fiber !== null && dailyAvg.fiber < target.fiber * NUTRIENT_GAP_THRESHOLD) {
    gaps.push('fiber');
  }
  // Iron isn't tracked numerically — heuristic from ingredient keywords.
  const hasIronRich = IRON_RICH_KEYWORDS.some((kw) =>
    [...ingredients].some((ing) => ing.includes(kw)),
  );
  if (!hasIronRich) gaps.push('iron');

  return gaps;
}

function computeLast7DaysIngredients(input: SnapshotInput): string[] {
  const cutoff = input.now.getTime() - SEVEN_DAYS_MS;
  const seen = new Set<string>();
  for (const log of input.cookingLogs) {
    if (log.cookedAt.getTime() < cutoff) continue;
    for (const ing of log.recipe.ingredients) {
      const key = normalize(ing);
      if (key) seen.add(key);
    }
  }
  return [...seen].sort();
}

export function computeAffinitySnapshot(input: SnapshotInput): AffinitySnapshot {
  return {
    topAffinityIngredients: computeTopAffinityIngredients(input),
    rolling7dNutrientGaps: computeRolling7dGaps(input),
    goalPhase: mapFitnessGoalToPhase(input.fitnessGoal, input.activeMealPlanMode),
    last7DaysIngredients: computeLast7DaysIngredients(input),
  };
}
