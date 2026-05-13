// P2 retention — pull-to-refresh as Sazon's Pick re-roll ritual.
//
// Tracks per-day re-roll count via AsyncStorage. Once the user has rolled
// 3 times today, further refreshes don't change Sazon's Pick — the moment
// stays special. Counter resets at midnight local.
//
// The Today screen calls `consumeRoll()` on each pull-to-refresh; if it
// returns true, the caller can pass a fresh recipe into <SazonsPickCard />.
// If it returns false, the caller should hold the previous recipe stable
// (the card itself will simply continue showing what it has).

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sazon/sazons_pick/rerolls';
const MAX_ROLLS_PER_DAY = 3;

const isoLocalDate = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface StoredState {
  date: string;
  used: number;
}

interface UseSazonsPickRerollResult {
  /** Number of re-rolls left today (clamped to [0, MAX_ROLLS_PER_DAY]). */
  rollsRemaining: number;
  /**
   * Consumes one roll. Returns `true` if a roll was available (the caller
   * should swap in a fresh pick), or `false` if today's allowance is gone.
   */
  consumeRoll: () => Promise<boolean>;
  /** True once AsyncStorage has been hydrated — render-skippable while false. */
  hydrated: boolean;
}

async function readState(): Promise<StoredState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: '', used: 0 };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (typeof parsed.date !== 'string' || typeof parsed.used !== 'number') {
      return { date: '', used: 0 };
    }
    return { date: parsed.date, used: parsed.used };
  } catch {
    return { date: '', used: 0 };
  }
}

async function writeState(state: StoredState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

export function useSazonsPickReroll(): UseSazonsPickRerollResult {
  const [used, setUsed] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await readState();
      if (cancelled) return;
      const today = isoLocalDate();
      // Reset counter at the start of a new local day.
      const usedToday = state.date === today ? state.used : 0;
      setUsed(usedToday);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const consumeRoll = useCallback(async (): Promise<boolean> => {
    const today = isoLocalDate();
    const state = await readState();
    const usedToday = state.date === today ? state.used : 0;
    if (usedToday >= MAX_ROLLS_PER_DAY) return false;
    const nextUsed = usedToday + 1;
    await writeState({ date: today, used: nextUsed });
    setUsed(nextUsed);
    return true;
  }, []);

  return {
    rollsRemaining: Math.max(0, MAX_ROLLS_PER_DAY - used),
    consumeRoll,
    hydrated,
  };
}

export const SAZONS_PICK_MAX_ROLLS = MAX_ROLLS_PER_DAY;
