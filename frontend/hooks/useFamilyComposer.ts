// frontend/hooks/useFamilyComposer.ts
// Group 10X Phase 7 — Family mode state.
//
// Manages an array of plate states (default 2, max 6). Each plate has its own
// slot selections + householdMember assignment. Exposes:
//   - per-plate setSlot / clearSlot
//   - "Diverge from a shared base" one-tap that locks protein + base across
//     plates and clears the divergent slots so the user fills them per-plate
//   - persist() — calls POST /api/composed-plates/family with persist=true

import { useCallback, useMemo, useState } from 'react';
import {
  composedPlateApi,
  type FamilyPlatePayload,
  type FamilyMealResponse,
  type MealComponentSlot,
  type PersistedFamilyMeal,
} from '../lib/api';

export interface FamilyPlateSelection {
  /** Local id used for picker state — backend assigns real plateId on save. */
  plateId: string;
  /** Optional household member assigned to this plate. */
  householdMemberId?: string;
  /** slot → componentId map (portionMultiplier is always 1 for this MVP). */
  slots: Partial<Record<MealComponentSlot, string>>;
}

export interface UseFamilyComposerResult {
  plates: FamilyPlateSelection[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  setSlot: (plateIndex: number, slot: MealComponentSlot, componentId: string) => void;
  clearSlot: (plateIndex: number, slot: MealComponentSlot) => void;
  assignMember: (plateIndex: number, memberId: string | undefined) => void;
  addPlate: () => void;
  removePlate: (plateIndex: number) => void;
  divergeFromShared: (sharedSlots: MealComponentSlot[]) => void;
  reset: () => void;
  buildPayload: () => FamilyPlatePayload[];
  persist: (name?: string) => Promise<{
    familyMeal: FamilyMealResponse;
    persisted?: PersistedFamilyMeal;
  }>;
  isPersisting: boolean;
  error: string | null;
}

const MAX_PLATES = 6;
const MIN_PLATES = 1;

const newPlate = (idx: number): FamilyPlateSelection => ({
  plateId: `local-${idx}-${Date.now()}`,
  slots: {},
});

const buildPayloadFromPlates = (plates: FamilyPlateSelection[]): FamilyPlatePayload[] => {
  return plates
    .filter((p) => Object.keys(p.slots).length > 0)
    .map((p) => ({
      plateId: p.plateId,
      components: (Object.entries(p.slots) as [MealComponentSlot, string][]).map(
        ([slot, componentId]) => ({
          slot,
          componentId,
          portionMultiplier: 1,
        }),
      ),
    }));
};

export function useFamilyComposer(initialCount: 2 | 3 | 4 | 5 | 6 = 2): UseFamilyComposerResult {
  const [plates, setPlates] = useState<FamilyPlateSelection[]>(() =>
    Array.from({ length: initialCount }, (_, i) => newPlate(i)),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPersisting, setIsPersisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSlot = useCallback(
    (plateIndex: number, slot: MealComponentSlot, componentId: string) => {
      setPlates((prev) =>
        prev.map((p, i) =>
          i === plateIndex ? { ...p, slots: { ...p.slots, [slot]: componentId } } : p,
        ),
      );
    },
    [],
  );

  const clearSlot = useCallback((plateIndex: number, slot: MealComponentSlot) => {
    setPlates((prev) =>
      prev.map((p, i) => {
        if (i !== plateIndex) return p;
        const next = { ...p.slots };
        delete next[slot];
        return { ...p, slots: next };
      }),
    );
  }, []);

  const assignMember = useCallback((plateIndex: number, memberId: string | undefined) => {
    setPlates((prev) =>
      prev.map((p, i) => (i === plateIndex ? { ...p, householdMemberId: memberId } : p)),
    );
  }, []);

  const addPlate = useCallback(() => {
    setPlates((prev) => {
      if (prev.length >= MAX_PLATES) return prev;
      return [...prev, newPlate(prev.length)];
    });
  }, []);

  const removePlate = useCallback((plateIndex: number) => {
    setPlates((prev) => {
      if (prev.length <= MIN_PLATES) return prev;
      return prev.filter((_, i) => i !== plateIndex);
    });
    setActiveIndex((cur) => (cur >= plateIndex ? Math.max(0, cur - 1) : cur));
  }, []);

  /**
   * Diverge from a shared base: take the active plate's selections for the
   * given slots, copy them to every other plate, and clear all OTHER slots on
   * the other plates so the user can fill them per-member.
   */
  const divergeFromShared = useCallback(
    (sharedSlots: MealComponentSlot[]) => {
      setPlates((prev) => {
        const source = prev[activeIndex];
        if (!source) return prev;
        const sharedSelections: Partial<Record<MealComponentSlot, string>> = {};
        for (const s of sharedSlots) {
          const v = source.slots[s];
          if (v) sharedSelections[s] = v;
        }
        return prev.map((p, i) => {
          if (i === activeIndex) return p;
          // Other plates: keep only the shared slots; clear divergent slots.
          return { ...p, slots: { ...sharedSelections } };
        });
      });
    },
    [activeIndex],
  );

  const reset = useCallback(() => {
    setPlates([newPlate(0), newPlate(1)]);
    setActiveIndex(0);
    setError(null);
  }, []);

  const buildPayload = useCallback((): FamilyPlatePayload[] => buildPayloadFromPlates(plates), [plates]);

  const persist = useCallback(
    async (name?: string) => {
      const payload = buildPayloadFromPlates(plates);
      if (payload.length === 0) {
        const msg = 'Add at least one plate before saving.';
        setError(msg);
        throw new Error(msg);
      }
      setIsPersisting(true);
      setError(null);
      try {
        const res = await composedPlateApi.family({
          plates: payload.map((p, i) => ({
            ...p,
            householdMemberId: plates[i]?.householdMemberId,
          })),
          name,
          persist: true,
        });
        return res.data!;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save the family meal — try again.';
        setError(msg);
        throw e;
      } finally {
        setIsPersisting(false);
      }
    },
    [plates],
  );

  return useMemo(
    () => ({
      plates,
      activeIndex,
      setActiveIndex,
      setSlot,
      clearSlot,
      assignMember,
      addPlate,
      removePlate,
      divergeFromShared,
      reset,
      buildPayload,
      persist,
      isPersisting,
      error,
    }),
    [
      plates,
      activeIndex,
      setSlot,
      clearSlot,
      assignMember,
      addPlate,
      removePlate,
      divergeFromShared,
      reset,
      buildPayload,
      persist,
      isPersisting,
      error,
    ],
  );
}
