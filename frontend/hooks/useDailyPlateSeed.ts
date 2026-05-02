// frontend/hooks/useDailyPlateSeed.ts
// Group 10X Phase 2 — daily seed: one permutation per calendar day, variety-aware.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { mealComponentApi, type PermutationCandidate, type MealComponentSlot } from '../lib/api';

const SEED_KEY = 'daily_plate_seed';
const YESTERDAY_PROTEIN_KEY = 'daily_plate_seed_yesterday_protein';

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface StoredSeed {
  date: string;
  permutation: PermutationCandidate;
}

interface DailyPlateSeedResult {
  seed: PermutationCandidate | null;
  isStale: boolean;
  reroll: () => Promise<void>;
}

async function fetchFreshSeed(yesterdayProteinId: string | null): Promise<PermutationCandidate | null> {
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
      return varied ?? candidates[0];
    }

    return candidates[0];
  } catch {
    return null;
  }
}

async function persistSeed(permutation: PermutationCandidate): Promise<void> {
  const stored: StoredSeed = { date: todayString(), permutation };
  const proteinComp = permutation.components.find((c) => c.slot === 'protein');
  await AsyncStorage.setItem(SEED_KEY, JSON.stringify(stored));
  if (proteinComp) {
    await AsyncStorage.setItem(YESTERDAY_PROTEIN_KEY, proteinComp.component.id);
  }
}

export default function useDailyPlateSeed(): DailyPlateSeedResult {
  const [seed, setSeed] = useState<PermutationCandidate | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const today = todayString();
      let stored: StoredSeed | null = null;
      try {
        const raw = await AsyncStorage.getItem(SEED_KEY);
        if (raw) stored = JSON.parse(raw) as StoredSeed;
      } catch {
        await AsyncStorage.removeItem(SEED_KEY).catch(() => undefined);
      }

      if (stored && stored.date === today) {
        if (active) {
          setSeed(stored.permutation);
          setIsStale(false);
        }
        return;
      }
      if (stored && active) setIsStale(true);

      const yesterdayProteinId = await AsyncStorage.getItem(YESTERDAY_PROTEIN_KEY);
      const fresh = await fetchFreshSeed(yesterdayProteinId);
      if (fresh && active) {
        setSeed(fresh);
        setIsStale(false);
        await persistSeed(fresh);
      }
    }

    void init();
    return () => { active = false; };
  }, []);

  const reroll = useCallback(async () => {
    const yesterdayProteinId = await AsyncStorage.getItem(YESTERDAY_PROTEIN_KEY);
    const fresh = await fetchFreshSeed(yesterdayProteinId);
    if (fresh) {
      setSeed(fresh);
      setIsStale(false);
      await persistSeed(fresh);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  return { seed, isStale, reroll };
}
