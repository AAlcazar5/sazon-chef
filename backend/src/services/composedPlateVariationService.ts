// backend/src/services/composedPlateVariationService.ts
// Group 10X straggler — "Vary this plate" service.
//
// Given a saved ComposedPlate, generate N single-slot-swap variations so the
// user can riff on a hit ("loved the salmon + farro combo — what if I try
// chicken instead?"). Each variation differs from the source by exactly one
// slot, so ≥3 of the original 4 (or 4 of 5) components remain.

import { prisma } from '../lib/prisma';

const MIN_COUNT = 1;
const MAX_COUNT = 5;

export interface VariationComponent {
  slot: string;
  componentId: string;
  portionMultiplier: number;
}

export interface PlateVariation {
  swappedSlot: string;
  swappedFrom: string;
  swappedTo: string;
  components: VariationComponent[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface GenerateVariationsInput {
  plateId: string;
  userId: string;
  count: number;
}

interface SourceComponent {
  slot: string;
  componentId: string;
  portionMultiplier: number;
}

interface ComponentRow {
  id: string;
  slot: string;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const computeTotals = (
  components: VariationComponent[],
  byId: Map<string, ComponentRow>
) =>
  components.reduce(
    (acc, c) => {
      const row = byId.get(c.componentId);
      if (!row) return acc;
      const m = c.portionMultiplier;
      return {
        totalCalories: acc.totalCalories + row.caloriesPerPortion * m,
        totalProtein: acc.totalProtein + row.proteinG * m,
        totalCarbs: acc.totalCarbs + row.carbsG * m,
        totalFat: acc.totalFat + row.fatG * m,
      };
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

const round = (n: number) => Math.round(n);

export const generatePlateVariations = async (
  input: GenerateVariationsInput
): Promise<PlateVariation[]> => {
  const plate = await (prisma as any).composedPlate.findUnique({
    where: { id: input.plateId },
  });
  if (!plate) return [];
  if (plate.userId !== input.userId) {
    throw new Error('Plate not found or forbidden');
  }

  const cap = Math.max(MIN_COUNT, Math.min(MAX_COUNT, input.count));

  let sourceComponents: SourceComponent[];
  try {
    sourceComponents = JSON.parse(plate.componentIds);
  } catch {
    return [];
  }
  if (!Array.isArray(sourceComponents) || sourceComponents.length === 0) {
    return [];
  }

  const sourceIds = sourceComponents.map((c) => c.componentId);
  const sourceRows = (await (prisma as any).mealComponent.findMany({
    where: { id: { in: sourceIds } },
  })) as ComponentRow[];

  const byId = new Map<string, ComponentRow>(sourceRows.map((r) => [r.id, r]));

  const variations: PlateVariation[] = [];

  for (const sc of sourceComponents) {
    if (variations.length >= cap) break;

    const alternatives = (await (prisma as any).mealComponent.findMany({
      where: {
        slot: sc.slot,
        id: { notIn: sourceIds },
        OR: [{ userId: null }, { userId: input.userId }],
      },
    })) as ComponentRow[];

    if (alternatives.length === 0) continue;

    const swapTo = alternatives[0];
    byId.set(swapTo.id, swapTo);

    const variantComponents: VariationComponent[] = sourceComponents.map((c) =>
      c.slot === sc.slot
        ? { slot: c.slot, componentId: swapTo.id, portionMultiplier: c.portionMultiplier }
        : c
    );

    const totals = computeTotals(variantComponents, byId);
    variations.push({
      swappedSlot: sc.slot,
      swappedFrom: sc.componentId,
      swappedTo: swapTo.id,
      components: variantComponents,
      totalCalories: round(totals.totalCalories),
      totalProtein: round(totals.totalProtein),
      totalCarbs: round(totals.totalCarbs),
      totalFat: round(totals.totalFat),
    });
  }

  return variations;
};
