import {
  computeCookingStats,
  computeStreaks,
  computeSkillProgress,
  CookingLogEntry,
} from '../../src/modules/user/cookingStatsService';

const d = (iso: string) => new Date(iso);
const entry = (iso: string, cuisine: string | null, difficulty: string | null): CookingLogEntry => ({
  cookedAt: d(iso),
  recipe: cuisine === null && difficulty === null ? null : { cuisine, difficulty },
});

describe('computeCookingStats', () => {
  const now = d('2026-04-15T12:00:00Z');

  test('returns zeros on empty input', () => {
    const stats = computeCookingStats([], now);
    expect(stats.recipesCookedAllTime).toBe(0);
    expect(stats.recipesCookedThisMonth).toBe(0);
    expect(stats.cuisinesExplored).toEqual([]);
    expect(stats.longestStreakDays).toBe(0);
    expect(stats.averageDifficultyLabel).toBeNull();
    expect(stats.difficultyTrend).toBe('insufficient_data');
  });

  test('counts this-month vs all-time correctly', () => {
    const stats = computeCookingStats(
      [
        entry('2026-04-10T10:00:00Z', 'Italian', 'easy'),
        entry('2026-04-01T10:00:00Z', 'Mexican', 'easy'),
        entry('2026-03-30T10:00:00Z', 'Thai', 'medium'),
        entry('2025-12-01T10:00:00Z', 'French', 'hard'),
      ],
      now,
    );
    expect(stats.recipesCookedAllTime).toBe(4);
    expect(stats.recipesCookedThisMonth).toBe(2);
    expect(stats.cuisinesExplored).toEqual(['French', 'Italian', 'Mexican', 'Thai']);
    expect(stats.cuisinesExploredThisMonth).toEqual(['Italian', 'Mexican']);
  });

  test('deduplicates cuisines and detects first-cooked-at', () => {
    const stats = computeCookingStats(
      [
        entry('2026-03-01T10:00:00Z', 'Japanese', 'easy'),
        entry('2026-04-01T10:00:00Z', 'Japanese', 'medium'),
        entry('2026-02-15T10:00:00Z', 'Korean', 'easy'),
      ],
      now,
    );
    expect(stats.cuisinesExplored).toEqual(['Japanese', 'Korean']);
    const japanese = stats.firstCookedCuisines.find((c) => c.cuisine === 'Japanese');
    expect(japanese?.firstCookedAt.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  test('averages difficulty and detects leveling up', () => {
    const stats = computeCookingStats(
      [
        entry('2026-01-01T10:00:00Z', 'A', 'easy'),
        entry('2026-01-02T10:00:00Z', 'A', 'easy'),
        entry('2026-01-03T10:00:00Z', 'A', 'easy'),
        entry('2026-02-01T10:00:00Z', 'A', 'medium'),
        entry('2026-03-01T10:00:00Z', 'A', 'medium'),
        entry('2026-04-01T10:00:00Z', 'A', 'hard'),
      ],
      now,
    );
    expect(stats.averageDifficulty).toBeCloseTo((1 + 1 + 1 + 2 + 2 + 3) / 6, 2);
    expect(stats.difficultyTrend).toBe('leveling_up');
  });

  test('merges seededCuisines into cuisinesExplored', () => {
    const stats = computeCookingStats(
      [entry('2026-04-01T10:00:00Z', 'Italian', 'easy')],
      now,
      ['Thai', 'Italian', 'Ethiopian'],
    );
    expect(stats.cuisinesExplored).toEqual(['Ethiopian', 'Italian', 'Thai']);
  });

  test('seeded cuisines do not affect firstCookedCuisines (only real cooks do)', () => {
    const stats = computeCookingStats(
      [entry('2026-04-01T10:00:00Z', 'Italian', 'easy')],
      now,
      ['Thai'],
    );
    expect(stats.firstCookedCuisines.map((c) => c.cuisine)).toEqual(['Italian']);
  });

  test('skips null/missing recipes and cuisines', () => {
    const stats = computeCookingStats(
      [
        entry('2026-04-01T10:00:00Z', null, null),
        entry('2026-04-02T10:00:00Z', '', 'easy'),
        entry('2026-04-03T10:00:00Z', 'Italian', 'easy'),
      ],
      now,
    );
    expect(stats.recipesCookedAllTime).toBe(3);
    expect(stats.cuisinesExplored).toEqual(['Italian']);
  });
});

describe('computeStreaks', () => {
  test('consecutive days: longest = 3', () => {
    const { longest } = computeStreaks([
      d('2026-04-10T09:00:00Z'),
      d('2026-04-11T09:00:00Z'),
      d('2026-04-12T09:00:00Z'),
    ], d('2026-04-15T12:00:00Z'));
    expect(longest).toBe(3);
  });

  test('broken streak resets run counter', () => {
    const { longest } = computeStreaks([
      d('2026-04-10T00:00:00Z'),
      d('2026-04-11T00:00:00Z'),
      d('2026-04-14T00:00:00Z'),
    ], d('2026-04-15T12:00:00Z'));
    expect(longest).toBe(2);
  });

  test('current streak active when last day is today', () => {
    const now = d('2026-04-15T12:00:00Z');
    const { current } = computeStreaks([
      d('2026-04-13T08:00:00Z'),
      d('2026-04-14T08:00:00Z'),
      d('2026-04-15T08:00:00Z'),
    ], now);
    expect(current).toBe(3);
  });

  test('current streak zero when last cook >1 day ago', () => {
    const now = d('2026-04-15T12:00:00Z');
    const { current } = computeStreaks([
      d('2026-04-10T00:00:00Z'),
      d('2026-04-11T00:00:00Z'),
    ], now);
    expect(current).toBe(0);
  });

  test('multiple cooks same day count as one day', () => {
    const { longest } = computeStreaks([
      d('2026-04-10T01:00:00Z'),
      d('2026-04-10T20:00:00Z'),
      d('2026-04-11T01:00:00Z'),
    ], d('2026-04-15T12:00:00Z'));
    expect(longest).toBe(2);
  });
});

describe('computeSkillProgress', () => {
  test('beginner with 10 easy + good ratings → ready to level up', () => {
    const logs = Array.from({ length: 10 }, () => ({ difficulty: 'easy', tasteRating: 4 }));
    const progress = computeSkillProgress({ currentLevel: 'beginner', cookingLogsWithRatings: logs });
    expect(progress.readyToLevelUp).toBe(true);
    expect(progress.effectiveLevel).toBe('home_cook');
    expect(progress.nextLevel).toBe('home_cook');
  });

  test('beginner with 10 easy but low ratings → NOT ready', () => {
    const logs = Array.from({ length: 10 }, () => ({ difficulty: 'easy', tasteRating: 2 }));
    const progress = computeSkillProgress({ currentLevel: 'beginner', cookingLogsWithRatings: logs });
    expect(progress.readyToLevelUp).toBe(false);
    expect(progress.effectiveLevel).toBe('beginner');
  });

  test('home_cook with 10 medium cooks → ready for confident', () => {
    const logs = Array.from({ length: 10 }, () => ({ difficulty: 'medium', tasteRating: 3 }));
    const progress = computeSkillProgress({ currentLevel: 'home_cook', cookingLogsWithRatings: logs });
    expect(progress.readyToLevelUp).toBe(true);
    expect(progress.effectiveLevel).toBe('confident');
  });

  test('chef has no next level', () => {
    const progress = computeSkillProgress({ currentLevel: 'chef', cookingLogsWithRatings: [] });
    expect(progress.nextLevel).toBeNull();
    expect(progress.readyToLevelUp).toBe(false);
  });
});
