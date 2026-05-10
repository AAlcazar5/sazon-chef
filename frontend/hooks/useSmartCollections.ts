// frontend/hooks/useSmartCollections.ts
// Smart collection definitions with live recipe counts (per the user's saved set).
//
// P5: extracted from `app/(tabs)/cookbook.tsx` and migrated to React Query.
// `enabled` lets the cookbook screen suppress the fetch when not on the
// collections view, matching the prior viewMode === 'collections' guard.

import { useQuery } from '@tanstack/react-query';
import { recipeApi } from '../lib/api';

const QUERY_KEY = ['smartCollections'] as const;

interface SmartCollection {
  id: string;
  [key: string]: unknown;
}

interface UseSmartCollectionsResult {
  smartCollections: SmartCollection[];
  loading: boolean;
}

export function useSmartCollections(
  options: { enabled?: boolean } = {},
): UseSmartCollectionsResult {
  const { enabled = true } = options;
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SmartCollection[]> => {
      try {
        const res: any = await recipeApi.getSmartCollections();
        return res.data?.collections ?? [];
      } catch {
        // Silent — empty state handles the visual.
        return [];
      }
    },
    enabled,
  });

  return {
    smartCollections: query.data ?? [],
    loading: enabled ? query.isLoading : false,
  };
}
