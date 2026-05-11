// frontend/hooks/useTodayPlateContext.ts
// ROADMAP 4.0 BAP1.1 — Resolves which plate framing Today should show.
//
// Pre-BAP1.1: three separate cards (PantryPlateHeroCard, StretchHomeCard,
// PlateOfWeekCard) each gated on their own data signal, sometimes all three
// stacking on the same visit. Noisy + redundant — the hero space deserves
// the ONE most contextually-relevant plate framing.
//
// Priority resolution (highest signal wins):
//   1. Leftover continuity: ≥2 carry-over components in inventory →
//      "stretch last night's plate" framing. Yesterday's cook directly
//      seeds tonight's composition — most personally-relevant signal.
//   2. Pantry plate: pantryCoveragePercent ≥ 60 → "tonight's plate is in
//      your pantry" framing. Strong but generic-to-the-user signal.
//   3. Plate of the week: editorial fallback for cold-start users with
//      no leftovers + thin pantry. Curated, not personalized.
//   4. Cold start: none of the above resolved → render an empty-state
//      "start your first plate" framing inside the hero.
//
// Telemetry note: this hook intentionally does NOT log resolution to a
// recommender event log (that's WK13's unified event-table job). The
// resolution is purely a render decision, not a recommendation.

import { useMemo } from 'react';
import type { LeftoverInventoryItem, PermutationCandidate } from '../lib/api';
import { useLeftoverInventory } from './useLeftoverInventory';
import { useTonightsPlate } from './useTonightsPlate';
import { usePlateOfTheWeek } from './usePlateOfTheWeek';

export type TodayPlateVariant =
  | 'leftover' // ≥2 leftover components — stretch yesterday's plate
  | 'pantry' // pantryCoverage ≥ 60% — tonight is already in your pantry
  | 'plateOfWeek' // editorial fallback — curated plate of the week
  | 'coldStart'; // none of the above — cold-start prompt

export interface TodayPlateOfWeek {
  id: string;
  title: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string;
}

export interface TodayPlateContext {
  variant: TodayPlateVariant;
  /** Hydrated when variant === 'leftover'. ≥2 items by construction. */
  leftovers: LeftoverInventoryItem[];
  /** Hydrated when variant === 'pantry'. PantryCoveragePercent ≥ 60. */
  pantryPlate: PermutationCandidate | null;
  /** Hydrated when variant === 'plateOfWeek'. */
  weekPlate: TodayPlateOfWeek | null;
  /** True while any of the three signals is still in flight. */
  isLoading: boolean;
}

const LEFTOVER_MIN_COMPONENTS = 2;
const PANTRY_COVERAGE_MIN_PERCENT = 60;

/**
 * Pure resolver — exported for tests so the priority logic can be exercised
 * without mounting the hook's data sources. Identical inputs produce
 * identical outputs.
 */
export function resolveTodayPlateVariant(input: {
  leftoverCount: number;
  pantryCoveragePercent: number | null;
  hasWeekPlate: boolean;
}): TodayPlateVariant {
  if (input.leftoverCount >= LEFTOVER_MIN_COMPONENTS) return 'leftover';
  if (
    input.pantryCoveragePercent != null &&
    input.pantryCoveragePercent >= PANTRY_COVERAGE_MIN_PERCENT
  ) {
    return 'pantry';
  }
  if (input.hasWeekPlate) return 'plateOfWeek';
  return 'coldStart';
}

export function useTodayPlateContext(): TodayPlateContext {
  const leftoversQuery = useLeftoverInventory();
  const pantryQuery = useTonightsPlate();
  const weekQuery = usePlateOfTheWeek();

  return useMemo(() => {
    const leftoverCount = leftoversQuery.leftovers?.length ?? 0;
    const pantryCoveragePercent = pantryQuery.plate?.pantryCoveragePercent ?? null;
    const hasWeekPlate = Boolean(weekQuery.plate);

    const variant = resolveTodayPlateVariant({
      leftoverCount,
      pantryCoveragePercent,
      hasWeekPlate,
    });

    return {
      variant,
      leftovers: variant === 'leftover' ? leftoversQuery.leftovers : [],
      pantryPlate: variant === 'pantry' ? pantryQuery.plate : null,
      weekPlate:
        variant === 'plateOfWeek' && weekQuery.plate
          ? {
              id: weekQuery.plate.id,
              title: weekQuery.plate.title,
              totalCalories: weekQuery.plate.totalCalories,
              totalProtein: weekQuery.plate.totalProtein,
              totalCarbs: weekQuery.plate.totalCarbs,
              totalFat: weekQuery.plate.totalFat,
              imageUrl: (weekQuery.plate as { imageUrl?: string }).imageUrl,
            }
          : null,
      isLoading:
        leftoversQuery.isLoading || pantryQuery.loading || weekQuery.isLoading,
    };
  }, [
    leftoversQuery.leftovers,
    leftoversQuery.isLoading,
    pantryQuery.plate,
    pantryQuery.loading,
    weekQuery.plate,
    weekQuery.isLoading,
  ]);
}
