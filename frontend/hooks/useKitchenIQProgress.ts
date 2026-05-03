// Group 10S: Kitchen IQ progress hook.
// Fetches unlock state from the backend and tracks which `newUnlocks` have
// already been celebrated so a card only triggers a celebration once.

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../lib/api';

const CELEBRATED_KEY = 'kitchen_iq_celebrated_v1';

export interface KitchenIQProgressState {
  totalCards: number;
  unlockedCount: number;
  unlockedIds: string[];
  newUnlocks: string[];
  loading: boolean;
  error: string | null;
  isUnlocked: (id: string) => boolean;
  refresh: () => Promise<void>;
  acknowledgeNewUnlock: (id: string) => Promise<void>;
}

export function __resetKitchenIQCelebrationsForTests(): void {
  // No-op outside tests; the AsyncStorage mock is reset by the test harness.
}

async function loadCelebrated(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function persistCelebrated(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(CELEBRATED_KEY, JSON.stringify([...set]));
  } catch {
    // Storage failures are non-fatal; the celebration just re-fires next session.
  }
}

export function useKitchenIQProgress(): KitchenIQProgressState {
  const [totalCards, setTotalCards] = useState<number>(0);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [newUnlocks, setNewUnlocks] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await userApi.getKitchenIQProgress();
      if (signal?.cancelled) return;
      const payload = response.data;
      if (!payload) throw new Error('Empty response');

      setTotalCards(payload.totalCards);
      setUnlockedIds(payload.unlockedIds);

      const celebrated = await loadCelebrated();
      if (signal?.cancelled) return;
      const fresh = payload.newUnlocks.filter((id) => !celebrated.has(id));
      setNewUnlocks(fresh);
    } catch {
      if (signal?.cancelled) return;
      // Generic semantic error; surfaces decide their own user-facing copy.
      setError('unavailable');
      setTotalCards(0);
      setUnlockedIds([]);
      setNewUnlocks([]);
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void fetchProgress(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [fetchProgress]);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const isUnlocked = useCallback(
    (id: string): boolean => unlockedSet.has(id),
    [unlockedSet],
  );

  const acknowledgeNewUnlock = useCallback(async (id: string) => {
    const celebrated = await loadCelebrated();
    celebrated.add(id);
    await persistCelebrated(celebrated);
    setNewUnlocks((prev) => prev.filter((x) => x !== id));
  }, []);

  return {
    totalCards,
    unlockedCount: unlockedIds.length,
    unlockedIds,
    newUnlocks,
    loading,
    error,
    isUnlocked,
    refresh: () => fetchProgress(),
    acknowledgeNewUnlock,
  };
}

export default useKitchenIQProgress;
