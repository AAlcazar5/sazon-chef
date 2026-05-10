// P5: useLastCookCuisine extracted from app/(tabs)/index.tsx.

const mockMostRecent = jest.fn();

jest.mock('../../lib/api', () => ({
  cookingHistoryStatsApi: {
    mostRecent: () => mockMostRecent(),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLastCookCuisine } from '../../hooks/useLastCookCuisine';

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

describe('useLastCookCuisine (P5)', () => {
  beforeEach(() => {
    mockMostRecent.mockReset();
  });

  it('returns the cuisine from the API response', async () => {
    mockMostRecent.mockResolvedValue({
      data: { mostRecent: { recipe: { cuisine: 'Vietnamese' } } },
    });
    const { result } = renderHook(() => useLastCookCuisine(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cuisine).toBe('Vietnamese');
  });

  it('returns "" when the API has no recent cook', async () => {
    mockMostRecent.mockResolvedValue({ data: { mostRecent: null } });
    const { result } = renderHook(() => useLastCookCuisine(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cuisine).toBe('');
  });

  it('returns "" on API error', async () => {
    mockMostRecent.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useLastCookCuisine(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cuisine).toBe('');
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockMostRecent.mockResolvedValue({
      data: { mostRecent: { recipe: { cuisine: 'Thai' } } },
    });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useLastCookCuisine(), { wrapper });
    const b = renderHook(() => useLastCookCuisine(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockMostRecent).toHaveBeenCalledTimes(1);
  });
});
