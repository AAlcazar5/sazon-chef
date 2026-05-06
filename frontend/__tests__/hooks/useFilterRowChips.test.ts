// frontend/__tests__/hooks/useFilterRowChips.test.ts

import { renderHook, act } from '@testing-library/react-native';
import {
  useHomeFilterRowChips,
  useCookbookFilterRowChips,
} from '../../hooks/useFilterRowChips';

// Minimal FilterState fixture; cast through unknown so the test file doesn't
// need to import the entire FilterState shape.
const baseHomeFilters = {
  maxCookTime: null as number | null,
  difficulty: [] as string[],
  dietaryRestrictions: [] as string[],
} as unknown as Parameters<typeof import('../../hooks/useFilterRowChips').useHomeFilterRowChips>[0]['filters'];

describe('useHomeFilterRowChips', () => {
  it('reflects active filters in activeChipIds', () => {
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: {
          ...baseHomeFilters,
          maxCookTime: 30,
          difficulty: ['Easy'],
          dietaryRestrictions: ['Budget-Friendly', 'High-Fiber'],
        },
        quickMacroFilters: { highProtein: true, lowCarb: false, lowCalorie: false },
        mealPrepMode: true,
        handleQuickFilter: jest.fn(),
        handleQuickMacroFilter: jest.fn(),
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    expect(result.current.activeChipIds).toEqual(
      expect.arrayContaining(['quick', 'easy', 'high_protein', 'meal_prep', 'budget', 'high_fiber']),
    );
  });

  it('routes quick chip to handleQuickFilter(maxCookTime)', () => {
    const handleQuickFilter = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter,
        handleQuickMacroFilter: jest.fn(),
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    act(() => result.current.onChipToggle('quick'));
    expect(handleQuickFilter).toHaveBeenCalledWith('maxCookTime', 30);
  });

  it('routes high_protein chip to handleQuickMacroFilter', () => {
    const handleQuickMacroFilter = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter: jest.fn(),
        handleQuickMacroFilter,
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    act(() => result.current.onChipToggle('high_protein'));
    expect(handleQuickMacroFilter).toHaveBeenCalledWith('highProtein');
  });

  it('routes meal_prep chip to handleToggleMealPrepMode with the flipped value', () => {
    const handleToggleMealPrepMode = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter: jest.fn(),
        handleQuickMacroFilter: jest.fn(),
        handleToggleMealPrepMode,
      }),
    );
    act(() => result.current.onChipToggle('meal_prep'));
    expect(handleToggleMealPrepMode).toHaveBeenCalledWith(true);
  });

  it('routes dietary chips (budget/one_pot/high_fiber) to handleQuickFilter(dietaryRestrictions) in string form (FX2.2)', () => {
    const handleQuickFilter = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter,
        handleQuickMacroFilter: jest.fn(),
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    act(() => result.current.onChipToggle('budget'));
    // FX2.2 — pass string form so handleQuickFilter's ref-aware toggle path
    // computes against the latest snapshot instead of a stale closure.
    expect(handleQuickFilter).toHaveBeenCalledWith('dietaryRestrictions', 'Budget-Friendly');
  });

  it('routes the easy chip to handleQuickFilter(difficulty) in string form (FX2.2)', () => {
    const handleQuickFilter = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter,
        handleQuickMacroFilter: jest.fn(),
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    act(() => result.current.onChipToggle('easy'));
    expect(handleQuickFilter).toHaveBeenCalledWith('difficulty', 'Easy');
  });

  it('two synchronous chip taps both reach handleQuickFilter (FX2.2 race)', () => {
    const handleQuickFilter = jest.fn();
    const handleQuickMacroFilter = jest.fn();
    const { result } = renderHook(() =>
      useHomeFilterRowChips({
        filters: baseHomeFilters,
        quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
        mealPrepMode: false,
        handleQuickFilter,
        handleQuickMacroFilter,
        handleToggleMealPrepMode: jest.fn(),
      }),
    );
    act(() => {
      result.current.onChipToggle('easy');
      result.current.onChipToggle('high_protein');
    });
    expect(handleQuickFilter).toHaveBeenCalledWith('difficulty', 'Easy');
    expect(handleQuickMacroFilter).toHaveBeenCalledWith('highProtein');
  });
});

describe('useCookbookFilterRowChips', () => {
  const baseCookbookFilters = {
    maxCookTime: null as number | null,
    difficulty: [] as Array<'Easy' | 'Medium' | 'Hard'>,
    mealPrepOnly: false,
    highProtein: false,
    lowCal: false,
    budget: false,
    onePot: false,
  };

  it('reflects active cookbook filter state in activeChipIds', () => {
    const { result } = renderHook(() =>
      useCookbookFilterRowChips({
        filters: { ...baseCookbookFilters, maxCookTime: 30, highProtein: true, budget: true },
        setFilters: jest.fn(),
      }),
    );
    expect(result.current.activeChipIds).toEqual(
      expect.arrayContaining(['quick', 'high_protein', 'budget']),
    );
    expect(result.current.activeChipIds).not.toContain('one_pot');
  });

  it('toggles cookbook filter via setFilters', () => {
    let captured = baseCookbookFilters;
    const setFilters = jest.fn((updater: any) => {
      captured = updater(captured);
    });
    const { result } = renderHook(() =>
      useCookbookFilterRowChips({ filters: captured, setFilters }),
    );
    act(() => result.current.onChipToggle('high_protein'));
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(captured.highProtein).toBe(true);
  });

  it('toggles meal_prep cookbook chip', () => {
    let captured = baseCookbookFilters;
    const setFilters = jest.fn((updater: any) => {
      captured = updater(captured);
    });
    const { result } = renderHook(() =>
      useCookbookFilterRowChips({ filters: captured, setFilters }),
    );
    act(() => result.current.onChipToggle('meal_prep'));
    expect(captured.mealPrepOnly).toBe(true);
  });
});
