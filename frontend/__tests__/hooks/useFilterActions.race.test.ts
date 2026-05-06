// frontend/__tests__/hooks/useFilterActions.race.test.ts
// ROADMAP 4.0 FX2.1 — two synchronous chip taps must both stick.
//
// Before the fix, useFilterActions.handleQuickFilter read `filters` from a
// useCallback closure: two synchronous taps both saw the same snapshot and the
// second setFilters clobbered the first. After the fix, handleQuickFilter
// reads filtersRef.current and saveFilters reads from the ref too.

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
    if (f.dietaryRestrictions?.includes('High-Fiber')) labels.push('High-Fiber');
    return labels;
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRecipeFilters } from '../../hooks/useRecipeFilters';
import { useFilterActions } from '../../hooks/useFilterActions';
import { filterStorage } from '../../lib/filterStorage';

function useTestHarness() {
  const filterHook = useRecipeFilters();
  const actions = useFilterActions({
    filters: filterHook.filters,
    filtersRef: filterHook.filtersRef,
    setFilters: filterHook.setFilters,
    saveFilters: filterHook.saveFilters,
    updateActiveFilters: filterHook.updateActiveFilters,
    closeFilterModal: filterHook.closeFilterModal,
    resetFilters: filterHook.resetFilters,
    mealPrepMode: false,
    searchQuery: '',
    isCravingSearch: false,
    onRerunCravingSearch: () => undefined,
    recipesPerPage: 10,
    getMacroFilterParams: () => ({}),
    timeAwareMode: false,
    fetchRecipes: jest.fn(async () => null),
    applyFetchResult: jest.fn(),
    setPaginationLoading: jest.fn(),
  });
  return { filterHook, actions };
}

describe('useFilterActions race (FX2.1)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('two synchronous handleQuickFilter calls both stick', async () => {
    const { result } = renderHook(() => useTestHarness());

    await waitFor(() => expect(result.current.filterHook.filtersLoaded).toBe(true));

    await act(async () => {
      // Fire both synchronously without awaiting in between — the bug.
      const p1 = result.current.actions.handleQuickFilter('difficulty', 'Easy');
      const p2 = result.current.actions.handleQuickFilter('dietaryRestrictions', 'High-Fiber');
      await Promise.all([p1, p2]);
    });

    expect(result.current.filterHook.filters.difficulty).toContain('Easy');
    expect(result.current.filterHook.filters.dietaryRestrictions).toContain('High-Fiber');
  });

  it('saveFilters persists the latest ref snapshot, not a stale closure', async () => {
    const saveSpy = filterStorage.saveFilters as jest.Mock;
    const { result } = renderHook(() => useTestHarness());

    await waitFor(() => expect(result.current.filterHook.filtersLoaded).toBe(true));

    await act(async () => {
      const p1 = result.current.actions.handleQuickFilter('difficulty', 'Easy');
      const p2 = result.current.actions.handleQuickFilter('dietaryRestrictions', 'High-Fiber');
      await Promise.all([p1, p2]);
    });

    // The final persisted state must contain BOTH toggles.
    const lastCall = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(lastCall.difficulty).toContain('Easy');
    expect(lastCall.dietaryRestrictions).toContain('High-Fiber');
  });
});
