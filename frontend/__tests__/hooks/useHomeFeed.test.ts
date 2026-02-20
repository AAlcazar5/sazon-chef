// frontend/__tests__/hooks/useHomeFeed.test.ts

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getHomeFeed: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeFeed } from '../../hooks/useHomeFeed';
import { recipeApi } from '../../lib/api';

const mockGetHomeFeed = recipeApi.getHomeFeed as jest.Mock;

const makeFeedResponse = (overrides: Record<string, any> = {}) => ({
  data: {
    recipeOfTheDay: { id: 'rotd-1', title: 'Recipe of the Day' },
    suggestedRecipes: [
      { id: 's1', title: 'Suggested 1' },
      { id: 's2', title: 'Suggested 2' },
    ],
    quickMeals: [{ id: 'qm1', title: 'Quick Meal 1' }],
    perfectMatches: [{ id: 'pm1', title: 'Perfect Match 1' }],
    likedRecipes: [{ id: 'lr1', title: 'Liked Recipe 1' }],
    popularSearches: [{ query: 'chicken', count: 42 }],
    pagination: {
      page: 0,
      limit: 20,
      total: 50,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    },
    ...overrides,
  },
});

describe('useHomeFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty data and loading true', () => {
    mockGetHomeFeed.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useHomeFeed());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.suggestedRecipes).toEqual([]);
    expect(result.current.quickMeals).toEqual([]);
    expect(result.current.perfectMatches).toEqual([]);
    expect(result.current.likedRecipes).toEqual([]);
    expect(result.current.popularSearches).toEqual([]);
    expect(result.current.recipeOfTheDay).toBeNull();
    expect(result.current.pagination).toBeNull();
  });

  it('should fetch and populate all sections on mount', async () => {
    mockGetHomeFeed.mockResolvedValueOnce(makeFeedResponse());

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.suggestedRecipes).toHaveLength(2);
    expect(result.current.quickMeals).toHaveLength(1);
    expect(result.current.perfectMatches).toHaveLength(1);
    expect(result.current.likedRecipes).toHaveLength(1);
    expect(result.current.popularSearches).toHaveLength(1);
    expect(result.current.recipeOfTheDay).toEqual(
      expect.objectContaining({ title: 'Recipe of the Day' })
    );
    expect(result.current.pagination).toEqual(
      expect.objectContaining({ total: 50, hasNextPage: true })
    );
  });

  it('should set error on API failure', async () => {
    mockGetHomeFeed.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.suggestedRecipes).toEqual([]);
  });

  it('should set generic error message when error has no message', async () => {
    mockGetHomeFeed.mockRejectedValueOnce({});

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch home feed');
  });

  it('should pass params to API call', async () => {
    mockGetHomeFeed.mockResolvedValueOnce(makeFeedResponse());

    const params = {
      page: 1,
      limit: 10,
      cuisines: ['Italian', 'Mexican'],
      mealPrepMode: true,
      search: 'chicken',
    };

    renderHook(() => useHomeFeed(params));

    await waitFor(() => expect(mockGetHomeFeed).toHaveBeenCalled());

    expect(mockGetHomeFeed).toHaveBeenCalledWith(params);
  });

  it('should refetch when refetch is called', async () => {
    mockGetHomeFeed.mockResolvedValueOnce(makeFeedResponse());

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetHomeFeed).toHaveBeenCalledTimes(1);

    // Refetch
    mockGetHomeFeed.mockResolvedValueOnce(
      makeFeedResponse({
        suggestedRecipes: [{ id: 'new1', title: 'New Recipe' }],
      })
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetHomeFeed).toHaveBeenCalledTimes(2);
    expect(result.current.suggestedRecipes).toHaveLength(1);
    expect(result.current.suggestedRecipes[0].title).toBe('New Recipe');
  });

  it('should accept override params in refetch', async () => {
    mockGetHomeFeed.mockResolvedValue(makeFeedResponse());

    const { result } = renderHook(() => useHomeFeed({ page: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const overrideParams = { page: 2, limit: 5 };
    await act(async () => {
      await result.current.refetch(overrideParams);
    });

    // Second call should use override params
    expect(mockGetHomeFeed).toHaveBeenLastCalledWith(overrideParams);
  });

  it('should return feedData from refetch on success', async () => {
    mockGetHomeFeed.mockResolvedValue(makeFeedResponse());

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refetchResult: any;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult).not.toBeNull();
    expect(refetchResult.suggestedRecipes).toHaveLength(2);
  });

  it('should return null from refetch on error', async () => {
    mockGetHomeFeed
      .mockResolvedValueOnce(makeFeedResponse())
      .mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refetchResult: any;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult).toBeNull();
  });

  it('should handle missing fields in response gracefully', async () => {
    mockGetHomeFeed.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recipeOfTheDay).toBeNull();
    expect(result.current.suggestedRecipes).toEqual([]);
    expect(result.current.quickMeals).toEqual([]);
    expect(result.current.perfectMatches).toEqual([]);
    expect(result.current.likedRecipes).toEqual([]);
    expect(result.current.popularSearches).toEqual([]);
    expect(result.current.pagination).toBeNull();
  });

  it('should not double-fetch on mount', async () => {
    mockGetHomeFeed.mockResolvedValue(makeFeedResponse());

    renderHook(() => useHomeFeed());

    await waitFor(() => expect(mockGetHomeFeed).toHaveBeenCalled());

    // Even with re-renders, should only fetch once
    expect(mockGetHomeFeed).toHaveBeenCalledTimes(1);
  });

  it('should clear error on successful refetch', async () => {
    mockGetHomeFeed.mockRejectedValueOnce(new Error('first fail'));

    const { result } = renderHook(() => useHomeFeed());

    await waitFor(() => expect(result.current.error).toBe('first fail'));

    mockGetHomeFeed.mockResolvedValueOnce(makeFeedResponse());

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.suggestedRecipes).toHaveLength(2);
  });
});
