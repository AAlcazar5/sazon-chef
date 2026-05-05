// backend/src/services/usdaFdcService.ts
// ROADMAP 4.0 D12 — USDA FoodData Central API client.
//
// FDC docs: https://fdc.nal.usda.gov/api-guide
// Free key: https://api.data.gov/signup/ (no rate limit until 1000/h)
//
// Two operations:
//   - searchByName(name) → ranked list of FoodItems
//   - getByFdcId(id)     → full nutrient profile
//
// We map FDC's `foodNutrients[]` (a list of {nutrientId, amount, name})
// into the column shape stored on IngredientNutrient. Anything we don't
// column lands in `extras` as JSON.

import { logger } from '../utils/logger';

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';

// FDC nutrient_id → IngredientNutrient column. Source of truth: FDC's
// nutrient.csv (https://fdc.nal.usda.gov/download-datasets). IDs match
// USDA's standard reference; documented inline so future-us doesn't have
// to grep the FDC docs.
const NUTRIENT_MAP: Record<number, string> = {
  1008: 'calories',     // Energy (kcal)
  1003: 'protein',      // Protein (g)
  1005: 'carbs',        // Carbohydrate (g)
  1004: 'fat',          // Total lipid / fat (g)
  1079: 'fiber',        // Fiber (g)
  2000: 'sugar',        // Sugars, total (g)
  1235: 'addedSugar',   // Sugars, added (g)
  1258: 'saturatedFat', // Fatty acids, saturated (g)
  1292: 'monoFat',      // Fatty acids, monounsaturated (g)
  1293: 'polyFat',      // Fatty acids, polyunsaturated (g)
  1257: 'transFat',     // Fatty acids, trans (g)
  1253: 'cholesterol',  // Cholesterol (mg)
  1093: 'sodium',       // Sodium (mg)
  1092: 'potassium',    // Potassium (mg)
  1087: 'calcium',      // Calcium (mg)
  1089: 'iron',         // Iron (mg)
  1090: 'magnesium',    // Magnesium (mg)
  1095: 'zinc',         // Zinc (mg)
  1091: 'phosphorus',   // Phosphorus (mg)
  1103: 'selenium',     // Selenium (mcg)
  1106: 'vitA',         // Vitamin A, RAE (mcg)
  1162: 'vitC',         // Vitamin C (mg)
  1114: 'vitD',         // Vitamin D (D2 + D3) (mcg)
  1109: 'vitE',         // Vitamin E (mg)
  1185: 'vitK',         // Vitamin K (mcg)
  1165: 'thiamin',      // Thiamin / B1 (mg)
  1166: 'riboflavin',   // Riboflavin / B2 (mg)
  1167: 'niacin',       // Niacin / B3 (mg)
  1175: 'b6',           // Vitamin B6 (mg)
  1178: 'b12',          // Vitamin B12 (mcg)
  1177: 'folate',       // Folate, DFE (mcg)
  1404: 'omega3',       // 18:3 ALA (g) — primary plant omega-3
  1316: 'omega6',       // 18:2 LA (g)
};

export interface FdcSearchResult {
  fdcId: number;
  description: string;
  dataType?: string;
  foodCategory?: string;
  score?: number;
}

export interface FdcNutrient {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  amount?: number;
  // Survey foods use a different shape:
  nutrient?: { id: number; name: string; unitName: string };
  value?: number;
}

export interface FdcFood {
  fdcId: number;
  description: string;
  foodCategory?: { description?: string } | string;
  foodNutrients?: FdcNutrient[];
}

export interface NormalizedNutrients {
  fdcId: number;
  description: string;
  category: string | null;
  columned: Record<string, number>;
  extras: Record<string, { value: number; unit: string; name: string }>;
}

function apiKey(): string | null {
  return process.env.FDC_API_KEY ?? null;
}

function readNutrient(n: FdcNutrient): { id: number | null; name: string | null; unit: string | null; value: number | null } {
  const id = n.nutrientId ?? n.nutrient?.id ?? null;
  const name = n.nutrientName ?? n.nutrient?.name ?? null;
  const unit = n.unitName ?? n.nutrient?.unitName ?? null;
  const value = n.amount ?? n.value ?? null;
  return { id, name, unit, value };
}

export function normalizeFdcFood(food: FdcFood): NormalizedNutrients {
  const columned: Record<string, number> = {};
  const extras: Record<string, { value: number; unit: string; name: string }> = {};

  for (const raw of food.foodNutrients ?? []) {
    const { id, name, unit, value } = readNutrient(raw);
    if (id == null || value == null || !Number.isFinite(value)) continue;
    const column = NUTRIENT_MAP[id];
    if (column) {
      columned[column] = value;
    } else if (name && unit) {
      extras[String(id)] = { value, unit, name };
    }
  }

  const category = typeof food.foodCategory === 'string'
    ? food.foodCategory
    : food.foodCategory?.description ?? null;

  return {
    fdcId: food.fdcId,
    description: food.description,
    category,
    columned,
    extras,
  };
}

export async function searchByName(query: string, limit = 5): Promise<FdcSearchResult[]> {
  const key = apiKey();
  if (!key) {
    logger.warn('usdaFdc.searchByName.no_api_key');
    return [];
  }
  const url = `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize: limit,
        // Prefer the survey + foundation datasets — they have better-curated
        // nutrient profiles than branded supermarket items.
        dataType: ['Survey (FNDDS)', 'Foundation', 'SR Legacy'],
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, query }, 'usdaFdc.searchByName.http_error');
      return [];
    }
    const json = (await res.json()) as { foods?: FdcSearchResult[] };
    return json.foods ?? [];
  } catch (err) {
    logger.error({ err, query }, 'usdaFdc.searchByName.failed');
    return [];
  }
}

export async function getByFdcId(fdcId: number): Promise<FdcFood | null> {
  const key = apiKey();
  if (!key) {
    logger.warn('usdaFdc.getByFdcId.no_api_key');
    return null;
  }
  try {
    const res = await fetch(`${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      logger.warn({ status: res.status, fdcId }, 'usdaFdc.getByFdcId.http_error');
      return null;
    }
    return (await res.json()) as FdcFood;
  } catch (err) {
    logger.error({ err, fdcId }, 'usdaFdc.getByFdcId.failed');
    return null;
  }
}
