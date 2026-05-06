// backend/src/services/nutritionScorer.ts
// ROADMAP 4.0 Tier D2.3 — Nutrition completeness scorer.
//
// Pure function over a recipe's nutrient aggregate (D13). Scores 0-5
// on three axes: macro completeness (all 5 macros > 0), micro depth
// (≥5 populated), and sanity (no implausible macro content given the
// ingredient list — e.g., 50g protein in a salad with no protein source).

import type { FailureReason } from './recipeQualityScoreService';

export interface NutritionScoreInput {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  micros: Record<string, number>;
  ingredientNames: string[];
}

export interface NutritionScoreResult {
  score: number;
  reasons: FailureReason[];
}

const MIN_MICROS = 5;
const HIGH_PROTEIN_THRESHOLD_G = 30;

const PROTEIN_SOURCE_MARKERS = [
  'chicken',
  'turkey',
  'beef',
  'pork',
  'lamb',
  'duck',
  'fish',
  'salmon',
  'tuna',
  'cod',
  'tilapia',
  'shrimp',
  'prawn',
  'tofu',
  'tempeh',
  'seitan',
  'egg',
  'lentil',
  'bean',
  'chickpea',
  'edamame',
  'quinoa',
  'cottage cheese',
  'greek yogurt',
  'paneer',
  'halloumi',
];

function hasProteinSource(ingredientNames: string[]): boolean {
  const lower = ingredientNames.map((n) => n.toLowerCase());
  return lower.some((name) =>
    PROTEIN_SOURCE_MARKERS.some((marker) => name.includes(marker)),
  );
}

export function scoreNutrition(
  input: NutritionScoreInput,
): NutritionScoreResult {
  const reasons: FailureReason[] = [];

  const macroEntries: Array<[keyof typeof input.macros, number]> = [
    ['calories', input.macros.calories],
    ['protein', input.macros.protein],
    ['carbs', input.macros.carbs],
    ['fat', input.macros.fat],
    ['fiber', input.macros.fiber],
  ];
  for (const [name, value] of macroEntries) {
    if (!value || value <= 0) {
      reasons.push({ axis: 'nutrition', code: 'macro_missing', detail: name });
    }
  }

  const populatedMicros = Object.values(input.micros).filter(
    (v) => typeof v === 'number' && v > 0,
  ).length;
  if (populatedMicros < MIN_MICROS) {
    reasons.push({
      axis: 'nutrition',
      code: 'micros_thin',
      detail: `${populatedMicros}/${MIN_MICROS}`,
    });
  }

  if (
    input.macros.protein > HIGH_PROTEIN_THRESHOLD_G &&
    !hasProteinSource(input.ingredientNames)
  ) {
    reasons.push({
      axis: 'nutrition',
      code: 'nutrition_implausible',
      detail: `${input.macros.protein}g protein, no protein source in ingredients`,
    });
  }

  const score = Math.max(0, 5 - reasons.length);
  return { score, reasons };
}
