// backend/src/services/macroCapFitService.ts
// "Keep under" solver — pick the highest-quality plate whose totals stay under
// every user-supplied cap (any subset of calories / protein / carbs / fat / fiber).
//
// Sibling of macroAutoFitService.fitPlateToMacros (which targets ±10% of a goal).
// This one is *upper-bound only* — caps that the user opts in to. When no
// candidate respects every cap, returns the closest combo with `exceeded`
// telling the caller which caps are over and by how much.

import { prisma } from '../lib/prisma';
import type { ComponentSlot } from './mealComponentService';

export interface MacroCaps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface CapFitInput {
  userId: string;
  caps: MacroCaps;
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

export interface CapFitFilledSlot {
  slot: ComponentSlot;
  component: ComponentRow;
  portionMultiplier: number;
}

export interface CapFitResult {
  achievable: boolean;
  filled: CapFitFilledSlot[];
  totals: PlateTotals;
  /** Only present when achievable=false. Per-macro overage (positive numbers). */
  exceeded?: Partial<Record<keyof MacroCaps, number>>;
}

const PORTION_MULTIPLIERS = [0.5, 1, 1.5, 2] as const;
const COMBO_CAP = 1000;

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

const exceededAmounts = (
  totals: PlateTotals,
  caps: MacroCaps,
): Partial<Record<keyof MacroCaps, number>> => {
  const out: Partial<Record<keyof MacroCaps, number>> = {};
  if (caps.calories !== undefined && totals.calories > caps.calories) {
    out.calories = totals.calories - caps.calories;
  }
  if (caps.protein !== undefined && totals.protein > caps.protein) {
    out.protein = totals.protein - caps.protein;
  }
  if (caps.carbs !== undefined && totals.carbs > caps.carbs) {
    out.carbs = totals.carbs - caps.carbs;
  }
  if (caps.fat !== undefined && totals.fat > caps.fat) {
    out.fat = totals.fat - caps.fat;
  }
  if (caps.fiber !== undefined && totals.fiber > caps.fiber) {
    out.fiber = totals.fiber - caps.fiber;
  }
  return out;
};

const respectsCaps = (totals: PlateTotals, caps: MacroCaps): boolean =>
  Object.keys(exceededAmounts(totals, caps)).length === 0;

/**
 * Total normalized overage — sum of (overage / cap) for each violated cap.
 * Used to rank "closest" combos when no candidate respects every cap.
 */
const totalOverageRatio = (totals: PlateTotals, caps: MacroCaps): number => {
  const exceeded = exceededAmounts(totals, caps);
  let sum = 0;
  if (exceeded.calories !== undefined && caps.calories) sum += exceeded.calories / caps.calories;
  if (exceeded.protein !== undefined && caps.protein) sum += exceeded.protein / caps.protein;
  if (exceeded.carbs !== undefined && caps.carbs) sum += exceeded.carbs / caps.carbs;
  if (exceeded.fat !== undefined && caps.fat) sum += exceeded.fat / caps.fat;
  if (exceeded.fiber !== undefined && caps.fiber) sum += exceeded.fiber / caps.fiber;
  return sum;
};

/**
 * Quality score for a respecting combo — higher = better.
 * Favors more protein + more fiber per calorie (the persona's "real food, lots
 * of nutrient density" preference). Tie-breaks on cal headroom utilization.
 */
const qualityScore = (totals: PlateTotals, caps: MacroCaps): number => {
  const calForDensity = Math.max(totals.calories, 1);
  const proteinDensity = totals.protein / calForDensity;
  const fiberDensity = totals.fiber / calForDensity;
  // Favor utilizing the calorie headroom (don't return microscopic plates).
  const headroomUse = caps.calories ? totals.calories / caps.calories : 0.5;
  return proteinDensity * 100 + fiberDensity * 50 + headroomUse * 5;
};

export const fitPlateUnderCaps = async (input: CapFitInput): Promise<CapFitResult> => {
  const { userId, caps, lockedSlots, slotsToFill } = input;

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

  if (slotsToFill.length === 0) {
    return {
      achievable: respectsCaps(lockedTotals, caps),
      filled: lockedEntries.map(({ slot, portionMultiplier, row }) => ({
        slot,
        component: row,
        portionMultiplier,
      })),
      totals: lockedTotals,
      exceeded: respectsCaps(lockedTotals, caps) ? undefined : exceededAmounts(lockedTotals, caps),
    };
  }

  const candidatesBySlot = await Promise.all(
    slotsToFill.map((slot) =>
      prisma.mealComponent.findMany({
        where: { slot, OR: [{ userId: null }, { userId }] },
      }) as Promise<ComponentRow[]>,
    ),
  );

  // If any slot has zero candidates, return the locked-only state.
  if (candidatesBySlot.some((arr) => arr.length === 0)) {
    return {
      achievable: respectsCaps(lockedTotals, caps),
      filled: lockedEntries.map(({ slot, portionMultiplier, row }) => ({
        slot,
        component: row,
        portionMultiplier,
      })),
      totals: lockedTotals,
      exceeded: respectsCaps(lockedTotals, caps) ? undefined : exceededAmounts(lockedTotals, caps),
    };
  }

  const combos = cartesianCapped(candidatesBySlot);

  let bestRespectingScore = -Infinity;
  let bestRespecting: { combo: ComponentRow[]; portions: number[]; totals: PlateTotals } | null = null;

  let bestOverageRatio = Infinity;
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

      if (respectsCaps(totals, caps)) {
        const score = qualityScore(totals, caps);
        if (score > bestRespectingScore) {
          bestRespectingScore = score;
          bestRespecting = { combo, portions: portionSet, totals };
        }
      } else {
        const ratio = totalOverageRatio(totals, caps);
        if (ratio < bestOverageRatio) {
          bestOverageRatio = ratio;
          bestOverage = { combo, portions: portionSet, totals };
        }
      }
    }
  }

  const buildFilled = (combo: ComponentRow[], portions: number[]): CapFitFilledSlot[] => [
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
      exceeded: exceededAmounts(bestOverage.totals, caps),
    };
  }

  // Truly nothing — return locked-only state.
  return {
    achievable: respectsCaps(lockedTotals, caps),
    filled: lockedEntries.map(({ slot, portionMultiplier, row }) => ({
      slot,
      component: row,
      portionMultiplier,
    })),
    totals: lockedTotals,
    exceeded: respectsCaps(lockedTotals, caps) ? undefined : exceededAmounts(lockedTotals, caps),
  };
};
