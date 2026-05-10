// P5 (persister): AsyncStorage-backed query cache persister.
//
// Verifies:
//   - createQueryPersister() returns a persister wired to AsyncStorage
//   - Default maxAge is 24h (matches the gcTime in createQueryClient)
//   - Default throttleTime is 1000ms
//   - The cache key is brand-prefixed so it doesn't collide with other
//     AsyncStorage entries
//   - createQueryClient() defaults gcTime to ≥ persister maxAge so queries
//     don't get garbage-collected before they can be persisted

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createQueryPersister, QUERY_PERSISTER_DEFAULTS } from '../../lib/queryPersister';
import { createQueryClient } from '../../lib/queryClient';

describe('P5: createQueryPersister', () => {
  it('returns an object with persistClient + restoreClient + removeClient', () => {
    const persister = createQueryPersister();
    expect(typeof persister.persistClient).toBe('function');
    expect(typeof persister.restoreClient).toBe('function');
    expect(typeof persister.removeClient).toBe('function');
  });

  it('default maxAge is 24h', () => {
    expect(QUERY_PERSISTER_DEFAULTS.maxAge).toBe(24 * 60 * 60 * 1000);
  });

  it('default throttleTime is 1000ms', () => {
    expect(QUERY_PERSISTER_DEFAULTS.throttleTime).toBe(1000);
  });

  it('default cache key is brand-prefixed (avoids collisions with other AsyncStorage entries)', () => {
    expect(QUERY_PERSISTER_DEFAULTS.key).toBe('sazon-query-cache');
  });

  it('persistClient writes to AsyncStorage under the configured key', async () => {
    const persister = createQueryPersister();
    const setItem = AsyncStorage.setItem as jest.Mock;
    setItem.mockClear();
    await persister.persistClient({
      buster: 'test',
      timestamp: Date.now(),
      clientState: { mutations: [], queries: [] },
    });
    expect(setItem).toHaveBeenCalled();
    const [keyArg] = setItem.mock.calls[0] as [string, string];
    expect(keyArg).toBe('sazon-query-cache');
  });
});

describe('P5: createQueryClient gcTime aligns with persister maxAge', () => {
  it('gcTime is at least the persister maxAge so cache survives long enough to persist', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.gcTime).toBeGreaterThanOrEqual(QUERY_PERSISTER_DEFAULTS.maxAge);
  });
});
