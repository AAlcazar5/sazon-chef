// Group 10I: Cooking Skill Progression
// Pure aggregation helpers computed from CookingLog + Recipe joins.
// No new schema — derives everything from existing data.

export type SkillLevel = 'beginner' | 'home_cook' | 'confident' | 'chef';

export interface CookingLogEntry {
  cookedAt: Date;
  recipe: {
    cuisine: string | null;
    difficulty: string | null;
  } | null;
}

export interface CookingStats {
  recipesCookedThisMonth: number;
  recipesCookedAllTime: number;
  cuisinesExplored: string[];
  cuisinesExploredThisMonth: string[];
  averageDifficulty: number; // 1=easy, 2=medium, 3=hard
  averageDifficultyLabel: 'easy' | 'medium' | 'hard' | null;
  difficultyTrend: 'leveling_up' | 'steady' | 'leveling_down' | 'insufficient_data';
  longestStreakDays: number;
  currentStreakDays: number;
  firstCookedCuisines: Array<{ cuisine: string; firstCookedAt: Date }>;
}

export interface SkillProgress {
  currentLevel: SkillLevel;
  effectiveLevel: SkillLevel;
  readyToLevelUp: boolean;
  nextLevel: SkillLevel | null;
  reason: string;
  easyRecipesCookedWithGoodRating: number;
  mediumRecipesCooked: number;
}

const DIFFICULTY_VALUE: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
const DIFFICULTY_LABEL: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const LEVELS: SkillLevel[] = ['beginner', 'home_cook', 'confident', 'chef'];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayUTC(date: Date): number {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function normalizeCuisine(cuisine: string | null | undefined): string | null {
  if (!cuisine) return null;
  const trimmed = cuisine.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function computeCookingStats(
  logs: ReadonlyArray<CookingLogEntry>,
  now: Date = new Date(),
  seededCuisines: ReadonlyArray<string> = [],
): CookingStats {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const thisMonthLogs = logs.filter((l) => l.cookedAt >= monthStart);

  const cuisinesAllTime = new Set<string>();
  const cuisinesThisMonth = new Set<string>();
  const firstCookedByCuisine = new Map<string, Date>();
  const difficultyValues: number[] = [];

  // Sort ascending for first-cooked detection
  const sortedAsc = [...logs].sort((a, b) => a.cookedAt.getTime() - b.cookedAt.getTime());
  for (const log of sortedAsc) {
    const cuisine = normalizeCuisine(log.recipe?.cuisine);
    if (cuisine) {
      cuisinesAllTime.add(cuisine);
      if (log.cookedAt >= monthStart) cuisinesThisMonth.add(cuisine);
      if (!firstCookedByCuisine.has(cuisine)) {
        firstCookedByCuisine.set(cuisine, log.cookedAt);
      }
    }
    const diff = log.recipe?.difficulty?.toLowerCase();
    if (diff && DIFFICULTY_VALUE[diff] !== undefined) {
      difficultyValues.push(DIFFICULTY_VALUE[diff]);
    }
  }

  const avgDifficulty =
    difficultyValues.length > 0
      ? difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length
      : 0;

  const avgDifficultyLabel =
    difficultyValues.length === 0
      ? null
      : DIFFICULTY_LABEL[Math.round(avgDifficulty) - 1] ?? null;

  // Trend: compare average of first half vs second half (by recipe count)
  let trend: CookingStats['difficultyTrend'] = 'insufficient_data';
  if (difficultyValues.length >= 6) {
    const mid = Math.floor(difficultyValues.length / 2);
    const firstHalf = difficultyValues.slice(0, mid);
    const secondHalf = difficultyValues.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const delta = secondAvg - firstAvg;
    if (delta > 0.25) trend = 'leveling_up';
    else if (delta < -0.25) trend = 'leveling_down';
    else trend = 'steady';
  }

  const { longest, current } = computeStreaks(sortedAsc.map((l) => l.cookedAt), now);

  for (const seed of seededCuisines) {
    const normalized = normalizeCuisine(seed);
    if (normalized) cuisinesAllTime.add(normalized);
  }

  const firstCookedCuisines = [...firstCookedByCuisine.entries()]
    .map(([cuisine, firstCookedAt]) => ({ cuisine, firstCookedAt }))
    .sort((a, b) => b.firstCookedAt.getTime() - a.firstCookedAt.getTime());

  return {
    recipesCookedThisMonth: thisMonthLogs.length,
    recipesCookedAllTime: logs.length,
    cuisinesExplored: [...cuisinesAllTime].sort(),
    cuisinesExploredThisMonth: [...cuisinesThisMonth].sort(),
    averageDifficulty: Math.round(avgDifficulty * 100) / 100,
    averageDifficultyLabel: avgDifficultyLabel,
    difficultyTrend: trend,
    longestStreakDays: longest,
    currentStreakDays: current,
    firstCookedCuisines,
  };
}

export function computeStreaks(
  cookedAts: ReadonlyArray<Date>,
  now: Date = new Date(),
): { longest: number; current: number } {
  if (cookedAts.length === 0) return { longest: 0, current: 0 };

  const uniqueDays = [...new Set(cookedAts.map(startOfDayUTC))].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i] - uniqueDays[i - 1] === MS_PER_DAY) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: run ending today or yesterday
  const today = startOfDayUTC(now);
  const lastDay = uniqueDays[uniqueDays.length - 1];
  let current = 0;
  if (lastDay === today || lastDay === today - MS_PER_DAY) {
    current = 1;
    for (let i = uniqueDays.length - 2; i >= 0; i--) {
      if (uniqueDays[i + 1] - uniqueDays[i] === MS_PER_DAY) current++;
      else break;
    }
  }

  return { longest, current };
}

