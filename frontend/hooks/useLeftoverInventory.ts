// frontend/hooks/useLeftoverInventory.ts
// Group 10X Phase 6 — fetches active leftovers from /api/leftover-inventory.

import { useEffect, useState } from 'react';
import { leftoverInventoryApi, type LeftoverInventoryItem } from '../lib/api';

export interface UseLeftoverInventoryResult {
  leftovers: LeftoverInventoryItem[];
  isLoading: boolean;
  hasEnoughForStretch: boolean;
}

export function useLeftoverInventory(): UseLeftoverInventoryResult {
  const [leftovers, setLeftovers] = useState<LeftoverInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await leftoverInventoryApi.list();
        if (!cancelled) {
          setLeftovers(res.data?.leftovers ?? []);
        }
      } catch {
        if (!cancelled) {
          setLeftovers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    leftovers,
    isLoading,
    hasEnoughForStretch: leftovers.length >= 2,
  };
}
