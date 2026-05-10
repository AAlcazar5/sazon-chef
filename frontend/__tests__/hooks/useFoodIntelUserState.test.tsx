// Group 10R-Phase2: useFoodIntelUserState hook — verifies snapshot wiring.

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_test' } }),
}));

jest.mock('../../hooks/useSkillTier', () => ({
  __esModule: true,
  default: () => ({ tier: 'cook', isSauceVisible: true, isVariantChipsVisible: false, loading: false }),
}));

jest.mock('../../hooks/useCookingJourney', () => ({
  useCookingJourney: () => ({
    stats: {
      cuisinesExplored: ['italian', 'japanese'],
      cuisinesExploredThisMonth: [],
      recipesCookedAllTime: 12,
      recipesCookedThisMonth: 3,
      averageDifficulty: 1,
      averageDifficultyLabel: 'easy',
      difficultyTrend: 'steady',
      longestStreakDays: 4,
      currentStreakDays: 2,
      firstCookedCuisines: [],
      seededCuisines: [],
    },
    progress: null,
    loading: false,
    error: null,
    refresh: jest.fn(),
    acceptLevelUp: jest.fn(),
    seedJourney: jest.fn(),
  }),
}));

const mockGetAffinitySnapshot = jest.fn();
jest.mock('../../lib/api', () => ({
  userApi: {
    getAffinitySnapshot: (...a: unknown[]) => mockGetAffinitySnapshot(...a),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useFoodIntelUserState', () => {
  it('starts with empty defaults before the snapshot resolves', () => {
    mockGetAffinitySnapshot.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useFoodIntelUserState(), { wrapper: withClient(makeClient()) });

    expect(result.current.userId).toBe('user_test');
    expect(result.current.skillTier).toBe('cook');
    expect(result.current.cookHistory.cuisines).toEqual(['italian', 'japanese']);
    expect(result.current.topAffinityIngredients).toEqual([]);
    expect(result.current.rolling7dNutrientGaps).toEqual([]);
    expect(result.current.goalPhase).toBe('maintain');
    expect(result.current.last7DaysIngredients).toEqual([]);
  });

  it('populates topAffinityIngredients, rolling7dNutrientGaps, goalPhase, and last7DaysIngredients from the snapshot', async () => {
    mockGetAffinitySnapshot.mockResolvedValue({
      data: {
        topAffinityIngredients: ['chicken breast', 'olive oil'],
        rolling7dNutrientGaps: ['fiber', 'iron'],
        goalPhase: 'cut',
        last7DaysIngredients: ['chicken breast', 'olive oil', 'spinach'],
      },
    });

    const { result } = renderHook(() => useFoodIntelUserState(), { wrapper: withClient(makeClient()) });
    await waitFor(() => {
      expect(result.current.topAffinityIngredients).toContain('chicken breast');
    });

    expect(result.current.topAffinityIngredients).toContain('olive oil');
    expect(result.current.rolling7dNutrientGaps).toEqual(['fiber', 'iron']);
    expect(result.current.goalPhase).toBe('cut');
    expect(result.current.last7DaysIngredients).toContain('spinach');
  });

  it('preserves safe defaults when the snapshot fetch errors', async () => {
    mockGetAffinitySnapshot.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useFoodIntelUserState(), { wrapper: withClient(makeClient()) });

    await waitFor(() => {
      // Hook resolves into a stable identity; defaults remain.
      expect(result.current.goalPhase).toBe('maintain');
    });
    expect(result.current.topAffinityIngredients).toEqual([]);
    expect(result.current.rolling7dNutrientGaps).toEqual([]);
    expect(result.current.last7DaysIngredients).toEqual([]);
  });

  it('does not re-fetch the snapshot on re-render with the same userId', async () => {
    mockGetAffinitySnapshot.mockResolvedValue({
      data: {
        topAffinityIngredients: ['lentils'],
        rolling7dNutrientGaps: [],
        goalPhase: 'maintain',
        last7DaysIngredients: ['lentils'],
      },
    });

    const { result, rerender } = renderHook(() => useFoodIntelUserState(), { wrapper: withClient(makeClient()) });
    await waitFor(() => expect(result.current.topAffinityIngredients).toContain('lentils'));
    expect(mockGetAffinitySnapshot).toHaveBeenCalledTimes(1);

    rerender({});
    rerender({});
    expect(mockGetAffinitySnapshot).toHaveBeenCalledTimes(1);
  });
});
