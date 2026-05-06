// frontend/__tests__/hooks/useQuickMacroFilters.race.test.ts
// ROADMAP 4.0 FX2.3 — two synchronous macro-chip taps must both stick.
//
// Before the fix, handleQuickMacroFilter read `quickMacroFilters` from a
// useCallback closure: two synchronous taps both saw the same snapshot and
// the second setQuickMacroFilters clobbered the first. After the fix,
// handleQuickMacroFilter reads quickMacroFiltersRef.current and the setter
// updates the ref synchronously.

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: {
    buttonPress: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useQuickMacroFilters } from '../../hooks/useQuickMacroFilters';
import type { FilterState } from '../../lib/filterStorage';

const baseFilters: FilterState = {
  cuisines: [],
  dietaryRestrictions: [],
  maxCookTime: null,
  difficulty: [],
};

function harness() {
  return useQuickMacroFilters({
    filters: baseFilters,
    mealPrepMode: false,
    searchQuery: '',
    recipesPerPage: 10,
    timeAwareMode: false,
    fetchRecipes: jest.fn(async () => null),
    applyFetchResult: jest.fn(),
    setPaginationLoading: jest.fn(),
  });
}

describe('useQuickMacroFilters race (FX2.3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('two synchronous handleQuickMacroFilter calls both stick', async () => {
    const { result } = renderHook(() => harness());

    await act(async () => {
      const p1 = result.current.handleQuickMacroFilter('highProtein');
      const p2 = result.current.handleQuickMacroFilter('lowCarb');
      await Promise.all([p1, p2]);
    });

    expect(result.current.quickMacroFilters.highProtein).toBe(true);
    expect(result.current.quickMacroFilters.lowCarb).toBe(true);
    expect(result.current.quickMacroFilters.lowCalorie).toBe(false);
  });

  it('toggling a single filter twice synchronously cancels back to false', async () => {
    const { result } = renderHook(() => harness());

    await act(async () => {
      const p1 = result.current.handleQuickMacroFilter('highProtein');
      const p2 = result.current.handleQuickMacroFilter('highProtein');
      await Promise.all([p1, p2]);
    });

    // ON then OFF → false
    expect(result.current.quickMacroFilters.highProtein).toBe(false);
  });
});
