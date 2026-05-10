// Phase 6 (10Y-C): Memory count for the coach header pill.
// Pro-only; free users return 0 without fetching. Errors are swallowed silently.
//
// P5: migrated from useEffect+useState to React Query so multiple consumers
// of this hook share a single cache entry (deduped fetches; cached count
// stays available across navigations within the staleTime window).

import { useQuery } from '@tanstack/react-query';
import { coachApi } from '../lib/api';
import { useSubscription } from './useSubscription';

export function useCoachMemoryCount(): number {
  const { subscription } = useSubscription();
  const isPro =
    subscription.isPremium === true && subscription.tier === 'premium';

  const { data } = useQuery({
    queryKey: ['coachMemories', 'count'],
    queryFn: async () => {
      try {
        const memories = await coachApi.listMemories();
        return memories.length;
      } catch {
        // Silent fallback to 0 — preserves the prior contract.
        return 0;
      }
    },
    enabled: isPro,
    initialData: 0,
  });

  return data ?? 0;
}
