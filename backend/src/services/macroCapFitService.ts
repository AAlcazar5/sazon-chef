// backend/src/services/macroCapFitService.ts
// "Tune the plate" solver — pick the highest-quality plate whose totals stay
// within user-supplied bounds (min, max, or both) for any subset of cal / p /
// c / f / fiber.
//
// Sibling of macroAutoFitService.fitPlateToMacros (which targets ±10% of a
// goal). This one is *bounded* — user opts in to upper or lower bounds per
// macro. Common use:
//   • protein/fiber → min ("at least 30g protein")
//   • calories/carbs/fat → max ("under 600 cal")
// When no candidate respects every bound, returns the closest combo with
// `outOfBounds` telling the caller which bounds are violated and by how much.

import { prisma } from '../lib/prisma';
import type { ComponentSlot } from './mealComponentService';

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

export interface MacroBound {
  /** Lower bound — totals[macro] must be >= min */
  min?: number;
  /** Upper bound — totals[macro] must be <= max */
  max?: number;
}

export type MacroBounds = Partial<Record<MacroKey, MacroBound>>;

export interface BoundsFitInput {
  userId: string;
  bounds: MacroBounds;
  lockedSlots: { slot: ComponentSlot; componentId: string; portionMultiplier: number }[];
  slotsToFill: ComponentSlot[];
}

export interface PlateTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface ComponentRow {
  id: string;
  slot: string;
  name: string;
  description: string | null;
  defaultPortionGrams: number;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  estimatedCostPerPortion: number | null;
  cuisineTags: string;
  dietaryTags: string;
  cookMethodHint: string;
  pantryIngredientNames: string;
  imageUrl: string | null;
}

export interface BoundsFitFilledSlot {
  slot: ComponentSlot;
  component: ComponentRow;
  portionMultiplier: number;
}

export type BoundsViolation = { type: 'over' | 'under'; amount: number };

export interface BoundsFitResult {
  achievable: boolean;
  filled: BoundsFitFilledSlot[];
  totals: PlateTotals;
  /** Per-macro violation. Only present when achievable=false. */
  outOfBounds?: Partial<Record<MacroKey, BoundsViolation>>;
}

const PORTION_MULTIPLIERS = [0.5, 1, 1.5, 2] as const;
const COMBO_CAP = 1000;
const MACRO_KEYS: MacroKey[] = ['calories', 'protein', 'carbs', 'fat', 'fiber'];

