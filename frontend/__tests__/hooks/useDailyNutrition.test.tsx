// P5: useDailyNutrition extracted from app/(tabs)/index.tsx.

const mockFetchDaily = jest.fn();

jest.mock('../../lib/api', () => ({
  nutritionApi: {
    fetchDaily: () => mockFetchDaily(),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDailyNutrition } from '../../hooks/useDailyNutrition';

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

const SNAPSHOT = {
  totals: { calories: 1240, protein: 82, carbs: 110, fat: 38, fiber: 18 },
  topMineral: 'magnesium',
  ingredientsCount: 22,
};

describe('useDailyNutrition (P5)', () => {
  beforeEach(() => {
    mockFetchDaily.mockReset();
  });

  it('starts with null snapshot and loading=true', () => {
    mockFetchDaily.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useDailyNutrition(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('exposes the fetched snapshot', async () => {
    mockFetchDaily.mockResolvedValue({ data: { snapshot: SNAPSHOT } });
    const { result } = renderHook(() => useDailyNutrition(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshot).toEqual(SNAPSHOT);
  });

  it('returns null on API error (UI never blanks)', async () => {
    mockFetchDaily.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDailyNutrition(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshot).toBeNull();
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockFetchDaily.mockResolvedValue({ data: { snapshot: SNAPSHOT } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useDailyNutrition(), { wrapper });
    const b = renderHook(() => useDailyNutrition(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockFetchDaily).toHaveBeenCalledTimes(1);
  });
});
