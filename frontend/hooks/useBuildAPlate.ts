// frontend/hooks/useBuildAPlate.ts
// Group 10X Phase 1 — composer state: selections per slot, locks, pantry-only mode, derived totals.
// Group 10X Phase 5 — extended with per-slot portion multipliers and macro-fit application.

import { useCallback, useMemo, useRef, useState } from 'react';
import type { MealComponent, MealComponentSlot, PermutationCandidate } from '../lib/api';

export type SlotSelections = Partial<Record<MealComponentSlot, MealComponent>>;
export type SlotLocks = Partial<Record<MealComponentSlot, boolean>>;
export type SlotMultipliers = Partial<Record<MealComponentSlot, number>>;

export interface PlateTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  cost: number;
  pantryCoveragePercent: number;
}

export const SLOT_ORDER: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce', 'garnish'];
export const REQUIRED_SLOTS: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce'];
export const PANTRY_ONLY_THRESHOLD = 80;
export const DEFAULT_PORTION = 1;

interface BuildAPlateState {
  selections: SlotSelections;
  locks: SlotLocks;
  multipliers: SlotMultipliers;
  pantryOnly: boolean;
  totals: PlateTotals;
  selectedSlotsCount: number;
  setSlot: (slot: MealComponentSlot, component: MealComponent | undefined) => void;
  setMultiplier: (slot: MealComponentSlot, value: number) => void;
  toggleLock: (slot: MealComponentSlot) => void;
  togglePantryOnly: () => void;
  setPantryOnly: (value: boolean) => void;
  rollUnlocked: (poolBySlot: Partial<Record<MealComponentSlot, MealComponent[]>>) => void;
  applyPermutation: (permutation: PermutationCandidate) => void;
  applySeed: (permutation: PermutationCandidate) => void;
  applyAutoFit: (filled: { slot: MealComponentSlot; component: MealComponent; portionMultiplier: number }[]) => void;
  reset: () => void;
}

interface UseBuildAPlateOptions {
  selections?: SlotSelections;
  locks?: SlotLocks;
  multipliers?: SlotMultipliers;
  pantryOnly?: boolean;
  onSwapAway?: (componentId: string, slot: MealComponentSlot) => void;
}

export function computeTotals(
  selections: SlotSelections,
  multipliers: SlotMultipliers = {},
): PlateTotals {
  const entries = (Object.entries(selections) as [MealComponentSlot, MealComponent | undefined][])
    .filter(([, c]) => Boolean(c)) as [MealComponentSlot, MealComponent][];
  if (entries.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0, pantryCoveragePercent: 0 };
  }
  const mult = (slot: MealComponentSlot): number => multipliers[slot] ?? DEFAULT_PORTION;
  const calories = entries.reduce((sum, [s, c]) => sum + c.caloriesPerPortion * mult(s), 0);
  const protein = entries.reduce((sum, [s, c]) => sum + c.proteinG * mult(s), 0);
  const carbs = entries.reduce((sum, [s, c]) => sum + c.carbsG * mult(s), 0);
  const fat = entries.reduce((sum, [s, c]) => sum + c.fatG * mult(s), 0);
  const fiber = entries.reduce((sum, [s, c]) => sum + (c.fiberG ?? 0) * mult(s), 0);
  const cost = entries.reduce(
    (sum, [s, c]) => sum + (c.estimatedCostPerPortion ?? 0) * mult(s),
    0,
  );
  const pantryCoveragePercent = Math.round(
    entries.reduce((sum, [, c]) => sum + (c.pantryCoveragePercent ?? 0), 0) / entries.length,
  );
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
    cost: Math.round(cost * 100) / 100,
    pantryCoveragePercent,
  };
}

