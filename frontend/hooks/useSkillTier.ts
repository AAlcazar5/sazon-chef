// frontend/hooks/useSkillTier.ts
// Group 10X Phase 9 — fetches the user's skill tier and exposes derived UI flags.

import { useEffect, useState } from 'react';
import { mealComponentApi, type SkillTier } from '../lib/api';

export interface UseSkillTierResult {
  tier: SkillTier;
  isSauceVisible: boolean;
  isVariantChipsVisible: boolean;
  loading: boolean;
}

const DEFAULT_TIER: SkillTier = 'cook';

export default function useSkillTier(): UseSkillTierResult {
  const [tier, setTier] = useState<SkillTier>(DEFAULT_TIER);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchTier() {
      try {
        const res = await mealComponentApi.skillTier();
        if (cancelled) return;
        const next = res.data?.tier;
        if (next === 'beginner' || next === 'cook' || next === 'chef') {
          setTier(next);
        }
      } catch {
        // Fallback to default tier if endpoint missing or auth fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchTier();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    tier,
    isSauceVisible: tier !== 'beginner',
    isVariantChipsVisible: tier === 'chef',
    loading,
  };
}
