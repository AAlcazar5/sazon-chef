/**
 * Utility functions for analyzing meal history data
 */

interface MealHistoryEntry {
  id: string;
  date: Date;
  recipe: {
    id: string;
    title: string;
    cuisine: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  feedback: string;
}

export interface MealHistoryStats {
  totalMeals: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
}

export interface CuisineStat {
  cuisine: string;
  count: number;
  percentage: number;
}

export interface RecipeStat {
  recipeId: string;
  title: string;
  count: number;
  percentage: number;
  averageRating: number;
}

export interface WeeklyPattern {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface NutritionalInsights {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  averageDailyCalories: number;
  macroDistribution: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface FormattedMealEntry extends MealHistoryEntry {
  formattedDate: string;
  formattedTime: string;
}

// Map feedback strings to numeric ratings
const FEEDBACK_RATINGS: Record<string, number> = {
  delicious: 5,
  excellent: 4,
  good: 4,
  okay: 3,
  average: 3,
  poor: 2,
  bad: 1,
  unknown: 3,
};

function feedbackToRating(feedback: string): number {
  return FEEDBACK_RATINGS[feedback.toLowerCase()] ?? 3;
}

const DAY_NAMES: Array<keyof WeeklyPattern> = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/**
 * Calculate aggregate statistics for a meal history array
 */
export function calculateMealHistoryStats(
  mealHistory: MealHistoryEntry[] | null
): MealHistoryStats {
  if (!mealHistory || mealHistory.length === 0) {
    return { totalMeals: 0, averageCalories: 0, averageProtein: 0, averageCarbs: 0, averageFat: 0 };
  }

  const totalMeals = mealHistory.length;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  mealHistory.forEach(meal => {
    totalCalories += meal.recipe?.calories || 0;
    totalProtein += meal.recipe?.protein || 0;
    totalCarbs += meal.recipe?.carbs || 0;
    totalFat += meal.recipe?.fat || 0;
  });

  return {
    totalMeals,
    averageCalories: totalCalories / totalMeals,
    averageProtein: totalProtein / totalMeals,
    averageCarbs: totalCarbs / totalMeals,
    averageFat: totalFat / totalMeals,
  };
}

/**
 * Return cuisine frequencies sorted by count descending
 */
export function getFavoriteCuisines(
  mealHistory: MealHistoryEntry[],
  limit?: number
): CuisineStat[] {
  if (!mealHistory || mealHistory.length === 0) return [];

  const cuisineCounts: Map<string, number> = new Map();
  mealHistory.forEach(meal => {
    const cuisine = meal.recipe?.cuisine;
    if (cuisine) cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 1);
  });

  const total = mealHistory.length;
  const sorted: CuisineStat[] = Array.from(cuisineCounts.entries())
    .map(([cuisine, count]) => ({ cuisine, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Return most consumed recipes sorted by frequency descending
 */
export function getMostConsumedRecipes(
  mealHistory: MealHistoryEntry[],
  limit?: number
): RecipeStat[] {
  if (!mealHistory || mealHistory.length === 0) return [];

  // Track counts and ratings per recipe ID (preserve first-seen order via Map)
  const recipeMap: Map<string, { title: string; count: number; totalRating: number }> = new Map();

  mealHistory.forEach(meal => {
    const id = meal.recipe?.id;
    const title = meal.recipe?.title || '';
    const rating = feedbackToRating(meal.feedback);
    if (id) {
      const existing = recipeMap.get(id);
      if (existing) {
        existing.count += 1;
        existing.totalRating += rating;
      } else {
        recipeMap.set(id, { title, count: 1, totalRating: rating });
      }
    }
  });

  const total = mealHistory.length;
  const sorted: RecipeStat[] = Array.from(recipeMap.entries())
    .map(([recipeId, { title, count, totalRating }]) => ({
      recipeId,
      title,
      count,
      percentage: (count / total) * 100,
      averageRating: totalRating / count,
    }))
    .sort((a, b) => b.count - a.count);

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Return meal counts by day of week
 */
export function getWeeklyPattern(mealHistory: MealHistoryEntry[]): WeeklyPattern {
  const pattern: WeeklyPattern = {
    sunday: 0, monday: 0, tuesday: 0, wednesday: 0,
    thursday: 0, friday: 0, saturday: 0,
  };

  if (!mealHistory) return pattern;

  mealHistory.forEach(meal => {
    const date = meal.date instanceof Date ? meal.date : new Date(meal.date);
    const dayName = DAY_NAMES[date.getDay()];
    pattern[dayName] += 1;
  });

  return pattern;
}

/**
 * Return aggregated nutritional insights
 */
export function getNutritionalInsights(
  mealHistory: MealHistoryEntry[]
): NutritionalInsights {
  const empty: NutritionalInsights = {
    totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
    averageDailyCalories: 0,
    macroDistribution: { protein: 0, carbs: 0, fat: 0 },
  };

  if (!mealHistory || mealHistory.length === 0) return empty;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  mealHistory.forEach(meal => {
    totalCalories += meal.recipe?.calories || 0;
    totalProtein += meal.recipe?.protein || 0;
    totalCarbs += meal.recipe?.carbs || 0;
    totalFat += meal.recipe?.fat || 0;
  });

  const averageDailyCalories = mealHistory.length > 0 ? totalCalories / mealHistory.length : 0;

  // Macro calories: protein 4 cal/g, carbs 4 cal/g, fat 9 cal/g
  const proteinCalories = totalProtein * 4;
  const carbsCalories = totalCarbs * 4;
  const fatCalories = totalFat * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

  const macroDistribution =
    totalMacroCalories > 0
      ? {
          protein: (proteinCalories / totalMacroCalories) * 100,
          carbs: (carbsCalories / totalMacroCalories) * 100,
          fat: (fatCalories / totalMacroCalories) * 100,
        }
      : { protein: 0, carbs: 0, fat: 0 };

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    averageDailyCalories,
    macroDistribution,
  };
}

/**
 * Format meal history entries for display
 */
export function formatMealHistoryData(
  mealHistory: MealHistoryEntry[] | null
): FormattedMealEntry[] {
  if (!mealHistory) return [];

  return mealHistory.map(meal => {
    const date = meal.date instanceof Date ? meal.date : new Date(meal.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const formattedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;

    return { ...meal, formattedDate, formattedTime };
  });
}
