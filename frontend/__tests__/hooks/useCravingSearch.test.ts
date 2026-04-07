// frontend/__tests__/hooks/useCravingSearch.test.ts
// Tests for craving search integration in useRecipeSearch

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('../../lib/api', () => ({
  searchApi: {
    cravingSearch: jest.fn(),
  },
  recipeApi: {
    getSuggestedRecipes: jest.fn(),
  },
}));

jest.mock('../../utils/recipeUtils', () => ({
  deduplicateRecipes: jest.fn((recipes: any[]) => recipes),
  initializeFeedbackState: jest.fn((recipes: any[]) =>
    Object.fromEntries(recipes.map((r: any) => [r.id, { liked: false, disliked: false }])),
  ),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { searchApi } from '../../lib/api';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockCravingSearch = searchApi.cravingSearch as jest.Mock;

const baseOptions = {
  filtersLoaded: true,
  filters: {
    cuisines: [],
    dietaryRestrictions: [],
    maxCookTime: null,
    difficulty: [],
  } as any,
  mealPrepMode: false,
  recipesPerPage: 20,
  fetchRecipes: jest.fn().mockResolvedValue(null),
  applyFetchResult: jest.fn(),
  showToast: jest.fn(),
  setLoadingFromFilters: jest.fn(),
  resetPage: jest.fn(),
};

describe('useRecipeSearch — craving param handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it('starts with isCravingSearch = false', () => {
    const { result } = renderHook(() => useRecipeSearch(baseOptions));
    expect(result.current.isCravingSearch).toBe(false);
    expect(result.current.searchQuery).toBe('');
  });

  it('runs craving search when craving param is present', async () => {
    const mockRecipes = [
      { id: '1', title: 'Mac and Cheese' },
      { id: '2', title: 'Cheese Fondue' },
    ];
    mockCravingSearch.mockResolvedValue({
      data: { recipes: mockRecipes, query: 'cheesy', searchTerms: ['cheese'], totalMatches: 2 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'cheesy' });

    const options = { ...baseOptions };
    renderHook(() => useRecipeSearch(options));

    await waitFor(() => {
      expect(mockCravingSearch).toHaveBeenCalledWith('cheesy', {
        cuisines: undefined,
        dietaryRestrictions: undefined,
        maxCookTime: undefined,
        difficulty: undefined,
        mealPrepMode: false,
      });
    });

    expect(options.applyFetchResult).toHaveBeenCalledWith(
      expect.objectContaining({
        recipes: mockRecipes,
        total: 2,
      }),
    );
  });

  it('sets isCravingSearch = true when craving param fires', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [], query: 'spicy', searchTerms: [], totalMatches: 0 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'spicy noodles' });

    const { result } = renderHook(() => useRecipeSearch(baseOptions));

    await waitFor(() => {
      expect(result.current.isCravingSearch).toBe(true);
      expect(result.current.cravingQuery).toBe('spicy noodles');
    });
  });

  it('shows success toast when craving results found', async () => {
    mockCravingSearch.mockResolvedValue({
      data: {
        recipes: [{ id: '1', title: 'Ramen' }],
        query: 'noodles',
        searchTerms: ['noodle'],
        totalMatches: 1,
      },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'noodles' });

    const options = { ...baseOptions, showToast: jest.fn() };
    renderHook(() => useRecipeSearch(options));

    await waitFor(() => {
      expect(options.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Found'),
        'success',
        2000,
      );
    });
  });

  it('shows error toast when craving search fails', async () => {
    mockCravingSearch.mockRejectedValue(new Error('network error'));
    mockUseLocalSearchParams.mockReturnValue({ craving: 'something warm' });

    const options = { ...baseOptions, showToast: jest.fn() };
    renderHook(() => useRecipeSearch(options));

    await waitFor(() => {
      expect(options.showToast).toHaveBeenCalledWith('❌ Craving search failed', 'error');
    });
  });

  it('clearSearch resets isCravingSearch and cravingQuery', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [], query: 'warm', searchTerms: [], totalMatches: 0 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'warm and cozy' });

    const { result } = renderHook(() => useRecipeSearch(baseOptions));

    await waitFor(() => {
      expect(result.current.isCravingSearch).toBe(true);
      expect(result.current.cravingQuery).toBe('warm and cozy');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.isCravingSearch).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.cravingQuery).toBe('');
  });

  it('cravingQuery is set but searchQuery stays empty (prevents useInitialRecipeLoad from firing)', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [{ id: '1', title: 'Crispy Chicken' }], query: 'Crunchy', searchTerms: ['crispy'], totalMatches: 1 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'Crunchy' });

    const { result } = renderHook(() => useRecipeSearch(baseOptions));

    await waitFor(() => {
      expect(result.current.cravingQuery).toBe('Crunchy');
    });

    // searchQuery must stay empty so useInitialRecipeLoad doesn't re-fire with 'Crunchy'
    expect(result.current.searchQuery).toBe('');
  });
});

