// frontend/__tests__/hooks/useRecent7DayPlates.test.tsx
// P5: wrapped renderHook in QueryClientProvider after migration.

const mockWeeklySummary = jest.fn();
jest.mock('../../lib/api', () => ({
  composedPlateApi: {
    weeklySummary: (...args: unknown[]) => mockWeeklySummary(...args),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecent7DayPlates } from '../../hooks/useRecent7DayPlates';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRecent7DayPlates', () => {
  it('returns counts from API on mount', async () => {
    mockWeeklySummary.mockResolvedValueOnce({
      data: { totalPlatesThisWeek: 4, greenVegCount: 1 },
    });
    const { result } = renderHook(() => useRecent7DayPlates(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPlatesThisWeek).toBe(4);
    expect(result.current.greenVegCount).toBe(1);
  });

  it('returns zeros on API failure', async () => {
    mockWeeklySummary.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useRecent7DayPlates(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPlatesThisWeek).toBe(0);
    expect(result.current.greenVegCount).toBe(0);
  });

  it('starts in loading state', () => {
    mockWeeklySummary.mockResolvedValueOnce({
      data: { totalPlatesThisWeek: 0, greenVegCount: 0 },
    });
    const { result } = renderHook(() => useRecent7DayPlates(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('calls weeklySummary exactly once', async () => {
    mockWeeklySummary.mockResolvedValueOnce({
      data: { totalPlatesThisWeek: 0, greenVegCount: 0 },
    });
    renderHook(() => useRecent7DayPlates(), { wrapper: withClient(makeClient()) });
    await waitFor(() => expect(mockWeeklySummary).toHaveBeenCalledTimes(1));
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockWeeklySummary.mockResolvedValue({
      data: { totalPlatesThisWeek: 4, greenVegCount: 1 },
    });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useRecent7DayPlates(), { wrapper });
    const b = renderHook(() => useRecent7DayPlates(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.isLoading).toBe(false);
      expect(b.result.current.isLoading).toBe(false);
    });
    expect(mockWeeklySummary).toHaveBeenCalledTimes(1);
  });
});
