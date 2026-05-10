// P5: QueryClient factory + defaults.
//
// Verifies:
//   - createQueryClient() returns a configured QueryClient with stale/gc
//     defaults that match our app contract (staleTime 30s, gcTime 5min, retry 1)
//   - Default refetchOnWindowFocus is OFF (RN apps don't have window focus
//     in the web sense; we trigger refetch via screen focus instead)
//   - The factory creates a fresh instance per call so tests can isolate state.

import { createQueryClient } from '../../lib/queryClient';

describe('P5: createQueryClient', () => {
  it('returns a fresh QueryClient on each call', () => {
    const a = createQueryClient();
    const b = createQueryClient();
    expect(a).not.toBe(b);
  });

  it('configures default staleTime to 30s', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.staleTime).toBe(30_000);
  });

  it('configures default gcTime to 24h (matches persister maxAge)', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.gcTime).toBe(24 * 60 * 60 * 1000);
  });

  it('retries failed queries at most once', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.retry).toBe(1);
  });

  it('disables refetchOnWindowFocus (RN has no window focus)', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('disables refetchOnReconnect by default (handled per-screen)', () => {
    const client = createQueryClient();
    const opts = client.getDefaultOptions();
    expect(opts.queries?.refetchOnReconnect).toBe(false);
  });
});
