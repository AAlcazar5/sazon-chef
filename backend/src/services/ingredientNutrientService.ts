// backend/src/services/ingredientNutrientService.ts
// ROADMAP 4.0 D12 — ingredient → nutrient profile resolver.
//
// Lookup order:
//   1. IngredientFDCMapping by normalized name (cache hit, no FDC call)
//   2. IngredientNutrient by name (legacy / pre-mapped imports)
//   3. FDC search → take top result → cache row + mapping → return profile
//
// Returns null when:
//   - FDC_API_KEY not set
//   - FDC returns no results for the query
//   - any network/parse error (logged, not thrown)
//
// Service consumers (D13 aggregation) should treat null as "skip this
// ingredient" rather than throwing — recipes can be partially profiled.

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import {
  searchByName,
  getByFdcId,
  normalizeFdcFood,
  type NormalizedNutrients,
} from './usdaFdcService';

const COLUMNED_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'addedSugar',
  'saturatedFat', 'monoFat', 'polyFat', 'transFat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
  'phosphorus', 'selenium',
  'vitA', 'vitC', 'vitD', 'vitE', 'vitK',
  'thiamin', 'riboflavin', 'niacin', 'b6', 'b12', 'folate',
  'omega3', 'omega6',
] as const;

export type ColumnedNutrient = typeof COLUMNED_KEYS[number];

export type IngredientNutrientProfile = {
  fdcId: number;
  description: string;
  category: string | null;
  servingSize: number;
  servingUnit: string;
} & Partial<Record<ColumnedNutrient, number>> & {
  extras?: Record<string, { value: number; unit: string; name: string }>;
};

/** Lowercase, trim, collapse whitespace. Strips trailing notes after comma. */
export function normalizeIngredientName(raw: string): string {
  if (!raw) return '';
  const noParen = raw.replace(/\([^)]*\)/g, ' ');
  const beforeComma = noParen.split(',')[0] ?? noParen;
  return beforeComma.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildColumnUpdate(normalized: NormalizedNutrients) {
  const out: Record<string, unknown> = {
    description: normalized.description,
    category: normalized.category,
    extras: Object.keys(normalized.extras).length > 0 ? JSON.stringify(normalized.extras) : null,
    updatedAt: new Date(),
  };
  for (const key of COLUMNED_KEYS) {
    out[key] = normalized.columned[key] ?? null;
  }
  return out;
}

async function upsertProfile(normalized: NormalizedNutrients) {
  const data = buildColumnUpdate(normalized);
  return prisma.ingredientNutrient.upsert({
    where: { fdcId: normalized.fdcId },
    create: { ...data, fdcId: normalized.fdcId } as never,
    update: data as never,
  });
}

function rowToProfile(row: Record<string, unknown>): IngredientNutrientProfile {
  const profile: IngredientNutrientProfile = {
    fdcId: row.fdcId as number,
    description: row.description as string,
    category: (row.category as string | null) ?? null,
    servingSize: (row.servingSize as number) ?? 100,
    servingUnit: (row.servingUnit as string) ?? 'g',
  };
  for (const key of COLUMNED_KEYS) {
    const v = row[key];
    if (typeof v === 'number') profile[key] = v;
  }
  const extrasRaw = row.extras as string | null | undefined;
  if (extrasRaw) {
    try {
      profile.extras = JSON.parse(extrasRaw);
    } catch {
      // ignore — extras blob is informational, not load-bearing
    }
  }
  return profile;
}

/**
 * Resolve a recipe ingredient name to a cached nutrient profile. Hits the
 * FDC API at most once per (normalized) name; subsequent calls are local.
 */
export async function getOrFetchByName(rawName: string): Promise<IngredientNutrientProfile | null> {
  const name = normalizeIngredientName(rawName);
  if (!name) return null;

  // 1. Cached mapping?
  const mapping = await prisma.ingredientFDCMapping.findUnique({
    where: { normalizedName: name },
    include: { ingredient: true },
  });
  if (mapping?.ingredient) {
    return rowToProfile(mapping.ingredient as unknown as Record<string, unknown>);
  }

  // 2. Search FDC
  const results = await searchByName(name, 5);
  if (results.length === 0) {
    logger.debug({ name }, 'ingredientNutrient.search.no_results');
    return null;
  }

  // 3. Fetch top result's full profile
  const top = results[0];
  const food = await getByFdcId(top.fdcId);
  if (!food) return null;

  const normalized = normalizeFdcFood(food);
  const row = await upsertProfile(normalized);

  // 4. Cache the mapping for future lookups
  try {
    await prisma.ingredientFDCMapping.create({
      data: {
        normalizedName: name,
        fdcId: normalized.fdcId,
        confidence: top.score && Number.isFinite(top.score) ? top.score : 1.0,
      },
    });
  } catch (err) {
    // Swallow unique-violation on race; another worker mapped it first.
    logger.debug({ err, name }, 'ingredientNutrient.mapping.upsert_skipped');
  }

  return rowToProfile(row as unknown as Record<string, unknown>);
}

export const __forTest = {
  COLUMNED_KEYS,
  buildColumnUpdate,
  rowToProfile,
};
