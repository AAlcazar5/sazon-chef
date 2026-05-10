// P5 (persister): AsyncStorage-backed React Query cache persister.
//
// Persists the in-memory query cache to AsyncStorage so cold starts can
// hydrate from disk before the network round-trip completes. Eliminates
// the "blank then populate" flash for slow-changing data (recipe feed,
// pantry, plate suggestions, weather collection).
//
// Pair with `createQueryClient()` from `./queryClient`. The two stay in
// sync via `gcTime ≥ QUERY_PERSISTER_DEFAULTS.maxAge` so queries don't get
// garbage-collected before they can be persisted.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

type CreatePersisterArg = Parameters<typeof createAsyncStoragePersister>[0];

export const QUERY_PERSISTER_DEFAULTS = {
  // Single brand-prefixed key; avoids collision with auth/profile/etc.
  key: 'sazon-query-cache',
  // Survive an overnight app close — most users open Sazon once or twice
  // a day, so 24h hydration covers the typical cold-start path.
  maxAge: 24 * 60 * 60 * 1000,
  // Coalesce writes — a burst of cache mutations within 1s flushes once.
  throttleTime: 1000,
} as const;

export function createQueryPersister(
  overrides: Partial<CreatePersisterArg> = {},
) {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: QUERY_PERSISTER_DEFAULTS.key,
    throttleTime: QUERY_PERSISTER_DEFAULTS.throttleTime,
    ...overrides,
  });
}
