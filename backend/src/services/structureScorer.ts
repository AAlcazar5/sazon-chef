// backend/src/services/structureScorer.ts
// ROADMAP 4.0 Tier D2.2 — Structural completeness scorer.
//
// Pure function over a recipe shape. Returns 5 for well-formed recipes;
// each detected defect knocks 1 point off (floored at 0). Defects include
// missing ingredient quantities/units, instruction word count outside
// [80, 600], step count outside [3, 12], orphaned ingredients (never
// referenced in instructions), and missing/inconsistent time fields.

import type { FailureReason } from './recipeQualityScoreService';

export interface StructureIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface StructureInput {
  ingredients: StructureIngredient[];
  instructions: string[];
  prepTimeMin: number;
  cookTimeMin: number;
  totalTimeMin: number;
}

export interface StructureScoreResult {
  score: number;
  reasons: FailureReason[];
}

const MIN_WORDS = 80;
const MAX_WORDS = 600;
const MIN_STEPS = 3;
const MAX_STEPS = 12;
const TIME_TOLERANCE_MIN = 5;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function scoreStructure(input: StructureInput): StructureScoreResult {
  const reasons: FailureReason[] = [];

  if (input.ingredients.length === 0) {
    reasons.push({ axis: 'structure', code: 'ingredients_empty' });
  }

  for (const ing of input.ingredients) {
    if (!ing.quantity || ing.quantity.trim().length === 0) {
      reasons.push({
        axis: 'structure',
        code: 'ingredient_missing_quantity',
        detail: ing.name,
      });
    }
    if (!ing.unit || ing.unit.trim().length === 0) {
      reasons.push({
        axis: 'structure',
        code: 'ingredient_missing_unit',
        detail: ing.name,
      });
    }
  }

  const allInstructions = input.instructions.join(' ');
  const wordCount = countWords(allInstructions);
  if (wordCount < MIN_WORDS) {
    reasons.push({
      axis: 'structure',
      code: 'instructions_too_short',
      detail: `${wordCount} words`,
    });
  } else if (wordCount > MAX_WORDS) {
    reasons.push({
      axis: 'structure',
      code: 'instructions_too_long',
      detail: `${wordCount} words`,
    });
  }

  const stepCount = input.instructions.length;
  if (stepCount < MIN_STEPS || stepCount > MAX_STEPS) {
    reasons.push({
      axis: 'structure',
      code: 'step_count_out_of_range',
      detail: `${stepCount} steps`,
    });
  }

  const instructionsLower = allInstructions.toLowerCase();
  for (const ing of input.ingredients) {
    const name = ing.name.trim().toLowerCase();
    if (!name) continue;
    // Match the head noun (first word) — "chicken thigh" should match "chicken" in instructions.
    const head = name.split(/\s+/)[0];
    if (!instructionsLower.includes(head)) {
      reasons.push({
        axis: 'structure',
        code: 'ingredient_unreferenced',
        detail: ing.name,
      });
    }
  }

  const { prepTimeMin, cookTimeMin, totalTimeMin } = input;
  if (cookTimeMin <= 0 || totalTimeMin <= 0) {
    reasons.push({ axis: 'structure', code: 'time_missing' });
  } else if (
    prepTimeMin > 0 &&
    Math.abs(prepTimeMin + cookTimeMin - totalTimeMin) > TIME_TOLERANCE_MIN
  ) {
    reasons.push({
      axis: 'structure',
      code: 'time_inconsistent',
      detail: `prep ${prepTimeMin} + cook ${cookTimeMin} ≠ total ${totalTimeMin}`,
    });
  }

  const score = Math.max(0, 5 - reasons.length);
  return { score, reasons };
}
