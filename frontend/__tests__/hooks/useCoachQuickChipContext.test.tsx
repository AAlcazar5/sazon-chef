// P5: useCoachQuickChipContext migrated to React Query.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetCoachContext = jest.fn();

jest.mock('../../lib/api', () => ({
  coachApi: {
    getCoachContext: () => mockGetCoachContext(),
  },
}));

import { useCoachQuickChipContext } from '../../hooks/useCoachQuickChipContext';

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

describe('useCoachQuickChipContext (P5)', () => {
  beforeEach(() => {
    mockGetCoachContext.mockReset();
  });

  it('returns the empty fallback before the fetch resolves', () => {
    mockGetCoachContext.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useCoachQuickChipContext(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.pantryExpiringSoon).toEqual([]);
    expect(result.current.remainingMacros).toBeNull();
    expect(result.current.leftoverInventory).toEqual([]);
    expect(result.current.topAdjacentCuisine).toBeNull();
  });

  it('populates context when /api/coach/context resolves', async () => {
    mockGetCoachContext.mockResolvedValue({
      pantryExpiringSoon: ['cilantro', 'lime'],
      remainingMacros: { calories: 800, protein: 40, carbs: 90, fat: 25 },
      leftoverInventory: [
        { componentId: 'glaze-bite-1', portionsRemaining: 2 },
        { componentId: 'rice-cup', portionsRemaining: 1 },
      ],
      topAdjacentCuisine: 'Vietnamese',
    });
    const { result } = renderHook(() => useCoachQuickChipContext(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.topAdjacentCuisine).toBe('Vietnamese'));
    expect(result.current.pantryExpiringSoon).toEqual(['cilantro', 'lime']);
    expect(result.current.remainingMacros).toEqual({
      calories: 800,
      protein: 40,
      carbs: 90,
      fat: 25,
    });
    expect(result.current.leftoverInventory).toEqual([
      { componentId: 'glaze-bite-1' },
      { componentId: 'rice-cup' },
    ]);
  });

  it('keeps the empty fallback on API error (UI must never blank)', async () => {
    mockGetCoachContext.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCoachQuickChipContext(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(mockGetCoachContext).toHaveBeenCalled());
    expect(result.current.pantryExpiringSoon).toEqual([]);
    expect(result.current.remainingMacros).toBeNull();
    expect(result.current.leftoverInventory).toEqual([]);
    expect(result.current.topAdjacentCuisine).toBeNull();
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetCoachContext.mockResolvedValue({
      pantryExpiringSoon: [],
      remainingMacros: null,
      leftoverInventory: [],
      topAdjacentCuisine: null,
    });
    const client = makeClient();
    const wrapper = withClient(client);
    renderHook(() => useCoachQuickChipContext(), { wrapper });
    renderHook(() => useCoachQuickChipContext(), { wrapper });
    await waitFor(() => expect(mockGetCoachContext).toHaveBeenCalled());
    expect(mockGetCoachContext).toHaveBeenCalledTimes(1);
  });
});
