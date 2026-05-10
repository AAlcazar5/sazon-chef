// P5: React Query client factory.
//
// Centralized QueryClient configuration so tests and the app share one source
// of truth for caching defaults. Exported as a factory (not a singleton) so
// tests get a clean cache per run.
//
// Defaults explained:
//   - staleTime 30s: most user-facing data (recipe lists, meal plan, profile)
//     is fine to serve stale-while-revalidate within a half-minute window.
//     Reduces redundant fetches on rapid back/forward navigation.
//   - gcTime 24h: matches the AsyncStorage persister maxAge so queries
//     stay in the in-memory cache long enough to be flushed to disk and
//     survive a cold start. Without this they'd be garbage-collected at
//     5min and the persister would only save the most recent set.
//   - retry 1: one automatic retry on failure. Two would mask real outages;
//     zero is too brittle on flaky mobile networks.
//   - refetchOnWindowFocus: false. React Native has no window focus event;
//     screens that need on-focus refetch should call useFocusEffect explicitly.
//   - refetchOnReconnect: false. Handled per-screen where it matters.

import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}
