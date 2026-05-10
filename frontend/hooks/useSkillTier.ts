// frontend/hooks/useSkillTier.ts
// Group 10X Phase 9 — fetches the user's skill tier and exposes derived UI flags.
//
// P5: migrated to React Query so the skill tier is cached across every
// surface that gates UI on it (Build-a-Plate, Food Intel, sauce chips,
// variant chips). One fetch per session instead of one per surface.

import { useQuery } from '@tanstack/react-query';
import { mealComponentApi, type SkillTier } from '../lib/api';

export interface UseSkillTierResult {
  tier: SkillTier;
  isSauceVisible: boolean;
  isVariantChipsVisible: boolean;
  loading: boolean;
}

const DEFAULT_TIER: SkillTier = 'cook';

const QUERY_KEY = ['skillTier'] as const;

export default function useSkillTier(): UseSkillTierResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SkillTier> => {
      try {
        const res = await mealComponentApi.skillTier();
        const next = res.data?.tier;
        if (next === 'beginner' || next === 'cook' || next === 'chef') {
          return next;
        }
        return DEFAULT_TIER;
      } catch {
        // Fallback to default tier if endpoint missing or auth fails.
        return DEFAULT_TIER;
      }
    },
  });

  const tier = query.data ?? DEFAULT_TIER;

  return {
    tier,
    isSauceVisible: tier !== 'beginner',
    isVariantChipsVisible: tier === 'chef',
    loading: query.isLoading,
  };
}
