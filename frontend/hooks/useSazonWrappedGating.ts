// frontend/hooks/useSazonWrappedGating.ts
// J13 — Sazon Wrapped: when does the surface appear?
//
// The surface is a once-a-year gift, not a feature. Three gates must clear:
//   1. Calendar window: Dec 28–Jan 2 (inclusive). Dec 28 is the Sunday-ish
//      reveal day; Jan 2 buffer catches users who didn't open Sazon
//      on Dec 28–31.
//   2. Has data: ≥1 cooked recipe in the target year.
//   3. Not yet seen this year-key: AsyncStorage `@sazon/wrapped/year_seen`
//      stores the latest year the user dismissed. Reopening within the
//      window after dismissal is allowed (re-dismiss writes the same year).
//
// All three pure-function helpers are exported for unit testing without
// pulling in AsyncStorage / React. The hook composes them.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WRAPPED_SEEN_KEY = '@sazon/wrapped/year_seen';

/** Inclusive calendar window when Wrapped is allowed to render. */
export interface WrappedWindow {
  /** Month is 0-indexed (Date.getMonth() convention). */
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export const DEFAULT_WRAPPED_WINDOW: WrappedWindow = {
  startMonth: 11, // December
  startDay: 28,
  endMonth: 0, // January
  endDay: 2,
};

/**
 * Returns the year the Wrapped surface is FOR when `now` falls in the
 * window — December dates → that year, January dates → previous year.
 * Returns null when outside the window entirely.
 */
export function wrappedYearForDate(
  now: Date,
  window: WrappedWindow = DEFAULT_WRAPPED_WINDOW
): number | null {
  const m = now.getMonth();
  const d = now.getDate();
  if (m === window.startMonth && d >= window.startDay) {
    return now.getFullYear();
  }
  if (m === window.endMonth && d <= window.endDay) {
    // January window covers the *previous* year's recap.
    return now.getFullYear() - 1;
  }
  return null;
}

export function isInWrappedWindow(
  now: Date,
  window: WrappedWindow = DEFAULT_WRAPPED_WINDOW
): boolean {
  return wrappedYearForDate(now, window) !== null;
}

/**
 * Gating decision purely from inputs. Used by the hook + tests so logic
 * stays separable from AsyncStorage I/O.
 */
export function shouldShowWrapped(args: {
  now: Date;
  cookCount: number;
  lastSeenYear: number | null;
  window?: WrappedWindow;
}): { show: boolean; year: number | null } {
  const year = wrappedYearForDate(args.now, args.window);
  if (year === null) return { show: false, year: null };
  if (args.cookCount < 1) return { show: false, year };
  if (args.lastSeenYear !== null && args.lastSeenYear >= year) {
    return { show: false, year };
  }
  return { show: true, year };
}

export interface SazonWrappedGatingState {
  /** True only when window + has-data + not-yet-seen all clear. */
  shouldShow: boolean;
  /** The recap year if we're in a window — even when shouldShow=false. */
  year: number | null;
  /** Mark the current Wrapped year as "seen" — hides the surface. */
  markSeen: () => Promise<void>;
}

interface UseSazonWrappedGatingArgs {
  /** Year-cooked count from `/api/recap/wrapped` payload (or another source). */
  cookCount: number;
  /** Optional `now` injection for testing. Defaults to `new Date()`. */
  now?: Date;
}

export function useSazonWrappedGating(
  args: UseSazonWrappedGatingArgs
): SazonWrappedGatingState {
  const [lastSeenYear, setLastSeenYear] = useState<number | null>(null);
  const now = args.now ?? new Date();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(WRAPPED_SEEN_KEY);
        if (cancelled) return;
        const n = raw ? Number.parseInt(raw, 10) : NaN;
        setLastSeenYear(Number.isFinite(n) ? n : null);
      } catch {
        if (!cancelled) setLastSeenYear(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { show, year } = shouldShowWrapped({
    now,
    cookCount: args.cookCount,
    lastSeenYear,
  });

  const markSeen = async (): Promise<void> => {
    if (year === null) return;
    try {
      await AsyncStorage.setItem(WRAPPED_SEEN_KEY, String(year));
      setLastSeenYear(year);
    } catch {
      // Storage failure is non-fatal — surface re-renders next session.
    }
  };

  return { shouldShow: show, year, markSeen };
}
