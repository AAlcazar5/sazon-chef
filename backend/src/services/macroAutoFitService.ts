// backend/src/services/macroAutoFitService.ts
// Group 10X Phase 5 — "Fit my macros" solver.

import { prisma } from '../lib/prisma';
import type { ComponentSlot } from './mealComponentService';

export interface MacroTarget {
  calories: number;
  protein: number;
}

export interface FitInput {
  userId: string;
  target: MacroTarget;
  lockedSlots: { slot: ComponentSlot; componentId: string; portionMultiplier: number }[];
  slotsToFill: ComponentSlot[];
}

export interface FitResult {
  achievable: boolean;
  plate: { slot: ComponentSlot; componentId: string; portionMultiplier: number }[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  gap?: { calories: number; protein: number };
}

interface ComponentRow {
  id: string;
  slot: string;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const PORTION_MULTIPLIERS = [0.5, 1, 1.5, 2] as const;
const COMBO_CAP = 1000;

const computeTotals = (
  entries: { row: ComponentRow; portionMultiplier: number }[]
): { calories: number; protein: number; carbs: number; fat: number } =>
  entries.reduce(
    (acc, { row, portionMultiplier: m }) => ({
      calories: acc.calories + row.caloriesPerPortion * m,
      protein: acc.protein + row.proteinG * m,
      carbs: acc.carbs + row.carbsG * m,
      fat: acc.fat + row.fatG * m,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
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

const scoreCandidate = (
  totalCal: number,
  totalProtein: number,
  remainingCal: number,
  remainingProtein: number
): number => {
  const calScore = 1.0 - Math.abs(remainingCal - totalCal) / Math.max(remainingCal, 1);
  const proteinShortfall = Math.max(0, 0.85 * remainingProtein - totalProtein);
  const proteinScore = proteinShortfall / Math.max(remainingProtein, 1);
  return calScore - proteinScore;
};

const exceedsCaloriesBudget = (totalCal: number, remainingCal: number): boolean =>
  totalCal > remainingCal * 1.1;

const meetsTargets = (
  totalCal: number,
  totalProtein: number,
  remainingCal: number,
  remainingProtein: number
): boolean => {
  const calOk = Math.abs(remainingCal - totalCal) / Math.max(remainingCal, 1) <= 0.1;
  const proteinOk = totalProtein >= 0.85 * remainingProtein;
  return calOk && proteinOk;
};

export const fitPlateToMacros = async (input: FitInput): Promise<FitResult> => {
  const { userId, target, lockedSlots, slotsToFill } = input;

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
    const plate = lockedEntries.map(({ slot, componentId, portionMultiplier }) => ({
      slot,
      componentId,
      portionMultiplier,
    }));
    return { achievable: true, plate, totals: lockedTotals };
  }

  const remainingCal = target.calories - lockedTotals.calories;
  const remainingProtein = target.protein - lockedTotals.protein;

  const candidatesBySlot = await Promise.all(
    slotsToFill.map((slot) =>
      prisma.mealComponent.findMany({
        where: { slot, OR: [{ userId: null }, { userId }] },
      }) as Promise<ComponentRow[]>
    )
  );

  if (candidatesBySlot.some((arr) => arr.length === 0)) {
    const emptySlotIdx = candidatesBySlot.findIndex((arr) => arr.length === 0);
    return {
      achievable: false,
      plate: lockedEntries.map(({ slot, componentId, portionMultiplier }) => ({
        slot,
        componentId,
        portionMultiplier,
      })),
      totals: lockedTotals,
      gap: {
        calories: Math.max(0, remainingCal),
        protein: Math.max(0, remainingProtein),
      },
    };
  }

  const combos = cartesianCapped(candidatesBySlot);

  let bestScore = -Infinity;
  let bestPlate: { slot: ComponentSlot; componentId: string; portionMultiplier: number }[] = [];
  let bestTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let bestAchievable = false;

  for (const combo of combos) {
    for (const portionSet of cartesianCapped(
      combo.map(() => [...PORTION_MULTIPLIERS] as number[])
    )) {
      const fillEntries = combo.map((row, i) => ({ row, portionMultiplier: portionSet[i] }));
      const fillTotals = computeTotals(fillEntries);

      if (exceedsCaloriesBudget(fillTotals.calories, remainingCal)) continue;

      const score = scoreCandidate(
        fillTotals.calories,
        fillTotals.protein,
        remainingCal,
        remainingProtein
      );

      if (score > bestScore) {
        bestScore = score;
        bestTotals = {
          calories: lockedTotals.calories + fillTotals.calories,
          protein: lockedTotals.protein + fillTotals.protein,
          carbs: lockedTotals.carbs + fillTotals.carbs,
          fat: lockedTotals.fat + fillTotals.fat,
        };
        bestAchievable = meetsTargets(
          fillTotals.calories,
          fillTotals.protein,
          remainingCal,
          remainingProtein
        );
        bestPlate = [
          ...lockedEntries.map(({ slot, componentId, portionMultiplier }) => ({
            slot,
            componentId,
            portionMultiplier,
          })),
          ...combo.map((row, i) => ({
            slot: slotsToFill[i],
            componentId: row.id,
            portionMultiplier: portionSet[i],
          })),
        ];
      }
    }
  }

  if (bestScore === -Infinity) {
    return {
      achievable: false,
      plate: lockedEntries.map(({ slot, componentId, portionMultiplier }) => ({
        slot,
        componentId,
        portionMultiplier,
      })),
      totals: lockedTotals,
      gap: {
        calories: Math.max(0, remainingCal),
        protein: Math.max(0, remainingProtein),
      },
    };
  }

  if (bestAchievable) {
    return { achievable: true, plate: bestPlate, totals: bestTotals };
  }

  const gap = {
    calories: Math.max(0, remainingCal - (bestTotals.calories - lockedTotals.calories)),
    protein: Math.max(
      0,
      0.85 * remainingProtein - (bestTotals.protein - lockedTotals.protein)
    ),
  };

  return { achievable: false, plate: bestPlate, totals: bestTotals, gap };
};
