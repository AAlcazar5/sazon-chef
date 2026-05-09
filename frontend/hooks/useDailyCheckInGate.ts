// frontend/hooks/useDailyCheckInGate.ts
// ROADMAP 4.0 Tier C7 — once-per-day gate for the post-cook DailyCheckIn.
//
// The check-in card surfaces inside the cook-complete celebration. To stop
// it from reappearing every cook, we persist the last-shown ISO date in
// AsyncStorage and suppress the card when it matches today.
//
// dismiss() writes today's date — call from both Skip and Save.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sazon/daily-checkin/last-shown-date';

function todayLocalISODate(): string {
  // YYYY-MM-DD in the device's local timezone — the user's "today" matches
  // their wall clock, not UTC midnight.
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DailyCheckInGate {
  /** True when the card should render (today not yet shown). null while hydrating. */
  shouldShow: boolean | null;
  /** Mark today as shown so the card won't surface again until tomorrow. */
  dismiss: () => Promise<void>;
}

export function useDailyCheckInGate(): DailyCheckInGate {
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        setShouldShow(stored !== todayLocalISODate());
      })
      .catch(() => {
        if (!cancelled) setShouldShow(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, todayLocalISODate());
    } catch {
      // Best-effort — UX never blocks on storage.
    }
  }, []);

  return { shouldShow, dismiss };
}

// Exported for tests.
export const __DAILY_CHECKIN_STORAGE_KEY = STORAGE_KEY;
