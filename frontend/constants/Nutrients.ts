// frontend/constants/Nutrients.ts
// ROADMAP 4.0 D14 — daily values, units, and discovery-priority order.
// FDA reference DVs (2020). Discovery voice: never "you're missing X" —
// just "today hit X% magnesium" or "top mineral: iron from spinach".

export type NutrientKey =
  | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'addedSugar'
  | 'saturatedFat' | 'monoFat' | 'polyFat' | 'transFat' | 'cholesterol'
  | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'magnesium' | 'zinc'
  | 'phosphorus' | 'selenium'
  | 'vitA' | 'vitC' | 'vitD' | 'vitE' | 'vitK'
  | 'thiamin' | 'riboflavin' | 'niacin' | 'b6' | 'b12' | 'folate'
  | 'omega3' | 'omega6';

export interface NutrientMeta {
  label: string;
  unit: string;
  /** FDA reference daily value. Null = informational, no DV target. */
  dv: number | null;
  /** Group used for sectioning the "see all" view. */
  group: 'macro' | 'mineral' | 'vitamin' | 'omega' | 'fat' | 'sugar';
}

export const NUTRIENT_META: Record<NutrientKey, NutrientMeta> = {
  calories:     { label: 'Calories',      unit: 'kcal', dv: 2000, group: 'macro' },
  protein:      { label: 'Protein',       unit: 'g',    dv: 50,   group: 'macro' },
  carbs:        { label: 'Carbs',         unit: 'g',    dv: 275,  group: 'macro' },
  fat:          { label: 'Fat',           unit: 'g',    dv: 78,   group: 'macro' },
  fiber:        { label: 'Fiber',         unit: 'g',    dv: 28,   group: 'macro' },
  sugar:        { label: 'Sugar',         unit: 'g',    dv: null, group: 'sugar' },
  addedSugar:   { label: 'Added sugar',   unit: 'g',    dv: 50,   group: 'sugar' },
  saturatedFat: { label: 'Saturated fat', unit: 'g',    dv: 20,   group: 'fat' },
  monoFat:      { label: 'Monounsat. fat', unit: 'g',   dv: null, group: 'fat' },
  polyFat:      { label: 'Polyunsat. fat', unit: 'g',   dv: null, group: 'fat' },
  transFat:     { label: 'Trans fat',     unit: 'g',    dv: null, group: 'fat' },
  cholesterol:  { label: 'Cholesterol',   unit: 'mg',   dv: 300,  group: 'fat' },
  sodium:       { label: 'Sodium',        unit: 'mg',   dv: 2300, group: 'mineral' },
  potassium:    { label: 'Potassium',     unit: 'mg',   dv: 4700, group: 'mineral' },
  calcium:      { label: 'Calcium',       unit: 'mg',   dv: 1300, group: 'mineral' },
  iron:         { label: 'Iron',          unit: 'mg',   dv: 18,   group: 'mineral' },
  magnesium:    { label: 'Magnesium',     unit: 'mg',   dv: 420,  group: 'mineral' },
  zinc:         { label: 'Zinc',          unit: 'mg',   dv: 11,   group: 'mineral' },
  phosphorus:   { label: 'Phosphorus',    unit: 'mg',   dv: 1250, group: 'mineral' },
  selenium:     { label: 'Selenium',      unit: 'mcg',  dv: 55,   group: 'mineral' },
  vitA:         { label: 'Vitamin A',     unit: 'mcg',  dv: 900,  group: 'vitamin' },
  vitC:         { label: 'Vitamin C',     unit: 'mg',   dv: 90,   group: 'vitamin' },
  vitD:         { label: 'Vitamin D',     unit: 'mcg',  dv: 20,   group: 'vitamin' },
  vitE:         { label: 'Vitamin E',     unit: 'mg',   dv: 15,   group: 'vitamin' },
  vitK:         { label: 'Vitamin K',     unit: 'mcg',  dv: 120,  group: 'vitamin' },
  thiamin:      { label: 'Thiamin (B1)',  unit: 'mg',   dv: 1.2,  group: 'vitamin' },
  riboflavin:   { label: 'Riboflavin (B2)', unit: 'mg', dv: 1.3,  group: 'vitamin' },
  niacin:       { label: 'Niacin (B3)',   unit: 'mg',   dv: 16,   group: 'vitamin' },
  b6:           { label: 'Vitamin B6',    unit: 'mg',   dv: 1.7,  group: 'vitamin' },
  b12:          { label: 'Vitamin B12',   unit: 'mcg',  dv: 2.4,  group: 'vitamin' },
  folate:       { label: 'Folate',        unit: 'mcg',  dv: 400,  group: 'vitamin' },
  omega3:       { label: 'Omega-3',       unit: 'g',    dv: 1.6,  group: 'omega' },
  omega6:       { label: 'Omega-6',       unit: 'g',    dv: 17,   group: 'omega' },
};

/** Recipe-detail discovery — fixed core 7 + 1 rotating "surprise". */
export const RECIPE_CORE_NUTRIENTS: NutrientKey[] = [
  'calories', 'protein', 'fiber', 'iron', 'magnesium', 'b12', 'omega3',
];

export const RECIPE_SURPRISE_POOL: NutrientKey[] = [
  'vitK', 'folate', 'vitC', 'potassium', 'zinc', 'vitE', 'selenium',
];

/** Today screen — top 6 daily roll-up. */
export const DAILY_TOP_NUTRIENTS: NutrientKey[] = [
  'calories', 'protein', 'fiber', 'iron', 'magnesium', 'b12',
];

export type NutritionUIDensity = 'minimal' | 'macros' | 'macros + micros' | 'power-user';

/** How many nutrients to show on the recipe-detail card per density. */
export function recipeNutrientCountForDensity(density: NutritionUIDensity): number {
  switch (density) {
    case 'minimal': return 0;
    case 'macros': return 4;
    case 'macros + micros': return 8;
    case 'power-user': return 16;
  }
}

/** Stable "surprise" pick keyed on the recipe id so the same recipe always
 *  shows the same surprise nutrient (anti-monotony across recipes, not
 *  flicker within one recipe). */
export function pickSurpriseNutrient(recipeId: string, exclude: Set<NutrientKey>): NutrientKey {
  let hash = 0;
  for (let i = 0; i < recipeId.length; i += 1) hash = (hash * 31 + recipeId.charCodeAt(i)) | 0;
  const candidates = RECIPE_SURPRISE_POOL.filter(k => !exclude.has(k));
  if (candidates.length === 0) return RECIPE_SURPRISE_POOL[0];
  return candidates[Math.abs(hash) % candidates.length];
}

export function dvPercent(value: number | null | undefined, key: NutrientKey): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const dv = NUTRIENT_META[key].dv;
  if (!dv) return null;
  return Math.round((value / dv) * 100);
}

export function formatNutrientValue(value: number | null | undefined, key: NutrientKey): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const meta = NUTRIENT_META[key];
  // Round small values to 1 decimal, larger to 0.
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${meta.unit}`;
}
