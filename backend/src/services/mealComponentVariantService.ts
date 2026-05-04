// backend/src/services/mealComponentVariantService.ts
// Group 10X-Deferred — Variants of an existing MealComponent.

import { prisma } from '../lib/prisma';

export interface MealComponentVariantRow {
  id: string;
  componentId: string;
  variantKey: string;
  displayName: string;
  cookTimeMinutes: number;
  caloriePerPortionDelta: number;
  equipmentNeeded: string | null;
  flavorProfile: string | null;
  compatibilityScores: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantWithCompatibility {
  variant: MealComponentVariantRow;
  compatibilityScore: number;
}

export interface LockedSlotRef {
  slot: string;
  componentId: string;
}

export interface BaseComponentMacros {
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface VariantMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const NEUTRAL_COMPATIBILITY = 0.5;

const parseScores = (raw: string | null): Record<string, number> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch {
    // Fall through to empty.
  }
  return {};
};

/**
 * Verify the requesting user can read variants for this component. Component
 * is accessible when it is a seed component (userId null) or owned by the
 * caller. Throws nothing; returns boolean so callers can 404/empty cleanly.
 */
const userCanReadComponent = async (
  componentId: string,
  userId: string,
): Promise<boolean> => {
  const component = await prisma.mealComponent.findFirst({
    where: { id: componentId, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  });
  return !!component;
};

export const listVariantsForComponent = async (
  componentId: string,
  userId: string,
): Promise<MealComponentVariantRow[]> => {
  if (!(await userCanReadComponent(componentId, userId))) {
    return [];
  }
  return prisma.mealComponentVariant.findMany({
    where: { componentId },
    orderBy: { variantKey: 'asc' },
  });
};

export const getCompatibleVariants = async (
  componentId: string,
  userId: string,
  lockedSlots: LockedSlotRef[],
): Promise<VariantWithCompatibility[]> => {
  const variants = await listVariantsForComponent(componentId, userId);
  if (variants.length === 0) return [];

  const scored: VariantWithCompatibility[] = variants.map((variant) => {
    const scoreMap = parseScores(variant.compatibilityScores);
    if (lockedSlots.length === 0) {
      return { variant, compatibilityScore: NEUTRAL_COMPATIBILITY };
    }
    const total = lockedSlots.reduce((sum, locked) => {
      const score = scoreMap[locked.componentId];
      return sum + (typeof score === 'number' ? score : NEUTRAL_COMPATIBILITY);
    }, 0);
    return {
      variant,
      compatibilityScore: total / lockedSlots.length,
    };
  });

  return scored.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return a.variant.displayName.localeCompare(b.variant.displayName);
  });
};

export const computeVariantMacros = (
  base: BaseComponentMacros,
  variant: Pick<MealComponentVariantRow, 'caloriePerPortionDelta'>
): VariantMacros => {
  const calories = Math.max(0, base.caloriesPerPortion + variant.caloriePerPortionDelta);
  return {
    calories,
    protein: base.proteinG,
    carbs: base.carbsG,
    fat: base.fatG,
  };
};
