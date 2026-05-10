// frontend/hooks/useDailyPlateSeed.ts
// Group 10X Phase 2 — daily seed: one permutation per calendar day, variety-aware.
//
// P5 (persister): hand-rolled in-mem + AsyncStorage seed cache replaced by
// React Query. Date is in the queryKey so today's seed is naturally separate
// from yesterday's; the persister hydrates from disk on cold start. The
// AsyncStorage `YESTERDAY_PROTEIN_KEY` survives on its own (not a cache —
// it's an *input* to the queryFn that drives variety) and is updated after
// each successful fetch.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { mealComponentApi, type PermutationCandidate, type MealComponentSlot } from '../lib/api';

const YESTERDAY_PROTEIN_KEY = 'daily_plate_seed_yesterday_protein';

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface DailyPlateSeedResult {
  seed: PermutationCandidate | null;
  isStale: boolean;
  reroll: () => Promise<void>;
}

async function pickSeed(): Promise<PermutationCandidate | null> {
  let yesterdayProteinId: string | null = null;
  try {
    yesterdayProteinId = await AsyncStorage.getItem(YESTERDAY_PROTEIN_KEY);
  } catch {
    // AsyncStorage failure is non-fatal — variety filter just doesn't apply.
  }

  let chosen: PermutationCandidate | null;
  try {
    const res = await mealComponentApi.permutations({
      lockedSlots: [],
      slotsToFill: ['protein', 'base', 'vegetable', 'sauce'] as MealComponentSlot[],
      maxResults: 6,
      prioritizePantry: true,
    });
    const candidates = res.data?.permutations ?? [];
    if (candidates.length === 0) return null;

    if (yesterdayProteinId) {
      const varied = candidates.find((c) => {
        const proteinComp = c.components.find((comp) => comp.slot === 'protein');
        return proteinComp?.component.id !== yesterdayProteinId;
      });
      chosen = varied ?? candidates[0];
    } else {
      chosen = candidates[0];
    }
  } catch {
    return null;
  }

  // Record the chosen protein so tomorrow's call avoids it.
  if (chosen) {
    const proteinComp = chosen.components.find((c) => c.slot === 'protein');
    if (proteinComp) {
      await AsyncStorage.setItem(YESTERDAY_PROTEIN_KEY, proteinComp.component.id).catch(
        () => undefined,
      );
    }
  }

  return chosen;
}

export default function useDailyPlateSeed(): DailyPlateSeedResult {
  const queryClient = useQueryClient();
  const today = todayString();

  const query = useQuery({
    queryKey: ['dailyPlateSeed', today],
    queryFn: pickSeed,
    // The seed is intentionally stable across the day — staleTime through
    // end-of-day is handled implicitly by the date-keyed cache plus the
    // persister. Long staleTime so navigation back into the composer
    // doesn't refetch.
    staleTime: 24 * 60 * 60 * 1000,
  });

  const reroll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['dailyPlateSeed', today] });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [queryClient, today]);

  return {
    seed: query.data ?? null,
    // Date is in the queryKey, so a stale-prior-day cache entry can never
    // surface as today's seed. Always false; preserved for shape compat.
    isStale: false,
    reroll,
  };
}
