// frontend/__tests__/hooks/useHomeFilterController.test.ts
// ROADMAP 4.0 FX4.1 — unified controller fires exactly one fetch per change.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/filterStorage', () => ({
  filterStorage: {
    getDefaultFilters: jest.fn(() => ({
      cuisines: [],
      dietaryRestrictions: [],
      maxCookTime: null,
      difficulty: [],
    })),
    loadFilters: jest.fn(() => Promise.resolve(null)),
    saveFilters: jest.fn(() => Promise.resolve()),
    clearFilters: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../utils/filterUtils', () => ({
  getActiveFilterLabels: jest.fn((f: any) => {
    const labels: string[] = [];
    if (f.difficulty?.includes('Easy')) labels.push('Easy');
    if (f.cuisines?.length) labels.push(...f.cuisines);
    return labels;
  }),
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn() },
}));

jest.mock('../../hooks/useMealPrepMode', () => ({
  useMealPrepMode: () => {
    const React = require('react');
    const [mealPrepMode, setMealPrepMode] = React.useState(false);
    return { mealPrepMode, setMealPrepMode, toggleMealPrepMode: () => setMealPrepMode((v: boolean) => !v), isLoaded: true };
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeFilterController } from '../../hooks/useHomeFilterController';

function harness(fetchSpy = jest.fn(async () => ({ recipes: [], total: 0, feedback: {} }))) {
  return useHomeFilterController({
    searchQuery: '',
    isCravingSearch: false,
    onRerunCravingSearch: () => undefined,
    recipesPerPage: 10,
    timeAwareMode: false,
    fetchRecipes: fetchSpy,
    applyFetchResult: jest.fn(),
    setPaginationLoading: jest.fn(),
  });
}

describe('useHomeFilterController (FX4.1)', () => {
  it('exposes a single applyFilter API + state from all three hooks', async () => {
    const { result } = renderHook(() => harness());
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));

    expect(typeof result.current.applyFilter).toBe('function');
    expect(result.current.filters).toEqual(expect.objectContaining({ cuisines: [] }));
    expect(result.current.quickMacroFilters).toEqual({ highProtein: false, lowCarb: false, lowCalorie: false });
    expect(result.current.mealPrepMode).toBe(false);
  });

  it('applyFilter with one key fires exactly one fetch', async () => {
    const fetchSpy = jest.fn(async () => ({ recipes: [], total: 0, feedback: {} }));
    const { result } = renderHook(() => harness(fetchSpy));
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));
    fetchSpy.mockClear();

    await act(async () => {
      await result.current.applyFilter({ difficulty: ['Easy'] });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.filters.difficulty).toContain('Easy');
  });

  it('two synchronous applyFilter calls (different keys) both stick (FX2 ref-aware path)', async () => {
    const fetchSpy = jest.fn(async () => ({ recipes: [], total: 0, feedback: {} }));
    const { result } = renderHook(() => harness(fetchSpy));
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));
    fetchSpy.mockClear();

    await act(async () => {
      const p1 = result.current.applyFilter({ difficulty: ['Easy'] });
      const p2 = result.current.applyFilter({ cuisines: ['Italian'] });
      await Promise.all([p1, p2]);
    });

    expect(result.current.filters.difficulty).toContain('Easy');
    expect(result.current.filters.cuisines).toContain('Italian');
  });

  it('macro toggles flow through applyFilter', async () => {
    const { result } = renderHook(() => harness());
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));

    await act(async () => {
      await result.current.applyFilter({ highProtein: true });
    });
    expect(result.current.quickMacroFilters.highProtein).toBe(true);
  });

  it('mealPrepMode flows through applyFilter', async () => {
    const { result } = renderHook(() => harness());
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));

    await act(async () => {
      await result.current.applyFilter({ mealPrepMode: true });
    });
    expect(result.current.mealPrepMode).toBe(true);
  });

  it('applyFilter with a value matching current state is a no-op (no fetch)', async () => {
    const fetchSpy = jest.fn(async () => ({ recipes: [], total: 0, feedback: {} }));
    const { result } = renderHook(() => harness(fetchSpy));
    await waitFor(() => expect(result.current.filtersLoaded).toBe(true));
    fetchSpy.mockClear();

    await act(async () => {
      await result.current.applyFilter({ highProtein: false }); // already false
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
