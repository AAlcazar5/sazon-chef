// frontend/hooks/useReasoningPeekGate.ts
// ROADMAP 4.0 HX2.4 — once-per-session "tap to peek" gate.
//
// Tracks whether the user has seen / dismissed the rationale-ribbon peek
// for the current local date. Returns `showPeek` (true on the first
// session of the day, false after the first dismiss). Persists via
// AsyncStorage so the dot doesn't re-pulse if the user reopens the app.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'reasoningPeekDismissedOn:v1';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

export interface UseReasoningPeekGateResult {
  showPeek: boolean;
  /** Mark the peek as shown for the day (call when the user opens the sheet). */
  dismissPeek: () => Promise<void>;
  /** True when the gate has finished hydrating from AsyncStorage. */
  loaded: boolean;
}

export function useReasoningPeekGate(): UseReasoningPeekGateResult {
  const [showPeek, setShowPeek] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        const dismissedOn = raw ?? '';
        setShowPeek(dismissedOn !== todayKey());
      } catch {
        if (!cancelled) setShowPeek(false);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissPeek = useCallback(async () => {
    setShowPeek(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* swallow */
    }
  }, []);

  return { showPeek, dismissPeek, loaded };
}
