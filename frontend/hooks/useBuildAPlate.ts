// frontend/hooks/useBuildAPlate.ts
// Group 10X Phase 1 — composer state: selections per slot, locks, pantry-only mode, derived totals.

import { useCallback, useMemo, useState } from 'react';
import type { MealComponent, MealComponentSlot, PermutationCandidate } from '../lib/api';

export type SlotSelections = Partial<Record<MealComponentSlot, MealComponent>>;
export type SlotLocks = Partial<Record<MealComponentSlot, boolean>>;

export interface PlateTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  pantryCoveragePercent: number;
}

export const SLOT_ORDER: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce', 'garnish'];
export const REQUIRED_SLOTS: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce'];
export const PANTRY_ONLY_THRESHOLD = 80;

interface BuildAPlateState {
  selections: SlotSelections;
  locks: SlotLocks;
  pantryOnly: boolean;
  totals: PlateTotals;
  selectedSlotsCount: number;
  setSlot: (slot: MealComponentSlot, component: MealComponent | undefined) => void;
  toggleLock: (slot: MealComponentSlot) => void;
  togglePantryOnly: () => void;
  setPantryOnly: (value: boolean) => void;
  rollUnlocked: (poolBySlot: Partial<Record<MealComponentSlot, MealComponent[]>>) => void;
  applyPermutation: (permutation: PermutationCandidate) => void;
  applySeed: (permutation: PermutationCandidate) => void;
  reset: () => void;
}

export function computeTotals(selections: SlotSelections): PlateTotals {
  const components = Object.values(selections).filter(Boolean) as MealComponent[];
  if (components.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, pantryCoveragePercent: 0 };
  }
  const calories = components.reduce((sum, c) => sum + c.caloriesPerPortion, 0);
  const protein = components.reduce((sum, c) => sum + c.proteinG, 0);
  const carbs = components.reduce((sum, c) => sum + c.carbsG, 0);
  const fat = components.reduce((sum, c) => sum + c.fatG, 0);
  const fiber = components.reduce((sum, c) => sum + (c.fiberG ?? 0), 0);
  const pantryCoveragePercent = Math.round(
    components.reduce((sum, c) => sum + (c.pantryCoveragePercent ?? 0), 0) / components.length,
  );
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
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

export default function useBuildAPlate(initial?: {
  selections?: SlotSelections;
  locks?: SlotLocks;
  pantryOnly?: boolean;
}): BuildAPlateState {
  const [selections, setSelections] = useState<SlotSelections>(initial?.selections ?? {});
  const [locks, setLocks] = useState<SlotLocks>(initial?.locks ?? {});
  const [pantryOnly, setPantryOnlyState] = useState<boolean>(initial?.pantryOnly ?? false);

  const setSlot = useCallback((slot: MealComponentSlot, component: MealComponent | undefined) => {
    setSelections((prev) => {
      if (!component) {
        const { [slot]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slot]: component };
    });
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

  const reset = useCallback(() => {
    setSelections({});
    setLocks({});
    setPantryOnlyState(false);
  }, []);

  const totals = useMemo(() => computeTotals(selections), [selections]);
  const selectedSlotsCount = useMemo(
    () => Object.values(selections).filter(Boolean).length,
    [selections],
  );

  return {
    selections,
    locks,
    pantryOnly,
    totals,
    selectedSlotsCount,
    setSlot,
    toggleLock,
    togglePantryOnly,
    setPantryOnly,
    rollUnlocked,
    applyPermutation,
    applySeed,
    reset,
  };
}
