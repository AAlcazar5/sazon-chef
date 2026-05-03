// Phase 6 (10Y-C): One-time fetch of memory count for the coach header pill.
// Pro-only; free users return 0 without fetching. Errors are swallowed silently.

import { useEffect, useState } from 'react';
import { coachApi } from '../lib/api';
import { useSubscription } from './useSubscription';

export function useCoachMemoryCount(): number {
  const { subscription } = useSubscription();
  const isPro =
    subscription.isPremium === true && subscription.tier === 'premium';
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isPro) return;
    let cancelled = false;
    (async () => {
      try {
        const memories = await coachApi.listMemories();
        if (!cancelled) setCount(memories.length);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro]);

  return count;
}
