// P5: useCookingJourney migrated to React Query.
//
// Verifies the migrated hook preserves the prior contract (stats, progress,
// loading, error, refresh, acceptLevelUp, seedJourney) AND benefits from
// React Query — multiple consumers under one client share a single fetch.

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetCookingStats = jest.fn();
const mockGetSkillProgress = jest.fn();
const mockAcceptSkillLevelUp = jest.fn();
const mockSeedCookingJourney = jest.fn();

jest.mock('../../lib/api', () => ({
  userApi: {
    getCookingStats: () => mockGetCookingStats(),
    getSkillProgress: () => mockGetSkillProgress(),
    acceptSkillLevelUp: (level: string) => mockAcceptSkillLevelUp(level),
    seedCookingJourney: (data: unknown) => mockSeedCookingJourney(data),
  },
}));

import { useCookingJourney } from '../../hooks/useCookingJourney';

const STATS = {
  recipesCookedThisMonth: 12,
  recipesCookedAllTime: 47,
  cuisinesExplored: ['Italian', 'Thai'],
  cuisinesExploredThisMonth: ['Thai'],
  averageDifficulty: 2,
  averageDifficultyLabel: 'medium',
  difficultyTrend: 'leveling_up',
  longestStreakDays: 5,
  currentStreakDays: 2,
  firstCookedCuisines: [],
  seededCuisines: [],
};

const PROGRESS = {
  currentLevel: 'home_cook',
  effectiveLevel: 'home_cook',
  readyToLevelUp: false,
  nextLevel: 'confident',
  reason: 'keep cooking',
  easyRecipesCookedWithGoodRating: 8,
  mediumRecipesCooked: 4,
};

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

describe('useCookingJourney (P5)', () => {
  beforeEach(() => {
    mockGetCookingStats.mockReset();
    mockGetSkillProgress.mockReset();
    mockAcceptSkillLevelUp.mockReset();
    mockSeedCookingJourney.mockReset();
  });

  it('fetches stats + progress in parallel and exposes them', async () => {
    mockGetCookingStats.mockResolvedValue({ data: STATS });
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    const { result } = renderHook(() => useCookingJourney(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual(STATS);
    expect(result.current.progress).toEqual(PROGRESS);
    expect(result.current.error).toBeNull();
    expect(mockGetCookingStats).toHaveBeenCalledTimes(1);
    expect(mockGetSkillProgress).toHaveBeenCalledTimes(1);
  });

  it('exposes a string error message when either endpoint fails', async () => {
    mockGetCookingStats.mockRejectedValue(new Error('stats down'));
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    const { result } = renderHook(() => useCookingJourney(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.error).toBe('string');
    expect(result.current.error).toMatch(/stats down/);
  });

  it('refresh re-fetches both endpoints', async () => {
    mockGetCookingStats.mockResolvedValue({ data: STATS });
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    const { result } = renderHook(() => useCookingJourney(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGetCookingStats).toHaveBeenCalledTimes(2);
    expect(mockGetSkillProgress).toHaveBeenCalledTimes(2);
  });

  it('acceptLevelUp posts then invalidates so the next fetch reloads', async () => {
    mockGetCookingStats.mockResolvedValue({ data: STATS });
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    mockAcceptSkillLevelUp.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCookingJourney(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.acceptLevelUp('confident');
    });
    expect(mockAcceptSkillLevelUp).toHaveBeenCalledWith('confident');
    expect(mockGetCookingStats).toHaveBeenCalledTimes(2);
    expect(mockGetSkillProgress).toHaveBeenCalledTimes(2);
  });

  it('seedJourney posts then invalidates so the next fetch reloads', async () => {
    mockGetCookingStats.mockResolvedValue({ data: STATS });
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    mockSeedCookingJourney.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCookingJourney(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const seed = { seededCuisines: ['Thai'], cookingSkillLevel: 'home_cook' as const };
    await act(async () => {
      await result.current.seedJourney(seed);
    });
    expect(mockSeedCookingJourney).toHaveBeenCalledWith(seed);
    expect(mockGetCookingStats).toHaveBeenCalledTimes(2);
    expect(mockGetSkillProgress).toHaveBeenCalledTimes(2);
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetCookingStats.mockResolvedValue({ data: STATS });
    mockGetSkillProgress.mockResolvedValue({ data: PROGRESS });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useCookingJourney(), { wrapper });
    const b = renderHook(() => useCookingJourney(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockGetCookingStats).toHaveBeenCalledTimes(1);
    expect(mockGetSkillProgress).toHaveBeenCalledTimes(1);
  });
});
