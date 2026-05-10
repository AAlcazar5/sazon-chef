// P5: useVarietyScore migrated to React Query.

const mockGetVarietyScore = jest.fn();

jest.mock('../../lib/api', () => ({
  mealPlanApi: {
    getVarietyScore: (id: string) => mockGetVarietyScore(id),
  },
}));

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVarietyScore } from '../../hooks/useVarietyScore';

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

const SCORE_PAYLOAD = {
  varietyScore: {
    score: 78,
    isBoringWeek: false,
    uniqueProteins: 4,
    uniqueCuisines: 3,
    consecutiveProteinRepeats: 1,
    consecutiveCuisineRepeats: 1,
    repeatedMealTitles: 0,
  },
  repetitiveMealIds: [],
  nudgeMessage: null,
};

describe('useVarietyScore (P5)', () => {
  beforeEach(() => {
    mockGetVarietyScore.mockReset();
  });

  it('returns null result and skips fetch when mealPlanId is null', () => {
    const { result } = renderHook(() => useVarietyScore(null), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.result).toBeNull();
    expect(mockGetVarietyScore).not.toHaveBeenCalled();
  });

  it('fetches and exposes the variety result for a given mealPlanId', async () => {
    mockGetVarietyScore.mockResolvedValue({ data: SCORE_PAYLOAD });
    const { result } = renderHook(() => useVarietyScore('plan-1'), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result).toEqual(SCORE_PAYLOAD);
    expect(mockGetVarietyScore).toHaveBeenCalledWith('plan-1');
  });

  it('exposes a string error message on API failure', async () => {
    mockGetVarietyScore.mockRejectedValue(new Error('variety down'));
    const { result } = renderHook(() => useVarietyScore('plan-1'), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/variety down/);
  });

  it('refresh() invalidates and refetches', async () => {
    mockGetVarietyScore
      .mockResolvedValueOnce({ data: SCORE_PAYLOAD })
      .mockResolvedValueOnce({
        data: { ...SCORE_PAYLOAD, varietyScore: { ...SCORE_PAYLOAD.varietyScore, score: 50 } },
      });
    const { result } = renderHook(() => useVarietyScore('plan-1'), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.result?.varietyScore.score).toBe(78));
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.result?.varietyScore.score).toBe(50));
    expect(mockGetVarietyScore).toHaveBeenCalledTimes(2);
  });

  it('shares one cache entry across consumers with the same mealPlanId (P5 dedup)', async () => {
    mockGetVarietyScore.mockResolvedValue({ data: SCORE_PAYLOAD });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useVarietyScore('plan-1'), { wrapper });
    const b = renderHook(() => useVarietyScore('plan-1'), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockGetVarietyScore).toHaveBeenCalledTimes(1);
  });
});
