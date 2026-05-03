// backend/src/services/familyMealService.ts
// Group 10X Phase 7 — Family mode: multi-plate composer + cook-step merging.
//
// Family meals contain N plates (default 2, max 6). Components shared across
// plates (same componentId) are cooked once but portioned across all plates
// that contain them, so the cook-timeline solver merges those steps.

import { prisma } from '../lib/prisma';

export type ComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';

const MAX_FAMILY_PLATES = 6;

export interface PlateComponent {
  componentId: string;
  portionMultiplier: number;
  slot: ComponentSlot;
}

export interface FamilyPlateInput {
  plateId: string;
  components: PlateComponent[];
}

export interface MergedCookStep {
  componentId: string;
  totalPortions: number;
  servesPlateIds: string[];
  slot: ComponentSlot;
}

export interface PerPlateMacros {
  plateId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ComponentMacroRow {
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface BuildFamilyMealInput {
  userId: string;
  plates: FamilyPlateInput[];
}

export interface FamilyMeal {
  userId: string;
  plates: FamilyPlateInput[];
  cookSteps: MergedCookStep[];
}

export const mergeSharedCookSteps = (plates: FamilyPlateInput[]): MergedCookStep[] => {
  const byId = new Map<string, MergedCookStep>();
  for (const plate of plates) {
    for (const c of plate.components) {
      const existing = byId.get(c.componentId);
      if (existing) {
        existing.totalPortions += c.portionMultiplier;
        if (!existing.servesPlateIds.includes(plate.plateId)) {
          existing.servesPlateIds.push(plate.plateId);
        }
      } else {
        byId.set(c.componentId, {
          componentId: c.componentId,
          totalPortions: c.portionMultiplier,
          servesPlateIds: [plate.plateId],
          slot: c.slot,
        });
      }
    }
  }
  return [...byId.values()];
};

export const computePerPlateMacros = (
  plates: FamilyPlateInput[],
  componentIndex: Record<string, ComponentMacroRow>
): PerPlateMacros[] => {
  return plates.map((plate) => {
    const totals = plate.components.reduce(
      (acc, c) => {
        const m = componentIndex[c.componentId];
        if (!m) return acc;
        return {
          calories: acc.calories + m.caloriesPerPortion * c.portionMultiplier,
          protein: acc.protein + m.proteinG * c.portionMultiplier,
          carbs: acc.carbs + m.carbsG * c.portionMultiplier,
          fat: acc.fat + m.fatG * c.portionMultiplier,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return { plateId: plate.plateId, ...totals };
  });
};

export const buildFamilyMeal = (input: BuildFamilyMealInput): FamilyMeal => {
  if (input.plates.length === 0) {
    throw new Error('Family meal requires at least one plate');
  }
  if (input.plates.length > MAX_FAMILY_PLATES) {
    throw new Error(`Family meal supports a maximum of ${MAX_FAMILY_PLATES} plates`);
  }
  const cookSteps = mergeSharedCookSteps(input.plates);
  return {
    userId: input.userId,
    plates: input.plates,
    cookSteps,
  };
};

// ─── Diverge from a shared base ────────────────────────────────────────────────

export interface DivergeSpec {
  /** Slot pairs that all output plates share (e.g. [{slot:'protein', componentId:'p_chicken'}]) */
  sharedSlots: { slot: ComponentSlot; componentId: string }[];
  /** Per-output-plate divergent slots — typically vegetable/sauce variants per family member. */
  perPlateDivergentSlots: { plateId: string; slots: { slot: ComponentSlot; componentId: string }[] }[];
}

/**
 * "Diverge from a shared base" — kid-vs-adult plate one-tap.
 * Builds N FamilyPlateInputs where every plate carries the same `sharedSlots`
 * and additionally the per-plate divergent slots. Portion multiplier defaults
 * to 1; callers can post-process if they want to scale a kid plate down.
 */
export const divergeFromSharedBase = (spec: DivergeSpec): FamilyPlateInput[] => {
  if (spec.perPlateDivergentSlots.length === 0) {
    throw new Error('Diverge requires at least one output plate');
  }
  if (spec.perPlateDivergentSlots.length > MAX_FAMILY_PLATES) {
    throw new Error(`Diverge supports at most ${MAX_FAMILY_PLATES} output plates`);
  }
  return spec.perPlateDivergentSlots.map(({ plateId, slots }) => ({
    plateId,
    components: [
      ...spec.sharedSlots.map((s) => ({ ...s, portionMultiplier: 1 })),
      ...slots.map((s) => ({ ...s, portionMultiplier: 1 })),
    ],
  }));
};

// ─── Persistence ───────────────────────────────────────────────────────────────

export interface PersistFamilyMealInput {
  userId: string;
  name?: string;
  plates: Array<{
    plateId: string;
    components: PlateComponent[];
    householdMemberId?: string;
  }>;
}

export interface PersistedFamilyMeal {
  id: string;
  userId: string;
  name: string | null;
  cookSteps: MergedCookStep[];
  plateIds: string[];
}

/**
 * Persist a built family meal to the database. Each input plate must reference
 * an existing ComposedPlate row (callers create those via the composer first).
 * Returns the persisted family-meal id + the merged cook-steps payload.
 */
export const persistFamilyMeal = async (
  input: PersistFamilyMealInput,
): Promise<PersistedFamilyMeal> => {
  if (input.plates.length === 0) {
    throw new Error('Family meal requires at least one plate');
  }
  if (input.plates.length > MAX_FAMILY_PLATES) {
    throw new Error(`Family meal supports a maximum of ${MAX_FAMILY_PLATES} plates`);
  }

  // Verify every referenced plate belongs to this user (IDOR guard).
  const ownedPlates = await prisma.composedPlate.findMany({
    where: {
      id: { in: input.plates.map((p) => p.plateId) },
      userId: input.userId,
    },
    select: { id: true },
  });
  const ownedIds = new Set(ownedPlates.map((p) => p.id));
  for (const p of input.plates) {
    if (!ownedIds.has(p.plateId)) {
      throw new Error(`Plate ${p.plateId} not found or forbidden`);
    }
  }

  const cookSteps = mergeSharedCookSteps(
    input.plates.map((p) => ({ plateId: p.plateId, components: p.components })),
  );

  const created = await prisma.composedFamilyMeal.create({
    data: {
      userId: input.userId,
      name: input.name ?? null,
      cookStepsJson: JSON.stringify(cookSteps),
      plates: {
        create: input.plates.map((p, idx) => ({
          plateId: p.plateId,
          householdMemberId: p.householdMemberId ?? null,
          positionIndex: idx,
        })),
      },
    },
    include: { plates: true },
  });

  return {
    id: created.id,
    userId: created.userId,
    name: created.name,
    cookSteps,
    plateIds: created.plates.sort((a, b) => a.positionIndex - b.positionIndex).map((p) => p.plateId),
  };
};
