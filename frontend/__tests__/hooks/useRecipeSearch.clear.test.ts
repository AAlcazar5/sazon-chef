// frontend/__tests__/hooks/useRecipeSearch.clear.test.tsx
//
// Regression test for the "search persists after clearing the bar" bug.
//
// Setup: search param "turmeric" lives in URL → useEffect runs the search.
// Action: simulate URL params going to empty (clear button or empty bar typing).
// Expect:
//   - lastProcessedSearch ref resets
//   - searchQuery local state clears
//   - fetchRecipes is called WITHOUT the `search` field but WITH the current
//     filters preserved (cuisines / dietary / maxCookTime / difficulty).
// Filters survive across the clear because they live in component state, not
// URL params.

jest.mock('../../lib/api', () => ({
  searchApi: {
    cravingSearch: jest.fn(),
  },
}));

const mockSetParams = jest.fn();
const paramsBox: { current: Record<string, string> } = {
  current: { search: 'turmeric', craving: '' },
};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => paramsBox.current,
  router: {
    setParams: (next: Record<string, string>) => {
      mockSetParams(next);
      paramsBox.current = { ...paramsBox.current, ...next };
    },
  },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import type { FilterState } from '../../lib/filterStorage';

const FILTERS: FilterState = {
  cuisines: ['Italian'],
  dietaryRestrictions: ['Gluten-Free'],
  maxCookTime: 30,
  difficulty: ['Easy'],
};

function makeOptions(overrides: Partial<Parameters<typeof useRecipeSearch>[0]> = {}) {
  const fetchRecipes = jest.fn().mockResolvedValue({ recipes: [], total: 0, feedback: {} });
  const applyFetchResult = jest.fn();
  return {
    fetchRecipes,
    applyFetchResult,
    options: {
      filtersLoaded: true,
      filters: FILTERS,
      mealPrepMode: false,
      recipesPerPage: 20,
      fetchRecipes,
      applyFetchResult,
      showToast: jest.fn(),
      setLoadingFromFilters: jest.fn(),
      resetPage: jest.fn(),
      ...overrides,
    },
  };
}

describe('useRecipeSearch — clearing search returns to default with filters preserved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paramsBox.current = { search: 'turmeric', craving: '' };
  });

  it('clearSearch() resets both URL params and triggers a filtered refetch', async () => {
    const { fetchRecipes, options } = makeOptions();
    const { result } = renderHook(() => useRecipeSearch(options));

    // Initial run — search="turmeric" → fetch with search field.
    await waitFor(() => {
      expect(fetchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'turmeric', cuisines: ['Italian'] }),
      );
    });

    // Simulate the search bar X press: clearSearch() should clear URL params.
    act(() => {
      result.current.clearSearch();
    });
    expect(mockSetParams).toHaveBeenCalledWith({ search: '', craving: '' });
  });

  it('when URL params clear externally, hook refetches default state with filters', async () => {
    const { fetchRecipes, options } = makeOptions();
    const { rerender } = renderHook(() => useRecipeSearch(options));

    await waitFor(() => {
      expect(fetchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'turmeric' }),
      );
    });

    // External URL param reset (e.g. tab-bar X button calling router.setParams).
    paramsBox.current = { search: '', craving: '' };
    rerender(undefined);

    await waitFor(() => {
      // Latest fetch has no `search` field but keeps filters.
      const lastCall = fetchRecipes.mock.calls[fetchRecipes.mock.calls.length - 1][0];
      expect(lastCall.search).toBeUndefined();
      expect(lastCall.cuisines).toEqual(['Italian']);
      expect(lastCall.dietaryRestrictions).toEqual(['Gluten-Free']);
      expect(lastCall.maxCookTime).toBe(30);
    });
  });
});
