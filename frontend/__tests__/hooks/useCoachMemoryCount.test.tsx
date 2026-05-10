// Phase 6 (10Y-C): One-time fetch of memory count for the coach screen pill.
// Pro-only; free users return 0 without fetching. API errors are swallowed.
//
// P5: tests now wrap renderHook in a fresh QueryClientProvider per test so
// the hook can call useQuery. New "shares one cache entry" test verifies
// that two consumers of the hook only trigger a single network call.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockListMemories = jest.fn();

jest.mock('../../lib/api', () => ({
  coachApi: {
    listMemories: () => mockListMemories(),
  },
}));

const mockUseSubscription = jest.fn();

jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

import { useCoachMemoryCount } from '../../hooks/useCoachMemoryCount';

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCoachMemoryCount', () => {
  beforeEach(() => {
    mockListMemories.mockReset();
    mockUseSubscription.mockReset();
  });

  it('returns 0 for free users without fetching', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'free', isPremium: false },
    });
    const { result } = renderHook(() => useCoachMemoryCount(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current).toBe(0);
    expect(mockListMemories).not.toHaveBeenCalled();
  });

  it('fetches and returns count for Pro users', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
    });
    mockListMemories.mockResolvedValue([
      { id: 'a', kind: 'preference', content: 'x', confidence: 0.8 },
      { id: 'b', kind: 'goal', content: 'y', confidence: 0.6 },
    ]);
    const { result } = renderHook(() => useCoachMemoryCount(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current).toBe(2));
    expect(mockListMemories).toHaveBeenCalledTimes(1);
  });

  it('returns 0 silently on API error', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
    });
    mockListMemories.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCoachMemoryCount(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(mockListMemories).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
    });
    mockListMemories.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const client = makeClient();
    const wrapper = withClient(client);
    // Render two hook consumers under the same client — React Query should
    // dedup these into a single in-flight fetch.
    const a = renderHook(() => useCoachMemoryCount(), { wrapper });
    const b = renderHook(() => useCoachMemoryCount(), { wrapper });
    await waitFor(() => {
      expect(a.result.current).toBe(3);
      expect(b.result.current).toBe(3);
    });
    expect(mockListMemories).toHaveBeenCalledTimes(1);
  });
});
