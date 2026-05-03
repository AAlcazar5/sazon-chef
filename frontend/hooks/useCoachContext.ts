// 10Y Phase 3: lightweight hook for the Coach quick-start chip context.

import { useEffect, useState } from 'react';
import { coachApi, type CoachContextResponse } from '../lib/api';

interface UseCoachContextResult {
  context: CoachContextResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useCoachContext(): UseCoachContextResult {
  const [context, setContext] = useState<CoachContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    coachApi
      .getCoachContext()
      .then((data) => {
        if (cancelled) return;
        setContext(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load coach context');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { context, isLoading, error };
}