describe('useRecipeSearch — craving regression tests (10D-ii)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it('no infinite loop: craving search fires exactly once per unique query+filter combination', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [{ id: '1', title: 'Mac and Cheese' }], query: 'cheesy', searchTerms: ['cheese'], totalMatches: 1 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'cheesy' });

    const applyFetchResult = jest.fn();
    renderHook(() => useRecipeSearch({ ...baseOptions, applyFetchResult }));

    await waitFor(() => {
      expect(mockCravingSearch).toHaveBeenCalledTimes(1);
    });

    // applyFetchResult being called should NOT trigger a second cravingSearch call
    expect(mockCravingSearch).toHaveBeenCalledTimes(1);
  });

  it('filter badge count: isCravingSearch=true should be tracked separately from searchQuery', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [], query: 'spicy', searchTerms: ['spicy'], totalMatches: 0 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'spicy noodles' });

    const { result } = renderHook(() => useRecipeSearch(baseOptions));

    await waitFor(() => {
      expect(result.current.isCravingSearch).toBe(true);
    });

    // isCravingSearch is true, searchQuery is empty (home screen adds +1 for craving badge)
    expect(result.current.searchQuery).toBe('');
    expect(result.current.isCravingSearch).toBe(true);
  });

  it('changing filters triggers a fresh craving search (dedup key includes filters)', async () => {
    const cravingData = { recipes: [], query: 'cheesy', searchTerms: ['cheese'], totalMatches: 0 };
    mockCravingSearch.mockResolvedValue({ data: cravingData });

    mockUseLocalSearchParams.mockReturnValue({ craving: 'cheesy' });
    const options1 = { ...baseOptions, filters: { cuisines: [], dietaryRestrictions: [], maxCookTime: null, difficulty: [] } as any };
    const { rerender } = renderHook((opts) => useRecipeSearch(opts), { initialProps: options1 });

    await waitFor(() => expect(mockCravingSearch).toHaveBeenCalledTimes(1));

    // Change filters — dedup key should differ, triggering a re-run
    mockUseLocalSearchParams.mockReturnValue({ craving: 'cheesy' });
    const options2 = { ...baseOptions, filters: { cuisines: ['Mexican'], dietaryRestrictions: [], maxCookTime: null, difficulty: [] } as any };
    rerender(options2);

    await waitFor(() => expect(mockCravingSearch).toHaveBeenCalledTimes(2));
  });

  it('clearSearch resets all craving state and dedup refs', async () => {
    mockCravingSearch.mockResolvedValue({
      data: { recipes: [], query: 'warm', searchTerms: [], totalMatches: 0 },
    });
    mockUseLocalSearchParams.mockReturnValue({ craving: 'warm and cozy' });

    const { result } = renderHook(() => useRecipeSearch(baseOptions));

    await waitFor(() => {
      expect(result.current.isCravingSearch).toBe(true);
      expect(result.current.cravingQuery).toBe('warm and cozy');
    });

    act(() => { result.current.clearSearch(); });

    expect(result.current.isCravingSearch).toBe(false);
    expect(result.current.cravingQuery).toBe('');
    expect(result.current.searchQuery).toBe('');
  });
});
