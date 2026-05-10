// 10Y Phase 3: lightweight hook for the Coach quick-start chip context.
//
// P5: migrated to React Query. Uses a separate queryKey from
// useCoachQuickChipContext so the two hooks can mock independently in tests
// even though both hit /api/coach/context — share-the-key consolidation is
// a follow-up if profiling shows duplicate fetches at runtime.

import { useQuery } from '@tanstack/react-query';
import { coachApi, type CoachContextResponse } from '../lib/api';

interface UseCoachContextResult {
  context: CoachContextResponse | null;
  isLoading: boolean;
  error: string | null;
}

const QUERY_KEY = ['coachContext', 'raw'] as const;

export function useCoachContext(): UseCoachContextResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => coachApi.getCoachContext(),
  });

  return {
    context: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
