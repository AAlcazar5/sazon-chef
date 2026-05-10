// frontend/hooks/useLeftoverInventory.ts
// Group 10X Phase 6 — fetches active leftovers from /api/leftover-inventory.
//
// P5: migrated to React Query so leftover inventory is cached across the
// Build-a-Plate "stretch this leftover" surfaces and the Today use-it-up
// strip without redundant fetches.

import { useQuery } from '@tanstack/react-query';
import { leftoverInventoryApi, type LeftoverInventoryItem } from '../lib/api';

export interface UseLeftoverInventoryResult {
  leftovers: LeftoverInventoryItem[];
  isLoading: boolean;
  hasEnoughForStretch: boolean;
}

const QUERY_KEY = ['leftoverInventory'] as const;
const EMPTY: LeftoverInventoryItem[] = [];

export function useLeftoverInventory(): UseLeftoverInventoryResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<LeftoverInventoryItem[]> => {
      try {
        const res = await leftoverInventoryApi.list();
        return res.data?.leftovers ?? EMPTY;
      } catch {
        return EMPTY;
      }
    },
  });

  const leftovers = query.data ?? EMPTY;

  return {
    leftovers,
    isLoading: query.isLoading,
    hasEnoughForStretch: leftovers.length >= 2,
  };
}
