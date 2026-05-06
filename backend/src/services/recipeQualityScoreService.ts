// backend/src/services/recipeQualityScoreService.ts
// ROADMAP 4.0 Tier D2 — Recipe quality scorecard.
//
// Composite (0-100) of six content-only axes — engagement signals are
// deliberately excluded so quality scoring never tautologically narrows
// the catalog. Individual axis scorers ship in D2.1-D2.5; this module is
// the orchestrator that composes their outputs and persists them.

import { prisma } from '../lib/prisma';

export type AxisName =
  | 'image'
  | 'structure'
  | 'nutrition'
  | 'voice'
  | 'dedupe'
  | 'safety';

export interface AxisScores {
  image?: number;
  structure?: number;
  nutrition?: number;
  voice?: number;
  dedupe?: number;
  safety?: number;
}

export interface FailureReason {
  axis: AxisName;
  code: string;
  detail?: string;
}

export interface CompositeResult {
  composite: number;
  failureReasons: FailureReason[];
}

const AXIS_WEIGHTS: Record<AxisName, number> = {
  image: 25,
  structure: 25,
  nutrition: 15,
  voice: 15,
  dedupe: 10,
  safety: 10,
};

const ALL_AXES: AxisName[] = [
  'image',
  'structure',
  'nutrition',
  'voice',
  'dedupe',
  'safety',
];

const AXIS_MAX = 5;

function assertAxisRange(axis: AxisName, value: number): void {
  if (value < 0 || value > AXIS_MAX) {
    throw new Error(
      `recipeQualityScoreService: axis "${axis}" value ${value} out of range [0, ${AXIS_MAX}]`,
    );
  }
}

/**
 * Pure weighted-average composite over the axes that were actually provided.
 * Missing axes are excluded from the denominator and recorded as
 * `axis_unavailable` failure reasons. Returns 0 when no axes are provided.
 */
export function computeComposite(axes: AxisScores): CompositeResult {
  const failureReasons: FailureReason[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const axis of ALL_AXES) {
    const raw = axes[axis];
    if (raw === undefined || raw === null) {
      failureReasons.push({ axis, code: 'axis_unavailable' });
      continue;
    }
    assertAxisRange(axis, raw);
    const weight = AXIS_WEIGHTS[axis];
    weightedSum += (raw / AXIS_MAX) * weight;
    weightTotal += weight;
  }

  const composite =
    weightTotal === 0 ? 0 : (weightedSum / weightTotal) * 100;
  return { composite, failureReasons };
}

export interface ScoreRecipeInput {
  recipeId: string;
  axes: AxisScores;
  /** Caller-supplied reasons (e.g., per-axis diagnostic codes from D2.1-D2.5). */
  extraReasons?: FailureReason[];
}

export interface RecipeQualityScoreRecord {
  id: string;
  recipeId: string;
  composite: number;
  imageScore: number | null;
  structureScore: number | null;
  nutritionScore: number | null;
  voiceScore: number | null;
  dedupeScore: number | null;
  safetyScore: number | null;
  failureReasons: string;
  scoredAt: Date;
}

/**
 * Compute composite + persist via idempotent upsert keyed on `recipeId`.
 * Re-running with the same input produces the same composite + advances
 * `scoredAt`.
 */
export async function scoreRecipe(
  input: ScoreRecipeInput,
): Promise<RecipeQualityScoreRecord> {
  if (!input.recipeId) {
    throw new Error('recipeQualityScoreService.scoreRecipe: recipeId required');
  }

  const { composite, failureReasons } = computeComposite(input.axes);
  const allReasons: FailureReason[] = [
    ...failureReasons,
    ...(input.extraReasons ?? []),
  ];
  const reasonsJson = JSON.stringify(allReasons);

  const data = {
    composite,
    imageScore: input.axes.image ?? null,
    structureScore: input.axes.structure ?? null,
    nutritionScore: input.axes.nutrition ?? null,
    voiceScore: input.axes.voice ?? null,
    dedupeScore: input.axes.dedupe ?? null,
    safetyScore: input.axes.safety ?? null,
    failureReasons: reasonsJson,
    scoredAt: new Date(),
  };

  const row = await prisma.recipeQualityScore.upsert({
    where: { recipeId: input.recipeId },
    create: { recipeId: input.recipeId, ...data },
    update: data,
  });

  return row as RecipeQualityScoreRecord;
}
