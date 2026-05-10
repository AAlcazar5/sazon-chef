// frontend/__tests__/hooks/usePopularSearches.test.tsx
// P5: wrapped renderHook in QueryClientProvider after migration.

const mockGetPopularSearches = jest.fn();

jest.mock('../../lib/api', () => ({
  searchApi: {
    getPopularSearches: (...args: unknown[]) => mockGetPopularSearches(...args),
  },
}));

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePopularSearches } from '../../hooks/usePopularSearches';

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

const POPULAR = [
  { query: 'salmon', count: 12 },
  { query: 'thai', count: 9 },
];

describe('usePopularSearches (P5)', () => {
  beforeEach(() => {
    mockGetPopularSearches.mockReset();
  });

  it('fetches and exposes popular searches', async () => {
    mockGetPopularSearches.mockResolvedValue({ data: { popularSearches: POPULAR } });
    const { result } = renderHook(() => usePopularSearches(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.popularSearches).toEqual(POPULAR);
    expect(mockGetPopularSearches).toHaveBeenCalledWith(5);
  });

  it('returns empty array on API error', async () => {
    mockGetPopularSearches.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePopularSearches(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.popularSearches).toEqual([]);
  });

  it('skips initial fetch when initialData is provided', () => {
    const { result } = renderHook(
      () => usePopularSearches({ initialData: POPULAR }),
      { wrapper: withClient(makeClient()) },
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.popularSearches).toEqual(POPULAR);
    expect(mockGetPopularSearches).not.toHaveBeenCalled();
  });

  it('refresh() invalidates so the next fetch reloads', async () => {
    mockGetPopularSearches
      .mockResolvedValueOnce({ data: { popularSearches: POPULAR } })
      .mockResolvedValueOnce({
        data: { popularSearches: [{ query: 'pho', count: 99 }] },
      });
    const { result } = renderHook(() => usePopularSearches(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.popularSearches).toEqual(POPULAR);
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() =>
      expect(result.current.popularSearches[0].query).toBe('pho'),
    );
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetPopularSearches.mockResolvedValue({ data: { popularSearches: POPULAR } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => usePopularSearches(), { wrapper });
    const b = renderHook(() => usePopularSearches(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockGetPopularSearches).toHaveBeenCalledTimes(1);
  });
});
