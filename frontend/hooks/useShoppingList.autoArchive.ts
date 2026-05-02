// frontend/hooks/useShoppingList.autoArchive.ts
// Group 10Q-ListMgmt: Auto-archive shopping list on completion.
// Watches items array. When every item is purchased, fires a celebration callback
// and starts a 10-second grace timer. If any item is unchecked within 10s, the
// timer is cancelled. After 10s, calls archiveOnCompletion and triggers a refresh.

import { useEffect, useRef } from 'react';
import { shoppingListApi } from '../lib/api';
import { ShoppingListItem } from '../types';

const GRACE_PERIOD_MS = 10_000;

export interface AutoArchiveOptions {
  listId: string | null | undefined;
  items: ShoppingListItem[];
  loading: boolean;
  onCelebrate: () => void;
  onRefresh: () => void;
}

/**
 * Fires `onCelebrate` once when all items become purchased, then waits 10 seconds.
 * If any item is unchecked within the grace period the timer is cleared.
 * After 10 seconds calls `shoppingListApi.archiveOnCompletion(listId)` and then `onRefresh`.
 */
export function useAutoArchiveOnCompletion({
  listId,
  items,
  loading,
  onCelebrate,
  onRefresh,
}: AutoArchiveOptions): void {
  const prevAllDone = useRef(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGrace = () => {
    if (graceTimerRef.current !== null) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (loading || !listId || items.length === 0) {
      return;
    }

    const allDone = items.every((item) => item.purchased);

    if (allDone && !prevAllDone.current) {
      // Transition: incomplete → complete
      prevAllDone.current = true;
      onCelebrate();

      graceTimerRef.current = setTimeout(async () => {
        graceTimerRef.current = null;
        try {
          await shoppingListApi.archiveOnCompletion(listId);
        } catch {
          // Non-blocking: archive failure doesn't prevent refresh
        }
        onRefresh();
      }, GRACE_PERIOD_MS);
    } else if (!allDone) {
      if (prevAllDone.current) {
        // Transition: complete → incomplete (item unchecked within grace)
        clearGrace();
      }
      prevAllDone.current = false;
    }

    return clearGrace;
  }, [items, loading, listId]);
}
