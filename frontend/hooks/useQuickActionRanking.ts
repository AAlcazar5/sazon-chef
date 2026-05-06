// frontend/hooks/useQuickActionRanking.ts
// ROADMAP 4.0 HX4.1 — quick-action chip ranking by user's tap mix.
//
// Re-orders the static `voice / snap / build-a-plate / find-me-a-meal`
// chips by which ones *this user* taps most often. Cold-start (per
// canonical N2.1 thresholds) returns the default order. Chips with zero
// taps in the last 30 days are filtered out — but the visible set never
// drops below MIN_VISIBLE so the UX stays predictable.

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quickActionTapLog:v1';
const COLD_START_THRESHOLD = 5;
const MIN_VISIBLE = 3;
const HIDE_AFTER_DAYS = 30;
const HIDE_AFTER_MS = HIDE_AFTER_DAYS * 24 * 60 * 60 * 1000;

export interface ActionTapEntry {
  count: number;
  /** Epoch ms of the last tap. */
  lastTappedAt: number;
}

export type QuickActionTapLog = Record<string, ActionTapEntry>;

export async function loadQuickActionTapLog(): Promise<QuickActionTapLog> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as QuickActionTapLog;
    }
    return {};
  } catch {
    return {};
  }
}

async function persistTapLog(log: QuickActionTapLog): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* swallow */
  }
}

export interface RankActionsArgs<T> {
  /** All available actions in their default order. */
  all: ReadonlyArray<T>;
  /** Tap log (action id → entry). Use {} for cold start. */
  log: QuickActionTapLog;
  /** Function to extract a stable id from an action. */
  idOf: (a: T) => string;
  /** Reference time used to compute the 30-day cutoff (testability). */
  now?: number;
}

/**
 * Pure ranker. Returns:
 *  - cold-start: input order unchanged.
 *  - post-threshold: descending by tap count, with chips that haven't been
 *    tapped in 30 days filtered OUT — but the result is padded back up to
 *    `MIN_VISIBLE` from the default order if the filter took us below.
 */
export function rankQuickActions<T>(args: RankActionsArgs<T>): T[] {
  const { all, log, idOf } = args;
  const now = args.now ?? Date.now();

  const totalEvents = Object.values(log).reduce((s, e) => s + e.count, 0);
  if (totalEvents < COLD_START_THRESHOLD) return [...all];

  // Filter out stale-tapped chips (count > 0 but no taps in 30d).
  const fresh = all.filter((a) => {
    const entry = log[idOf(a)];
    if (!entry) return true; // never-tapped — keep at default position
    if (entry.count === 0) return true;
    return now - entry.lastTappedAt <= HIDE_AFTER_MS;
  });

  // Sort by tap count descending; preserve default order on ties.
  const ranked = [...fresh].sort((a, b) => {
    const ca = log[idOf(a)]?.count ?? 0;
    const cb = log[idOf(b)]?.count ?? 0;
    if (cb !== ca) return cb - ca;
    return all.indexOf(a) - all.indexOf(b);
  });

  // Pad to MIN_VISIBLE from the default order if the stale filter removed
  // too many.
  if (ranked.length < MIN_VISIBLE) {
    const seen = new Set(ranked);
    for (const a of all) {
      if (ranked.length >= MIN_VISIBLE) break;
      if (!seen.has(a)) ranked.push(a);
    }
  }

  return ranked;
}

export interface UseQuickActionRankingResult<T> {
  rankedActions: T[];
  recordTap: (id: string) => Promise<void>;
  loaded: boolean;
}

export function useQuickActionRanking<T>(
  all: ReadonlyArray<T>,
  idOf: (a: T) => string,
): UseQuickActionRankingResult<T> {
  const [log, setLog] = useState<QuickActionTapLog>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadQuickActionTapLog().then((l) => {
      if (!cancelled) {
        setLog(l);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordTap = useCallback(
    async (id: string) => {
      const next: QuickActionTapLog = {
        ...log,
        [id]: {
          count: (log[id]?.count ?? 0) + 1,
          lastTappedAt: Date.now(),
        },
      };
      setLog(next);
      await persistTapLog(next);
    },
    [log],
  );

  const rankedActions = useMemo(
    () => rankQuickActions({ all, log, idOf }),
    [all, log, idOf],
  );

  return { rankedActions, recordTap, loaded };
}
