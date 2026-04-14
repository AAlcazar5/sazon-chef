/**
 * Meal plan variety scoring — Group 10J.
 * Pure functions; no database access.
 */

const PROTEIN_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck',
  'salmon', 'tuna', 'cod', 'shrimp', 'fish', 'tilapia', 'halibut',
  'tofu', 'tempeh', 'seitan',
  'egg', 'eggs',
  'lentil', 'chickpea', 'bean', 'beans',
  'quinoa',
] as const;

export interface MealForVariety {
  id: string;
  date: string; // ISO date (YYYY-MM-DD) or full ISO string — only day is compared
  mealType: string;
  title: string;
  cuisine: string;
  ingredients: string[];
}

export interface VarietyScoreResult {
  score: number; // 0–100
  isBoringWeek: boolean;
  uniqueProteins: number;
  uniqueCuisines: number;
  consecutiveProteinRepeats: number;
  consecutiveCuisineRepeats: number;
  repeatedMealTitles: number;
}

export function extractMainProteinFromText(ingredients: readonly string[]): string | undefined {
  const top = ingredients.slice(0, 3);
  for (const ing of top) {
    const text = ing.toLowerCase();
    for (const keyword of PROTEIN_KEYWORDS) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }
  }
  return undefined;
}

interface ResolvedMeal extends MealForVariety {
  protein: string | undefined;
  dayKey: string;
}

function resolveMeals(meals: readonly MealForVariety[]): ResolvedMeal[] {
  return meals.map(m => ({
    ...m,
    protein: extractMainProteinFromText(m.ingredients),
    dayKey: m.date.slice(0, 10),
  }));
}

function countConsecutiveRepeats<T>(
  meals: readonly ResolvedMeal[],
  pick: (m: ResolvedMeal) => T | undefined,
): number {
  const byType = new Map<string, ResolvedMeal[]>();
  for (const m of meals) {
    const list = byType.get(m.mealType) ?? [];
    list.push(m);
    byType.set(m.mealType, list);
  }

  let repeats = 0;
  for (const list of byType.values()) {
    const sorted = [...list].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    for (let i = 1; i < sorted.length; i++) {
      const prev = pick(sorted[i - 1]);
      const curr = pick(sorted[i]);
      if (prev !== undefined && curr !== undefined && prev === curr) {
        repeats++;
      }
    }
  }
  return repeats;
}

export function calculateVarietyScore(meals: readonly MealForVariety[]): VarietyScoreResult {
  if (meals.length === 0) {
    return {
      score: 100,
      isBoringWeek: false,
      uniqueProteins: 0,
      uniqueCuisines: 0,
      consecutiveProteinRepeats: 0,
      consecutiveCuisineRepeats: 0,
      repeatedMealTitles: 0,
    };
  }

  const resolved = resolveMeals(meals);

  const proteinSet = new Set(resolved.map(m => m.protein).filter((p): p is string => !!p));
  const cuisineSet = new Set(resolved.map(m => m.cuisine).filter(c => !!c));
  const titleCounts = new Map<string, number>();
  for (const m of resolved) {
    const key = m.title.toLowerCase().trim();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const repeatedMealTitles = Array.from(titleCounts.values()).reduce(
    (sum, count) => sum + (count > 1 ? count - 1 : 0),
    0,
  );

  const consecutiveProteinRepeats = countConsecutiveRepeats(resolved, m => m.protein);
  const consecutiveCuisineRepeats = countConsecutiveRepeats(resolved, m => m.cuisine);

  const totalMeals = resolved.length;
  const proteinVariety = Math.min(1, proteinSet.size / Math.max(1, Math.min(5, totalMeals)));
  const cuisineVariety = Math.min(1, cuisineSet.size / Math.max(1, Math.min(5, totalMeals)));
  const proteinPenalty = Math.min(1, consecutiveProteinRepeats / Math.max(1, totalMeals));
  const cuisinePenalty = Math.min(1, consecutiveCuisineRepeats / Math.max(1, totalMeals));
  const titlePenalty = Math.min(1, repeatedMealTitles / Math.max(1, totalMeals));

  const raw =
    proteinVariety * 40 +
    cuisineVariety * 30 +
    (1 - proteinPenalty) * 15 +
    (1 - cuisinePenalty) * 10 +
    (1 - titlePenalty) * 5;

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    isBoringWeek: score < 40,
    uniqueProteins: proteinSet.size,
    uniqueCuisines: cuisineSet.size,
    consecutiveProteinRepeats,
    consecutiveCuisineRepeats,
    repeatedMealTitles,
  };
}

export function findRepetitiveMealIds(meals: readonly MealForVariety[]): string[] {
  const resolved = resolveMeals(meals);
  const byType = new Map<string, ResolvedMeal[]>();
  for (const m of resolved) {
    const list = byType.get(m.mealType) ?? [];
    list.push(m);
    byType.set(m.mealType, list);
  }

  const repetitive = new Set<string>();
  for (const list of byType.values()) {
    const sorted = [...list].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.protein && curr.protein && prev.protein === curr.protein) {
        repetitive.add(curr.id);
      }
    }
  }
  return Array.from(repetitive);
}
