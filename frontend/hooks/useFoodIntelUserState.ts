// frontend/hooks/useFoodIntelUserState.ts
// Group 10R — assembles a stable UserState for the Food Intel matcher
// from existing app sources, with safe fallbacks where data isn't wired yet.

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSkillTier from './useSkillTier';
import { useCookingJourney } from './useCookingJourney';
import type { UserState } from '../lib/foodIntelMatcher';
import type { FoodIntelSkillTier, FoodIntelGoalPhase } from '../lib/foodIntelTips';

const DEFAULT_USER_ID = 'anonymous';
const DEFAULT_SKILL_TIER: FoodIntelSkillTier = 'cook';
const DEFAULT_GOAL_PHASE: FoodIntelGoalPhase = 'maintain';
const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);

// TODO(10R-phase2): wire `topAffinityIngredients`, `rolling7dNutrientGaps`,
// and `goalPhase` from the user profile / nutrition tracking APIs.
// Until then, three of the matcher's five ranking dimensions are zeroed out
// and the home/cooking surfaces fall back to cuisine-affinity-only ranking.
export function useFoodIntelUserState(): UserState {
  const { user } = useAuth();
  const { tier } = useSkillTier();
  const { stats } = useCookingJourney();

  const userId = user?.id ?? DEFAULT_USER_ID;
  const exploredCuisines = stats?.cuisinesExplored;

  return useMemo<UserState>(
    () => ({
      userId,
      cookHistory: { cuisines: exploredCuisines ?? (EMPTY_STRING_ARRAY as string[]) },
      topAffinityIngredients: [],
      rolling7dNutrientGaps: [],
      skillTier: tier ?? DEFAULT_SKILL_TIER,
      goalPhase: DEFAULT_GOAL_PHASE,
    }),
    [userId, exploredCuisines, tier],
  );
}

export default useFoodIntelUserState;