export interface SkillProgressInput {
  currentLevel: SkillLevel;
  cookingLogsWithRatings: ReadonlyArray<{
    difficulty: string | null;
    tasteRating: number | null;
  }>;
}

export function computeSkillProgress(input: SkillProgressInput): SkillProgress {
  const { currentLevel, cookingLogsWithRatings } = input;

  const easyGood = cookingLogsWithRatings.filter(
    (l) => l.difficulty?.toLowerCase() === 'easy' && (l.tasteRating ?? 0) >= 3,
  ).length;

  const mediumCount = cookingLogsWithRatings.filter(
    (l) => l.difficulty?.toLowerCase() === 'medium',
  ).length;

  const hardGood = cookingLogsWithRatings.filter(
    (l) => l.difficulty?.toLowerCase() === 'hard' && (l.tasteRating ?? 0) >= 3,
  ).length;

  const idx = LEVELS.indexOf(currentLevel);
  const nextLevel = idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  let readyToLevelUp = false;
  let effective: SkillLevel = currentLevel;
  let reason = '';

  if (currentLevel === 'beginner' && easyGood >= 10) {
    readyToLevelUp = true;
    effective = 'home_cook';
    reason = `You've crushed ${easyGood} easy recipes — ready for a medium challenge?`;
  } else if (currentLevel === 'home_cook' && mediumCount >= 10) {
    readyToLevelUp = true;
    effective = 'confident';
    reason = `${mediumCount} medium recipes under your belt — time to level up.`;
  } else if (currentLevel === 'confident' && hardGood >= 5) {
    readyToLevelUp = true;
    effective = 'chef';
    reason = `${hardGood} hard recipes nailed — you're cooking like a chef.`;
  } else {
    reason =
      currentLevel === 'chef'
        ? "You're at the top level — keep exploring!"
        : 'Keep cooking to unlock the next level.';
  }

  return {
    currentLevel,
    effectiveLevel: effective,
    readyToLevelUp,
    nextLevel,
    reason,
    easyRecipesCookedWithGoodRating: easyGood,
    mediumRecipesCooked: mediumCount,
  };
}
