// frontend/hooks/useFilterChipRanking.ts
// ROADMAP 4.0 FX3.4 — chip ranking by current taste signal.
//
// Re-orders DEFAULT_FILTER_CHIPS by how often *this user* toggles each chip.
// Cold-start (no toggle history) returns the input order unchanged.
//
// Persistence: a small frequency map under AsyncStorage; bumped on every
// `recordChipToggle(chipId)` call. Surfaces (home FilterRow) call this hook
// + `recordChipToggle` from their `onChipToggle` handler.
//
// Cross-tier dovetail (N2.1): the "< 5 toggle events" rule will rebind to
// `coldStartCoordinator` `cold` tier when N2.1 lands. Until then, the local
// fallback below uses the canonical 5-event threshold.

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FilterChipDef } from '../components/ui/FilterRow';

const STORAGE_KEY = 'filterChipToggleCounts:v1';
const COLD_START_THRESHOLD = 5;

export type ChipToggleCounts = Record<string, number>;

export async function loadChipToggleCounts(): Promise<ChipToggleCounts> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ChipToggleCounts;
    }
    return {};
  } catch {
    return {};
  }
}

export async function persistChipToggleCounts(counts: ChipToggleCounts): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    /* swallow */
  }
}

/**
 * Pure ranker — exported so tests + cold-start tier coordinator can call it
 * directly. Returns chips re-ordered by descending toggle count; chips with
 * equal counts (or unseen chips) preserve their input position relative to
 * each other (stable sort).
 */
export function rankChips(
  chips: ReadonlyArray<FilterChipDef>,
  counts: ChipToggleCounts,
): FilterChipDef[] {
  const totalEvents = Object.values(counts).reduce((s, n) => s + n, 0);
  if (totalEvents < COLD_START_THRESHOLD) {
    // Cold start — preserve input order. (N2.1: rebinds to `cold` tier.)
    return [...chips];
  }
  return [...chips].sort((a, b) => {
    const ca = counts[a.id] ?? 0;
    const cb = counts[b.id] ?? 0;
    if (cb !== ca) return cb - ca;
    return chips.indexOf(a) - chips.indexOf(b);
  });
}

export interface UseFilterChipRankingResult {
  rankedChips: FilterChipDef[];
  recordChipToggle: (chipId: string) => Promise<void>;
  /** Latest known counts — useful for tests + diagnostics. */
  counts: ChipToggleCounts;
  /** True once the persisted counts have been read. */
  loaded: boolean;
}

export function useFilterChipRanking(
  baseChips: ReadonlyArray<FilterChipDef>,
): UseFilterChipRankingResult {
  const [counts, setCounts] = useState<ChipToggleCounts>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChipToggleCounts().then((c) => {
      if (!cancelled) {
        setCounts(c);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordChipToggle = useCallback(async (chipId: string) => {
    const next = { ...counts, [chipId]: (counts[chipId] ?? 0) + 1 };
    setCounts(next);
    await persistChipToggleCounts(next);
  }, [counts]);

  const rankedChips = useMemo(() => rankChips(baseChips, counts), [baseChips, counts]);

  return { rankedChips, recordChipToggle, counts, loaded };
}
