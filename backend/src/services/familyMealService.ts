// backend/src/services/familyMealService.ts
// Group 10X Phase 7 — Family mode: multi-plate composer + cook-step merging.
//
// Family meals contain N plates (default 2, max 6). Components shared across
// plates (same componentId) are cooked once but portioned across all plates
// that contain them, so the cook-timeline solver merges those steps.

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
