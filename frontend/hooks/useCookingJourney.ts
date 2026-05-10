// Group 10I: Cooking Journey hook — fetches stats + skill progress for the profile screen.
//
// P5: migrated from useEffect+useState to React Query so the profile screen
// + any kitchen-iq surfaces share one cache entry. Mutations
// (acceptLevelUp, seedJourney) invalidate the query so the next render
// re-fetches both endpoints.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const QUERY_KEY = ['cookingJourney'] as const;

export function useCookingJourney(): UseCookingJourneyState {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const [statsRes, progressRes] = await Promise.all([
        userApi.getCookingStats(),
        userApi.getSkillProgress(),
      ]);
      return {
        stats: statsRes.data as CookingStats,
        progress: progressRes.data as SkillProgress,
      };
    },
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const acceptLevelUp = useCallback(
    async (newLevel: SkillLevel) => {
      await userApi.acceptSkillLevelUp(newLevel);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    [queryClient],
  );

  const seedJourney = useCallback(
    async (data: { seededCuisines?: string[]; cookingSkillLevel?: SkillLevel }) => {
      await userApi.seedCookingJourney(data);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    [queryClient],
  );

  return {
    stats: query.data?.stats ?? null,
    progress: query.data?.progress ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refresh,
    acceptLevelUp,
    seedJourney,
  };
}
