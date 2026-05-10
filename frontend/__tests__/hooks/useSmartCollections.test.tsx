// P5: useSmartCollections extracted from app/(tabs)/cookbook.tsx.

const mockGetSmartCollections = jest.fn();

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getSmartCollections: () => mockGetSmartCollections(),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSmartCollections } from '../../hooks/useSmartCollections';

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const COLLECTIONS = [
  { id: 'quick-meals', name: 'Quick meals', count: 12 },
  { id: 'weeknights', name: 'Weeknights', count: 8 },
];

describe('useSmartCollections (P5)', () => {
  beforeEach(() => {
    mockGetSmartCollections.mockReset();
  });

  it('fetches and exposes smart collections', async () => {
    mockGetSmartCollections.mockResolvedValue({ data: { collections: COLLECTIONS } });
    const { result } = renderHook(() => useSmartCollections(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.smartCollections).toEqual(COLLECTIONS);
  });

  it('returns empty array on API error', async () => {
    mockGetSmartCollections.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSmartCollections(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.smartCollections).toEqual([]);
  });

  it('skips fetch when enabled=false', () => {
    const { result } = renderHook(() => useSmartCollections({ enabled: false }), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.smartCollections).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockGetSmartCollections).not.toHaveBeenCalled();
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetSmartCollections.mockResolvedValue({ data: { collections: COLLECTIONS } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useSmartCollections(), { wrapper });
    const b = renderHook(() => useSmartCollections(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockGetSmartCollections).toHaveBeenCalledTimes(1);
  });
});
