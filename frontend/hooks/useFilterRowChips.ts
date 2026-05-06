// frontend/hooks/useFilterRowChips.ts
// ROADMAP 4.0 R11 — shared FilterRow chip wiring.
//
// Both Home (index.tsx) and Kitchen (cookbook.tsx) host a FilterRow with the
// same chip set. The chip-id ↔ filter-state glue used to live inline in each
// screen (~60 lines duplicated). This hook centralizes the mapping for the
// Home/main filter shape (`FilterState` + `useQuickMacroFilters` + meal-prep
// mode + dietary tags). Kitchen has a different filter shape and uses
// `useCookbookFilterRowChips` (sibling hook below).

import { useMemo, useCallback } from 'react';
import type { FilterState } from '../lib/filterStorage';

interface QuickMacroFilters {
  highProtein: boolean;
  lowCarb: boolean;
  lowCalorie: boolean;
}

interface UseHomeFilterRowChipsArgs {
  filters: FilterState;
  quickMacroFilters: QuickMacroFilters;
  mealPrepMode: boolean;
  handleQuickFilter: (
    type: keyof FilterState,
    value: string | number | null | string[],
  ) => void;
  handleQuickMacroFilter: (filterKey: keyof QuickMacroFilters) => void;
  handleToggleMealPrepMode: (enabled: boolean) => void;
}

interface UseFilterRowChipsResult {
  activeChipIds: string[];
  onChipToggle: (chipId: string) => void;
}

const DIETARY_TAG_BY_CHIP_ID: Record<string, string> = {
  budget: 'Budget-Friendly',
  one_pot: 'One-Pot',
  high_fiber: 'High-Fiber',
};

export function useHomeFilterRowChips(
  args: UseHomeFilterRowChipsArgs,
): UseFilterRowChipsResult {
  const {
    filters,
    quickMacroFilters,
    mealPrepMode,
    handleQuickFilter,
    handleQuickMacroFilter,
    handleToggleMealPrepMode,
  } = args;

  const activeChipIds = useMemo(() => {
    const ids: string[] = [];
    if (filters.maxCookTime === 30) ids.push('quick');
    if (filters.difficulty.includes('Easy')) ids.push('easy');
    if (quickMacroFilters.highProtein) ids.push('high_protein');
    if (quickMacroFilters.lowCarb) ids.push('low_carb');
    if (quickMacroFilters.lowCalorie) ids.push('low_cal');
    if (mealPrepMode) ids.push('meal_prep');
    for (const [chipId, tag] of Object.entries(DIETARY_TAG_BY_CHIP_ID)) {
      if (filters.dietaryRestrictions.includes(tag)) ids.push(chipId);
    }
    return ids;
  }, [
    filters.maxCookTime,
    filters.difficulty,
    filters.dietaryRestrictions,
    quickMacroFilters.highProtein,
    quickMacroFilters.lowCarb,
    quickMacroFilters.lowCalorie,
    mealPrepMode,
  ]);

  // ROADMAP 4.0 FX2.2 — drop closure-based array pre-computation for `easy`
  // and dietary chips; pass the string form so handleQuickFilter's ref-aware
  // toggle path computes against the latest snapshot. Two rapid taps on
  // different chips no longer race.
  const onChipToggle = useCallback(
    (chipId: string) => {
      switch (chipId) {
        case 'quick':
          handleQuickFilter('maxCookTime', filters.maxCookTime === 30 ? null : 30);
          return;
        case 'easy':
          handleQuickFilter('difficulty', 'Easy');
          return;
        case 'high_protein':
          handleQuickMacroFilter('highProtein');
          return;
        case 'low_carb':
          handleQuickMacroFilter('lowCarb');
          return;
        case 'low_cal':
          handleQuickMacroFilter('lowCalorie');
          return;
        case 'meal_prep':
          handleToggleMealPrepMode(!mealPrepMode);
          return;
      }
      const tag = DIETARY_TAG_BY_CHIP_ID[chipId];
      if (tag) {
        handleQuickFilter('dietaryRestrictions', tag);
      }
    },
    [
      filters.maxCookTime,
      mealPrepMode,
      handleQuickFilter,
      handleQuickMacroFilter,
      handleToggleMealPrepMode,
    ],
  );

  return { activeChipIds, onChipToggle };
}

// ─── Kitchen (cookbook) variant ────────────────────────────────────────────

interface CookbookFilterShape {
  maxCookTime: number | null;
  difficulty: Array<'Easy' | 'Medium' | 'Hard'>;
  mealPrepOnly: boolean;
  highProtein: boolean;
  lowCal: boolean;
  budget: boolean;
  onePot: boolean;
}

interface UseCookbookFilterRowChipsArgs {
  filters: CookbookFilterShape;
  setFilters: (updater: (prev: CookbookFilterShape) => CookbookFilterShape) => void;
}

export function useCookbookFilterRowChips(
  args: UseCookbookFilterRowChipsArgs,
): UseFilterRowChipsResult {
  const { filters, setFilters } = args;

  const activeChipIds = useMemo(() => {
    const ids: string[] = [];
    if (filters.maxCookTime !== null) ids.push('quick');
    if (filters.difficulty.includes('Easy')) ids.push('easy');
    if (filters.highProtein) ids.push('high_protein');
    if (filters.lowCal) ids.push('low_cal');
    if (filters.mealPrepOnly) ids.push('meal_prep');
    if (filters.budget) ids.push('budget');
    if (filters.onePot) ids.push('one_pot');
    return ids;
  }, [filters]);

  const onChipToggle = useCallback(
    (chipId: string) => {
      setFilters((prev) => {
        switch (chipId) {
          case 'quick':
            return { ...prev, maxCookTime: prev.maxCookTime === null ? 30 : null };
          case 'easy': {
            const isActive = prev.difficulty.includes('Easy');
            return {
              ...prev,
              difficulty: isActive
                ? prev.difficulty.filter((d) => d !== 'Easy')
                : [...prev.difficulty, 'Easy'],
            };
          }
          case 'high_protein':
            return { ...prev, highProtein: !prev.highProtein };
          case 'low_cal':
            return { ...prev, lowCal: !prev.lowCal };
          case 'meal_prep':
            return { ...prev, mealPrepOnly: !prev.mealPrepOnly };
          case 'budget':
            return { ...prev, budget: !prev.budget };
          case 'one_pot':
            return { ...prev, onePot: !prev.onePot };
          default:
            return prev;
        }
      });
    },
    [setFilters],
  );

  return { activeChipIds, onChipToggle };
}
