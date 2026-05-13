// P2 retention — widget data sync hook.
//
// Fetches the "Tonight's Plate" payload from the backend and persists it to
// AsyncStorage. The native widget extension (iOS WidgetKit / Android
// AppWidget) will read this via a SharedDefaults bridge in the production
// build — see frontend/widgets/README.md for the contract.
//
// Today the AsyncStorage write is a placeholder so we can validate the
// data shape end-to-end without the native target wired up. Swapping in
// the real bridge is a single-line change in `persist()`.

import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayApi, type WidgetPayload } from '../lib/api/today';

const STORAGE_KEY = '@sazon/widget/tonights_plate';

async function persist(payload: WidgetPayload): Promise<void> {
  // PLACEHOLDER — production should write to a shared App Group via a
  // native module (see frontend/widgets/README.md "Native bridge").
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* best-effort */
  }
}

/**
 * Fetches the widget payload and persists it. Safe to call on a hot path —
 * errors are swallowed.
 */
export async function syncWidgetOnce(): Promise<WidgetPayload | null> {
  try {
    const res = await todayApi.widget();
    const payload = res?.data ?? null;
    if (payload) await persist(payload);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hook: syncs once on mount, then again on every app-foreground transition.
 * Mount once at the top of the app (e.g. inside `_layout.tsx`).
 */
export function useWidgetSync(): void {
  const sync = useCallback(() => {
    void syncWidgetOnce();
  }, []);

  useEffect(() => {
    sync();
    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') sync();
      },
    );
    return () => {
      sub.remove();
    };
  }, [sync]);
}

export const WIDGET_STORAGE_KEY = STORAGE_KEY;