export function pickRandom<T>(items: T[], excludeId?: string): T | undefined {
  if (items.length === 0) return undefined;
  const filtered = excludeId
    ? items.filter((item: any) => item?.id !== excludeId)
    : items;
  const pool = filtered.length > 0 ? filtered : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function filterByPantryOnly(
  items: MealComponent[],
  pantryOnly: boolean,
  threshold = PANTRY_ONLY_THRESHOLD,
): MealComponent[] {
  if (!pantryOnly) return items;
  return items.filter((c) => c.pantryCoveragePercent >= threshold);
}

export function sortByPantryCoverage(items: MealComponent[]): MealComponent[] {
  return [...items].sort((a, b) => b.pantryCoveragePercent - a.pantryCoveragePercent);
}

export default function useBuildAPlate(initial?: UseBuildAPlateOptions): BuildAPlateState {
  const [selections, setSelections] = useState<SlotSelections>(initial?.selections ?? {});
  const [locks, setLocks] = useState<SlotLocks>(initial?.locks ?? {});
  const [multipliers, setMultipliers] = useState<SlotMultipliers>(initial?.multipliers ?? {});
  const [pantryOnly, setPantryOnlyState] = useState<boolean>(initial?.pantryOnly ?? false);
  const onSwapAwayRef = useRef(initial?.onSwapAway);
  onSwapAwayRef.current = initial?.onSwapAway;

  const setSlot = useCallback((slot: MealComponentSlot, component: MealComponent | undefined) => {
    setSelections((prev) => {
      if (!component) {
        const { [slot]: _, ...rest } = prev;
        return rest;
      }
      const prior = prev[slot];
      if (prior && prior.id !== component.id) {
        onSwapAwayRef.current?.(prior.id, slot);
      }
      return { ...prev, [slot]: component };
    });
    // Reset multiplier when component changes — keeps it predictable.
    setMultipliers((prev) => {
      if (prev[slot] === DEFAULT_PORTION || prev[slot] === undefined) return prev;
      return { ...prev, [slot]: DEFAULT_PORTION };
    });
  }, []);

  const setMultiplier = useCallback((slot: MealComponentSlot, value: number) => {
    setMultipliers((prev) => ({ ...prev, [slot]: value }));
  }, []);

  const toggleLock = useCallback((slot: MealComponentSlot) => {
    setLocks((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }, []);

  const togglePantryOnly = useCallback(() => {
    setPantryOnlyState((prev) => !prev);
  }, []);

  const setPantryOnly = useCallback((value: boolean) => {
    setPantryOnlyState(value);
  }, []);

  const rollUnlocked = useCallback(
    (poolBySlot: Partial<Record<MealComponentSlot, MealComponent[]>>) => {
      setSelections((prev) => {
        const next: SlotSelections = { ...prev };
        for (const slot of REQUIRED_SLOTS) {
          if (locks[slot] && prev[slot]) continue;
          const pool = poolBySlot[slot] ?? [];
          const pick = pickRandom(pool, prev[slot]?.id);
          if (pick) next[slot] = pick;
        }
        return next;
      });
    },
    [locks],
  );

  const applyPermutation = useCallback((permutation: PermutationCandidate) => {
    setSelections((prev) => {
      const next: SlotSelections = { ...prev };
      for (const { slot, component } of permutation.components) {
        if (locks[slot]) continue;
        next[slot] = component;
      }
      return next;
    });
  }, [locks]);

  const applySeed = useCallback((permutation: PermutationCandidate) => {
    setSelections(() => {
      const next: SlotSelections = {};
      for (const { slot, component } of permutation.components) {
        next[slot] = component;
      }
      return next;
    });
  }, []);

  const applyAutoFit = useCallback(
    (filled: { slot: MealComponentSlot; component: MealComponent; portionMultiplier: number }[]) => {
      setSelections((prev) => {
        const next: SlotSelections = { ...prev };
        for (const { slot, component } of filled) {
          if (locks[slot]) continue;
          next[slot] = component;
        }
        return next;
      });
      setMultipliers((prev) => {
        const next: SlotMultipliers = { ...prev };
        for (const { slot, portionMultiplier } of filled) {
          if (locks[slot]) continue;
          next[slot] = portionMultiplier;
        }
        return next;
      });
    },
    [locks],
  );

  const reset = useCallback(() => {
    setSelections({});
    setLocks({});
    setMultipliers({});
    setPantryOnlyState(false);
  }, []);

  const totals = useMemo(() => computeTotals(selections, multipliers), [selections, multipliers]);
  const selectedSlotsCount = useMemo(
    () => Object.values(selections).filter(Boolean).length,
    [selections],
  );

  return {
    selections,
    locks,
    multipliers,
    pantryOnly,
    totals,
    selectedSlotsCount,
    setSlot,
    setMultiplier,
    toggleLock,
    togglePantryOnly,
    setPantryOnly,
    rollUnlocked,
    applyPermutation,
    applySeed,
    applyAutoFit,
    reset,
  };
}
