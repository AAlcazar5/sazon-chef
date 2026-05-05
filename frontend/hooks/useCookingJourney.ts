// Group 10I: Cooking Journey hook — fetches stats + skill progress for the profile screen.

import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../lib/api';

export interface CookingStats {
  recipesCookedThisMonth: number;
  recipesCookedAllTime: number;
  cuisinesExplored: string[];
  cuisinesExploredThisMonth: string[];
  averageDifficulty: number;
  averageDifficultyLabel: 'easy' | 'medium' | 'hard' | null;
  difficultyTrend: 'leveling_up' | 'steady' | 'leveling_down' | 'insufficient_data';
  longestStreakDays: number;
  currentStreakDays: number;
  firstCookedCuisines: Array<{ cuisine: string; firstCookedAt: string }>;
  seededCuisines: string[];
}

export type SkillLevel = 'beginner' | 'home_cook' | 'confident' | 'chef';

export interface SkillProgress {
  currentLevel: SkillLevel;
  effectiveLevel: SkillLevel;
  readyToLevelUp: boolean;
  nextLevel: SkillLevel | null;
  reason: string;
  easyRecipesCookedWithGoodRating: number;
  mediumRecipesCooked: number;
}

export interface UseCookingJourneyState {
  stats: CookingStats | null;
  progress: SkillProgress | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  acceptLevelUp: (newLevel: SkillLevel) => Promise<void>;
  seedJourney: (data: { seededCuisines?: string[]; cookingSkillLevel?: SkillLevel }) => Promise<void>;
}

export function useCookingJourney(): UseCookingJourneyState {
  const [stats, setStats] = useState<CookingStats | null>(null);
  const [progress, setProgress] = useState<SkillProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, progressRes] = await Promise.all([
        userApi.getCookingStats(),
        userApi.getSkillProgress(),
      ]);
      setStats(statsRes.data as CookingStats);
      setProgress(progressRes.data as SkillProgress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cooking journey';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const acceptLevelUp = useCallback(
    async (newLevel: SkillLevel) => {
      await userApi.acceptSkillLevelUp(newLevel);
      await load();
    },
    [load],
  );

  const seedJourney = useCallback(
    async (data: { seededCuisines?: string[]; cookingSkillLevel?: SkillLevel }) => {
      await userApi.seedCookingJourney(data);
      await load();
    },
    [load],
  );

  return { stats, progress, loading, error, refresh: load, acceptLevelUp, seedJourney };
}
