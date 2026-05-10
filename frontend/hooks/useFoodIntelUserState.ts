// frontend/hooks/useFoodIntelUserState.ts
// Group 10R + 10R-Phase2 — assembles a stable UserState for the Food Intel
// matcher and Kitchen IQ ranker. Phase 2 wires `topAffinityIngredients`,
// `rolling7dNutrientGaps`, `goalPhase`, and `last7DaysIngredients` from
// `GET /api/user/affinity/snapshot` so all five matcher dimensions activate.
//
// P5: migrated to React Query so the affinity snapshot is cached across
// every Food Intel surface that calls this hook (recipe modal, Kitchen tab,
// recommender). Cache key is namespaced by userId.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import useSkillTier from './useSkillTier';
import { useCookingJourney } from './useCookingJourney';
import { userApi } from '../lib/api';
import type { UserState } from '../lib/foodIntelMatcher';
import type { FoodIntelSkillTier, FoodIntelGoalPhase } from '../lib/foodIntelTips';

const DEFAULT_USER_ID = 'anonymous';
const DEFAULT_SKILL_TIER: FoodIntelSkillTier = 'cook';
const DEFAULT_GOAL_PHASE: FoodIntelGoalPhase = 'maintain';
const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);

interface AffinitySnapshotState {
  topAffinityIngredients: string[];
  rolling7dNutrientGaps: string[];
  goalPhase: FoodIntelGoalPhase;
  last7DaysIngredients: string[];
}

const EMPTY_SNAPSHOT: AffinitySnapshotState = {
  topAffinityIngredients: [],
  rolling7dNutrientGaps: [],
  goalPhase: DEFAULT_GOAL_PHASE,
  last7DaysIngredients: [],
};

export function useFoodIntelUserState(): UserState {
  const { user } = useAuth();
  const { tier } = useSkillTier();
  const { stats } = useCookingJourney();

  const userId = user?.id ?? DEFAULT_USER_ID;
  const exploredCuisines = stats?.cuisinesExplored;

  const { data: snapshot } = useQuery({
    queryKey: ['affinitySnapshot', userId],
    queryFn: async (): Promise<AffinitySnapshotState> => {
      try {
        const response = await userApi.getAffinitySnapshot();
        const payload = response.data;
        if (!payload) return EMPTY_SNAPSHOT;
        return {
          topAffinityIngredients: payload.topAffinityIngredients ?? [],
          rolling7dNutrientGaps: payload.rolling7dNutrientGaps ?? [],
          goalPhase: payload.goalPhase ?? DEFAULT_GOAL_PHASE,
          last7DaysIngredients: payload.last7DaysIngredients ?? [],
        };
      } catch {
        // Defaults preserved on error — surfaces continue to work without N=1 depth.
        return EMPTY_SNAPSHOT;
      }
    },
    initialData: EMPTY_SNAPSHOT,
  });

  const resolved = snapshot ?? EMPTY_SNAPSHOT;

  return useMemo<UserState>(
    () => ({
      userId,
      cookHistory: { cuisines: exploredCuisines ?? (EMPTY_STRING_ARRAY as string[]) },
      topAffinityIngredients: resolved.topAffinityIngredients,
      rolling7dNutrientGaps: resolved.rolling7dNutrientGaps,
      skillTier: tier ?? DEFAULT_SKILL_TIER,
      goalPhase: resolved.goalPhase,
      last7DaysIngredients: resolved.last7DaysIngredients,
    }),
    [userId, exploredCuisines, tier, resolved],
  );
}

export default useFoodIntelUserState;
