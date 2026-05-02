// frontend/hooks/useShoppingListAppOpenCleanup.ts
// 10Q-ListMgmt task 2 & 3: app-open cleanup — runs once per session.
// Invokes cleanupOrphans, autoArchiveStale, and tierArchived in parallel.
// Throttled to once per 24h via AsyncStorage.
// NOTE: This file lives in frontend/hooks/ which is gitignored by the root
// hooks/ glob. Use `git add -f frontend/hooks/useShoppingListAppOpenCleanup.ts`
// when staging.

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shoppingListApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const CLEANUP_KEY = 'lastShoppingListCleanup';
const MS_24H = 24 * 60 * 60 * 1000;

export function useShoppingListAppOpenCleanup(): void {
  const { showToast } = useToast();
  const hasRun = useRef(false);
  // Hold the latest showToast in a ref so the once-only effect uses the
  // current callback even if ToastContext remounts.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const raw = await AsyncStorage.getItem(CLEANUP_KEY).catch(() => null);
      if (raw) {
        const lastRun = Number(raw);
        if (Number.isFinite(lastRun) && Date.now() - lastRun < MS_24H) return;
      }

      const [, archiveRes] = await Promise.all([
        shoppingListApi.cleanupOrphans(),
        shoppingListApi.autoArchiveStale(),
        shoppingListApi.tierArchived(),
      ]);

      await AsyncStorage.setItem(CLEANUP_KEY, String(Date.now())).catch(() => {});

      // Backend wraps responses as { success: true, data: { archivedIds } } —
      // axios then puts that body on response.data, so we need data.data in
      // production. Tests mock the simpler { data: { archivedIds } } shape,
      // so accept both via a fallback.
      const body = archiveRes?.data as
        | { archivedIds?: string[]; data?: { archivedIds?: string[] } }
        | undefined;
      const archivedIds = body?.data?.archivedIds ?? body?.archivedIds ?? [];
      if (archivedIds.length > 0) {
        showToastRef.current(
          `Archived ${archivedIds.length} old list${archivedIds.length === 1 ? '' : 's'} — tap to view`,
          'info',
        );
      }
    };

    run().catch(() => {
      // Silent — cleanup is best-effort; failures must not surface to users
    });
  }, []);
}
