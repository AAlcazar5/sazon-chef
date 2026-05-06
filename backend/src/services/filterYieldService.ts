// backend/src/services/filterYieldService.ts
// ROADMAP 4.0 FX3.2 — per-filter yield deltas.
//
// Given a filter set that produced a sparse / zero result, return the
// candidate yield gain from removing each individual filter. The frontend
// surfaces the top-2 as "Remove [Quick] — gains 47" rows so the user can
// single-clear a filter rather than nuking everything.

import { prisma } from '../lib/prisma';

export interface FilterYieldsInput {
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number | null;
  difficulty?: string[];
  highProtein?: boolean;
  lowCarb?: boolean;
  lowCalorie?: boolean;
  mealPrepMode?: boolean;
}

export interface FilterYieldRow {
  /** Stable id used by the UI to single-clear the named filter. */
  filterId: string;
  /** Display label — used in copy ("Remove [Quick]"). */
  label: string;
  /** Candidate count if this single filter were removed. */
  remainingIfRemoved: number;
}

export interface FilterYieldsResult {
  baselineCount: number;
  yields: FilterYieldRow[];
}

const MACRO_THRESHOLDS = {
  highProtein: { field: 'protein', op: 'gte', value: 30 },
  lowCarb: { field: 'carbs', op: 'lte', value: 30 },
  lowCalorie: { field: 'calories', op: 'lte', value: 400 },
} as const;

interface FilterDef {
  filterId: string;
  label: string;
  active: boolean;
}

function buildFilterDefs(input: FilterYieldsInput): FilterDef[] {
  return [
    { filterId: 'cuisines', label: 'Cuisines', active: !!input.cuisines?.length },
    { filterId: 'dietary', label: 'Dietary', active: !!input.dietaryRestrictions?.length },
    { filterId: 'quick', label: 'Quick', active: input.maxCookTime != null },
    { filterId: 'difficulty', label: 'Difficulty', active: !!input.difficulty?.length },
    { filterId: 'highProtein', label: 'High-Protein', active: !!input.highProtein },
    { filterId: 'lowCarb', label: 'Low-Carb', active: !!input.lowCarb },
    { filterId: 'lowCalorie', label: 'Low-Cal', active: !!input.lowCalorie },
    { filterId: 'mealPrep', label: 'Meal Prep', active: !!input.mealPrepMode },
  ];
}

/**
 * Build a Prisma `where` clause from the filter input, optionally excluding
 * one filter (used to compute the "if removed" yield).
 */
function buildWhere(input: FilterYieldsInput, excludeFilterId?: string): any {
  const where: any = { deletedAt: null };

  if (input.cuisines?.length && excludeFilterId !== 'cuisines') {
    where.cuisine = { in: input.cuisines };
  }
  if (input.dietaryRestrictions?.length && excludeFilterId !== 'dietary') {
    // Tags stored as a JSON array on Recipe; use tagsString contains as a
    // pragmatic SQLite-friendly filter (mirrors getRecipes' behavior).
    where.AND = (where.AND ?? []).concat(
      input.dietaryRestrictions.map((tag) => ({
        tagsString: { contains: tag },
      })),
    );
  }
  if (input.maxCookTime != null && excludeFilterId !== 'quick') {
    where.cookTime = { lte: input.maxCookTime };
  }
  if (input.difficulty?.length && excludeFilterId !== 'difficulty') {
    where.difficulty = { in: input.difficulty };
  }
  for (const key of ['highProtein', 'lowCarb', 'lowCalorie'] as const) {
    if (input[key] && excludeFilterId !== key) {
      const cfg = MACRO_THRESHOLDS[key];
      where[cfg.field] = { [cfg.op]: cfg.value };
    }
  }
  if (input.mealPrepMode && excludeFilterId !== 'mealPrep') {
    where.mealPrepFriendly = true;
  }

  return where;
}

export async function computeFilterYields(
  input: FilterYieldsInput,
): Promise<FilterYieldsResult> {
  const baselineCount = await prisma.recipe.count({ where: buildWhere(input) });
  const defs = buildFilterDefs(input);

  const rows: FilterYieldRow[] = [];
  for (const def of defs) {
    if (!def.active) continue;
    const remainingIfRemoved = await prisma.recipe.count({
      where: buildWhere(input, def.filterId),
    });
    rows.push({
      filterId: def.filterId,
      label: def.label,
      remainingIfRemoved,
    });
  }

  // Sort descending by yield gain so the most-impactful single-filter removal
  // surfaces first.
  rows.sort((a, b) => b.remainingIfRemoved - a.remainingIfRemoved);

  return { baselineCount, yields: rows };
}