const computeTotals = (
  entries: { row: ComponentRow; portionMultiplier: number }[],
): PlateTotals =>
  entries.reduce(
    (acc, { row, portionMultiplier: m }) => ({
      calories: acc.calories + row.caloriesPerPortion * m,
      protein: acc.protein + row.proteinG * m,
      carbs: acc.carbs + row.carbsG * m,
      fat: acc.fat + row.fatG * m,
      fiber: acc.fiber + (row.fiberG ?? 0) * m,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

const cartesianCapped = <T>(arrays: T[][]): T[][] => {
  if (arrays.length === 0) return [[]];
  const result: T[][] = [];
  const [first, ...rest] = arrays;
  const restProduct = cartesianCapped(rest);
  for (const item of first) {
    for (const combo of restProduct) {
      result.push([item, ...combo]);
      if (result.length >= COMBO_CAP) return result;
    }
    if (result.length >= COMBO_CAP) return result;
  }
  return result;
};

const outOfBoundsAmounts = (
  totals: PlateTotals,
  bounds: MacroBounds,
): Partial<Record<MacroKey, BoundsViolation>> => {
  const out: Partial<Record<MacroKey, BoundsViolation>> = {};
  for (const k of MACRO_KEYS) {
    const b = bounds[k];
    if (!b) continue;
    const v = totals[k];
    if (b.max !== undefined && v > b.max) {
      out[k] = { type: 'over', amount: v - b.max };
    } else if (b.min !== undefined && v < b.min) {
      out[k] = { type: 'under', amount: b.min - v };
    }
  }
  return out;
};

const respectsBounds = (totals: PlateTotals, bounds: MacroBounds): boolean =>
  Object.keys(outOfBoundsAmounts(totals, bounds)).length === 0;

/**
 * Total normalized out-of-bounds — sum of (violation / reference) for each
 * violated bound. Reference is the violated bound (max if over, min if under).
 * Used to rank "closest" combos when no candidate respects every bound.
 */
const totalOutOfBoundsRatio = (totals: PlateTotals, bounds: MacroBounds): number => {
  const violations = outOfBoundsAmounts(totals, bounds);
  let sum = 0;
  for (const k of MACRO_KEYS) {
    const v = violations[k];
    if (!v) continue;
    const b = bounds[k]!;
    const ref = v.type === 'over' ? b.max! : b.min!;
    sum += v.amount / Math.max(ref, 1);
  }
  return sum;
};

/**
 * Quality score for a respecting combo — higher = better.
 * Favors more protein + more fiber per calorie (the persona's "real food, lots
 * of nutrient density" preference). When a calorie max is set, also rewards
 * utilizing the headroom (don't return microscopic plates).
 */
const qualityScore = (totals: PlateTotals, bounds: MacroBounds): number => {
  const calForDensity = Math.max(totals.calories, 1);
  const proteinDensity = totals.protein / calForDensity;
  const fiberDensity = totals.fiber / calForDensity;
  const calMax = bounds.calories?.max;
  const headroomUse = calMax ? totals.calories / calMax : 0.5;
  return proteinDensity * 100 + fiberDensity * 50 + headroomUse * 5;
};

export const fitPlateWithinBounds = async (input: BoundsFitInput): Promise<BoundsFitResult> => {
  const { userId, bounds, lockedSlots, slotsToFill } = input;

  const lockedIds = lockedSlots.map((s) => s.componentId);
  const lockedRows =
    lockedIds.length > 0
      ? ((await prisma.mealComponent.findMany({
          where: {
            id: { in: lockedIds },
            OR: [{ userId: null }, { userId }],
          },
        })) as ComponentRow[])
      : [];

  const lockedById = new Map<string, ComponentRow>(lockedRows.map((r) => [r.id, r]));

  for (const { componentId } of lockedSlots) {
    if (!lockedById.has(componentId)) {
      throw new Error(`Locked component not found or not owned by user: ${componentId}`);
    }
  }

  const lockedEntries = lockedSlots.map(({ slot, componentId, portionMultiplier }) => ({
    slot,
    componentId,
    portionMultiplier,
    row: lockedById.get(componentId)!,
  }));

  const lockedTotals = computeTotals(lockedEntries);

  const buildLockedOnly = (): BoundsFitResult => {
    const respects = respectsBounds(lockedTotals, bounds);
    return {
      achievable: respects,
      filled: lockedEntries.map(({ slot, portionMultiplier, row }) => ({
        slot,
        component: row,
        portionMultiplier,
      })),
      totals: lockedTotals,
      outOfBounds: respects ? undefined : outOfBoundsAmounts(lockedTotals, bounds),
    };
  };

  if (slotsToFill.length === 0) {
    return buildLockedOnly();
  }

  const candidatesBySlot = await Promise.all(
    slotsToFill.map((slot) =>
      prisma.mealComponent.findMany({
        where: { slot, OR: [{ userId: null }, { userId }] },
      }) as Promise<ComponentRow[]>,
    ),
  );

  if (candidatesBySlot.some((arr) => arr.length === 0)) {
    return buildLockedOnly();
  }

  const combos = cartesianCapped(candidatesBySlot);

  let bestRespectingScore = -Infinity;
  let bestRespecting: { combo: ComponentRow[]; portions: number[]; totals: PlateTotals } | null = null;

  let bestOutOfBoundsRatio = Infinity;
  let bestOverage: { combo: ComponentRow[]; portions: number[]; totals: PlateTotals } | null = null;

  for (const combo of combos) {
    for (const portionSet of cartesianCapped(combo.map(() => [...PORTION_MULTIPLIERS] as number[]))) {
      const fillEntries = combo.map((row, i) => ({ row, portionMultiplier: portionSet[i] }));
      const fillTotals = computeTotals(fillEntries);
      const totals: PlateTotals = {
        calories: lockedTotals.calories + fillTotals.calories,
        protein: lockedTotals.protein + fillTotals.protein,
        carbs: lockedTotals.carbs + fillTotals.carbs,
        fat: lockedTotals.fat + fillTotals.fat,
        fiber: lockedTotals.fiber + fillTotals.fiber,
      };

      if (respectsBounds(totals, bounds)) {
        const score = qualityScore(totals, bounds);
        if (score > bestRespectingScore) {
          bestRespectingScore = score;
          bestRespecting = { combo, portions: portionSet, totals };
        }
      } else {
        const ratio = totalOutOfBoundsRatio(totals, bounds);
        if (ratio < bestOutOfBoundsRatio) {
          bestOutOfBoundsRatio = ratio;
          bestOverage = { combo, portions: portionSet, totals };
        }
      }
    }
  }

  const buildFilled = (combo: ComponentRow[], portions: number[]): BoundsFitFilledSlot[] => [
    ...lockedEntries.map(({ slot, portionMultiplier, row }) => ({
      slot,
      component: row,
      portionMultiplier,
    })),
    ...combo.map((row, i) => ({
      slot: slotsToFill[i],
      component: row,
      portionMultiplier: portions[i],
    })),
  ];

  if (bestRespecting) {
    return {
      achievable: true,
      filled: buildFilled(bestRespecting.combo, bestRespecting.portions),
      totals: bestRespecting.totals,
    };
  }

  if (bestOverage) {
    return {
      achievable: false,
      filled: buildFilled(bestOverage.combo, bestOverage.portions),
      totals: bestOverage.totals,
      outOfBounds: outOfBoundsAmounts(bestOverage.totals, bounds),
    };
  }

  return buildLockedOnly();
};
