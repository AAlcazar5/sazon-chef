// frontend/hooks/useFoodIntelUserState.ts
// Group 10R + 10R-Phase2 — assembles a stable UserState for the Food Intel
// matcher and Kitchen IQ ranker. Phase 2 wires `topAffinityIngredients`,
// `rolling7dNutrientGaps`, `goalPhase`, and `last7DaysIngredients` from
// `GET /api/user/affinity/snapshot` so all five matcher dimensions activate.

import { useEffect, useMemo, useState } from 'react';
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
  const [snapshot, setSnapshot] = useState<AffinitySnapshotState>(EMPTY_SNAPSHOT);

  const userId = user?.id ?? DEFAULT_USER_ID;
  const exploredCuisines = stats?.cuisinesExplored;

  useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      try {
        const response = await userApi.getAffinitySnapshot();
        if (signal.cancelled) return;
        const payload = response.data;
        if (!payload) return;
        setSnapshot({
          topAffinityIngredients: payload.topAffinityIngredients ?? [],
          rolling7dNutrientGaps: payload.rolling7dNutrientGaps ?? [],
          goalPhase: payload.goalPhase ?? DEFAULT_GOAL_PHASE,
          last7DaysIngredients: payload.last7DaysIngredients ?? [],
        });
      } catch {
        // Defaults preserved on error — surfaces continue to work without N=1 depth.
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [userId]);

  return useMemo<UserState>(
    () => ({
      userId,
      cookHistory: { cuisines: exploredCuisines ?? (EMPTY_STRING_ARRAY as string[]) },
      topAffinityIngredients: snapshot.topAffinityIngredients,
      rolling7dNutrientGaps: snapshot.rolling7dNutrientGaps,
      skillTier: tier ?? DEFAULT_SKILL_TIER,
      goalPhase: snapshot.goalPhase,
      last7DaysIngredients: snapshot.last7DaysIngredients,
    }),
    [userId, exploredCuisines, tier, snapshot],
  );
}

export default useFoodIntelUserState;
