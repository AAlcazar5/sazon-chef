// P5: useWeeklyRecap extracted from app/(tabs)/index.tsx.

const mockFetchThisWeek = jest.fn();

jest.mock('../../lib/api', () => ({
  weeklyRecapApi: {
    fetchThisWeek: () => mockFetchThisWeek(),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeeklyRecap } from '../../hooks/useWeeklyRecap';

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

const RECAP = {
  weekStart: '2026-05-04',
  weekEnd: '2026-05-10',
  topCuisine: 'Mediterranean',
  topMineral: 'magnesium',
  discovery: { kind: 'cuisine', name: 'Lebanese' },
};

describe('useWeeklyRecap (P5)', () => {
  beforeEach(() => {
    mockFetchThisWeek.mockReset();
  });

  it('exposes the fetched recap', async () => {
    mockFetchThisWeek.mockResolvedValue({ data: RECAP });
    const { result } = renderHook(() => useWeeklyRecap(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recap).toEqual(RECAP);
  });

  it('returns null on API error', async () => {
    mockFetchThisWeek.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useWeeklyRecap(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recap).toBeNull();
  });

  it('returns null when API returns null payload', async () => {
    mockFetchThisWeek.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useWeeklyRecap(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recap).toBeNull();
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockFetchThisWeek.mockResolvedValue({ data: RECAP });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useWeeklyRecap(), { wrapper });
    const b = renderHook(() => useWeeklyRecap(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockFetchThisWeek).toHaveBeenCalledTimes(1);
  });
});
