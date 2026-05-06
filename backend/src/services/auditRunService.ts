// backend/src/services/auditRunService.ts
// ROADMAP 4.0 Tier D6 — Phase 1 audit run.
//
// Composes D2 axis scorers + D4 archetype assignment + D5 coverage to
// produce one row per recipe with quality bucket + isOnlyInstanceOf
// flag. **Hard rule: this service never writes to Recipe.** Phase 2
// (D7) is the triage that actually mutates anything.

import {
  AxisScores,
  computeComposite,
  FailureReason,
} from './recipeQualityScoreService';
import { Archetype } from '../data/cuisineArchetypeMatrix';

export type SuggestedAction =
  | 'keep'
  | 'improve'
  | 'review'
  | 'delete_candidate';

const KEEP_FLOOR = 80;
const IMPROVE_FLOOR = 50;
const REVIEW_FLOOR = 30;

export function bucketForComposite(composite: number): SuggestedAction {
  if (composite >= KEEP_FLOOR) return 'keep';
  if (composite >= IMPROVE_FLOOR) return 'improve';
  if (composite >= REVIEW_FLOOR) return 'review';
  return 'delete_candidate';
}

export interface AuditInputRecipe {
  recipeId: string;
  canonicalCuisine: string | null;
  subCuisine: string | null;
  archetype: Archetype | null;
  axes: AxisScores;
  /** Reasons surfaced by individual scorers — appended to composite reasons. */
  axisReasons: FailureReason[];
}

export interface AuditRow {
  recipeId: string;
  canonicalCuisine: string | null;
  subCuisine: string | null;
  archetype: Archetype | null;
  composite: number;
  imageScore: number | null;
  structureScore: number | null;
  nutritionScore: number | null;
  voiceScore: number | null;
  dedupeScore: number | null;
  safetyScore: number | null;
  failureReasons: FailureReason[];
  suggestedAction: SuggestedAction;
  isOnlyInstanceOf: boolean;
}

/**
 * Pure aggregation: given pre-scored recipes, produce one audit row each.
 * `isOnlyInstanceOf` is true when this recipe is the sole entry for its
 * (canonicalCuisine, archetype) slot — protects D7 from deleting the
 * only Senegalese maafe in the catalog.
 */
export function runAudit(inputs: AuditInputRecipe[]): AuditRow[] {
  // Count per (canonical, archetype) to compute isOnlyInstanceOf.
  const slotCounts = new Map<string, number>();
  for (const r of inputs) {
    if (!r.canonicalCuisine || !r.archetype) continue;
    const key = `${r.canonicalCuisine} ${r.archetype}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  }

  return inputs.map((r) => {
    const { composite, failureReasons } = computeComposite(r.axes);
    const allReasons = [...failureReasons, ...r.axisReasons];
    const slotKey =
      r.canonicalCuisine && r.archetype
        ? `${r.canonicalCuisine} ${r.archetype}`
        : null;
    const isOnlyInstanceOf =
      slotKey !== null && (slotCounts.get(slotKey) ?? 0) === 1;

    return {
      recipeId: r.recipeId,
      canonicalCuisine: r.canonicalCuisine,
      subCuisine: r.subCuisine,
      archetype: r.archetype,
      composite,
      imageScore: r.axes.image ?? null,
      structureScore: r.axes.structure ?? null,
      nutritionScore: r.axes.nutrition ?? null,
      voiceScore: r.axes.voice ?? null,
      dedupeScore: r.axes.dedupe ?? null,
      safetyScore: r.axes.safety ?? null,
      failureReasons: allReasons,
      suggestedAction: bucketForComposite(composite),
      isOnlyInstanceOf,
    };
  });
}

export function auditRowsToCsv(rows: AuditRow[]): string {
  const header = [
    'recipe_id',
    'canonical_cuisine',
    'sub_cuisine',
    'archetype',
    'composite',
    'image_score',
    'structure_score',
    'nutrition_score',
    'voice_score',
    'dedupe_score',
    'safety_score',
    'suggested_action',
    'is_only_instance_of',
    'failure_codes',
  ].join(',');

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const body = rows
    .map((r) =>
      [
        r.recipeId,
        r.canonicalCuisine ?? '',
        r.subCuisine ?? '',
        r.archetype ?? '',
        r.composite.toFixed(2),
        r.imageScore ?? '',
        r.structureScore ?? '',
        r.nutritionScore ?? '',
        r.voiceScore ?? '',
        r.dedupeScore ?? '',
        r.safetyScore ?? '',
        r.suggestedAction,
        r.isOnlyInstanceOf ? 'true' : 'false',
        r.failureReasons.map((f) => f.code).join('|'),
      ]
        .map(escape)
        .join(','),
    )
    .join('\n');

  return `${header}\n${body}\n`;
}
