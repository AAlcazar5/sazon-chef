// P5: useCoachContext migrated to React Query.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetCoachContext = jest.fn();

jest.mock('../../lib/api', () => ({
  coachApi: {
    getCoachContext: () => mockGetCoachContext(),
  },
}));

import { useCoachContext } from '../../hooks/useCoachContext';

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

const RAW_CONTEXT = {
  pantryExpiringSoon: ['cilantro'],
  remainingMacros: { calories: 800, protein: 40, carbs: 90, fat: 25 },
  leftoverInventory: [],
  topAdjacentCuisine: 'Vietnamese',
};

describe('useCoachContext (P5)', () => {
  beforeEach(() => {
    mockGetCoachContext.mockReset();
  });

  it('starts with isLoading=true and resolves to the raw response', async () => {
    mockGetCoachContext.mockResolvedValue(RAW_CONTEXT);
    const { result } = renderHook(() => useCoachContext(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.context).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.context).toEqual(RAW_CONTEXT);
    expect(result.current.error).toBeNull();
  });

  it('exposes a string error message on API failure', async () => {
    mockGetCoachContext.mockRejectedValue(new Error('coach down'));
    const { result } = renderHook(() => useCoachContext(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.context).toBeNull();
    expect(result.current.error).toMatch(/coach down/);
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetCoachContext.mockResolvedValue(RAW_CONTEXT);
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useCoachContext(), { wrapper });
    const b = renderHook(() => useCoachContext(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.isLoading).toBe(false);
      expect(b.result.current.isLoading).toBe(false);
    });
    expect(mockGetCoachContext).toHaveBeenCalledTimes(1);
  });
});
