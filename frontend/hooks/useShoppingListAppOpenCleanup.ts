// frontend/hooks/useShoppingListAppOpenCleanup.ts
// 10Q-ListMgmt task 2 & 3: app-open cleanup — runs once per session.
// Invokes cleanupOrphans, autoArchiveStale, and tierArchived in parallel.
// Throttled to once per 24h via AsyncStorage.
// NOTE: This file lives in frontend/hooks/ which is gitignored by the root
// hooks/ glob. Use `git add -f frontend/hooks/useShoppingListAppOpenCleanup.ts`
// when staging.

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { shoppingListApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const CLEANUP_KEY = 'lastShoppingListCleanup';
const MS_24H = 24 * 60 * 60 * 1000;

export function useShoppingListAppOpenCleanup(): void {
  const { showToast } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const raw = await AsyncStorage.getItem(CLEANUP_KEY);
      if (raw) {
        const lastRun = Number(raw);
        if (Date.now() - lastRun < MS_24H) return;
      }

      const [cleanupRes, archiveRes] = await Promise.all([
        shoppingListApi.cleanupOrphans(),
        shoppingListApi.autoArchiveStale(),
        shoppingListApi.tierArchived(),
      ]);

      await AsyncStorage.setItem(CLEANUP_KEY, String(Date.now()));

      const archivedIds: string[] = archiveRes.data?.archivedIds ?? [];
      if (archivedIds.length > 0) {
        showToast(
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
