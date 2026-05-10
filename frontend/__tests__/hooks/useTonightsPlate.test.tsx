// frontend/__tests__/hooks/useTonightsPlate.test.tsx
// Group 10X Phase 2 — hook that fetches & caches the plate-from-pantry result.
// P5 (persister): hand-rolled AsyncStorage cache replaced by React Query
// + the global persister. Tests now wrap renderHook in QueryClientProvider.

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    plateFromPantry: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mealComponentApi } from '../../lib/api';
import { useTonightsPlate } from '../../hooks/useTonightsPlate';

const MOCK_PLATE = {
  id: 'plate-1',
  components: [],
  coherenceScore: 0.9,
  pantryCoveragePercent: 100,
  macroFitScore: 0.85,
};

const mockPlateFromPantry = mealComponentApi.plateFromPantry as jest.Mock;

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

describe('useTonightsPlate (P5 persister)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlateFromPantry.mockResolvedValue({ data: { plate: MOCK_PLATE } });
  });

  it('calls plateFromPantry on mount', async () => {
    renderHook(() => useTonightsPlate(), { wrapper: withClient(makeClient()) });
    await waitFor(() => {
      expect(mockPlateFromPantry).toHaveBeenCalledTimes(1);
    });
  });

  it('returns plate after successful fetch', async () => {
    const { result } = renderHook(() => useTonightsPlate(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => {
      expect(result.current.plate).toEqual(MOCK_PLATE);
    });
  });

  it('returns null plate when API returns null', async () => {
    mockPlateFromPantry.mockResolvedValue({ data: { plate: null } });
    const { result } = renderHook(() => useTonightsPlate(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.plate).toBeNull();
  });

  it('returns error=false on successful fetch', async () => {
    const { result } = renderHook(() => useTonightsPlate(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
  });

  it('returns error=true when API throws', async () => {
    mockPlateFromPantry.mockRejectedValue(new Error('Network fail'));
    const { result } = renderHook(() => useTonightsPlate(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.plate).toBeNull();
  });

  it('refetch() invalidates and re-hits the API', async () => {
    mockPlateFromPantry
      .mockResolvedValueOnce({ data: { plate: MOCK_PLATE } })
      .mockResolvedValueOnce({ data: { plate: { ...MOCK_PLATE, id: 'plate-2' } } });
    const { result } = renderHook(() => useTonightsPlate(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.plate?.id).toBe('plate-1'));
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.plate?.id).toBe('plate-2'));
    expect(mockPlateFromPantry).toHaveBeenCalledTimes(2);
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useTonightsPlate(), { wrapper });
    const b = renderHook(() => useTonightsPlate(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockPlateFromPantry).toHaveBeenCalledTimes(1);
  });
});
