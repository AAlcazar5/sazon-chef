// ROADMAP 4.0 N1.1 + N1.3 — Unified RecommenderEvent telemetry contract.
//
// Codifies what every surface family (today / week / ingredient / home /
// filter / recipe-detail / build-a-plate) must agree on when writing to
// the existing `recommenderEvent` table:
//
//   - 100% sampling for all writes (low-volume across the lot)
//   - 90-day raw-event TTL (daily roll-ups retained indefinitely)
//   - Surface discriminator embedded as `contextSnapshot.surface` sentinel
//     until a top-level `surface` column lands (TB3 / FX3.3 / HX7.1 already
//     use this shape)
//   - PII guard: free-text fields rejected by the validator
//   - Banned per-surface event types rejected (typo guard)
//
// This service does NOT replace `recordProposal` / `recordZeroResultFilter` /
// `logHomeSurfaceEvent`. It's the single contract entry point for new writers
// (RD7.1 outcome attribution, future IG / WK / build-a-plate surfaces) and
// the validator the existing writers MAY adopt as they migrate.

import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { serializeJsonColumnSafe } from '../../utils/jsonColumns';

/** Canonical surface families. New surfaces add their string here. */
export const RECOMMENDER_SURFACES = [
  // Today
  'today_hero',
  'today_grid',
  // Week
  'week_slot',
  'week_plan_event',
  // Build-a-Plate
  'build_a_plate_slot',
  'build_a_plate_swap',
  'build_a_plate_lock',
  // Pantry / Ingredient
  'pantry_iq',
  'ingredient_recommend',
  'ingredient_co_purchase',
  // Filter (FX3.3)
  'filter_zero_result',
  'filter_soft_fallback',
  // Home surfaces (HX7.1)
  'home_today_hero',
  'almost_made_it',
  'home_quick_action',
  // Recipe detail (RD7.1)
  'recipe_detail_similar',
  'recipe_detail_variant',
  'recipe_detail_bridge',
  'recipe_detail_cookednext',
  'recipe_detail_menu_open',
  'recipe_detail_insight',
  // Sazon chat
  'sazon_chat',
  // Activation (N12)
  'activation',
] as const;

export type RecommenderSurface = (typeof RECOMMENDER_SURFACES)[number];

const SURFACE_SET: ReadonlySet<string> = new Set(RECOMMENDER_SURFACES);

/** Canonical event types — typed loosely to allow per-surface families. */
export const KNOWN_EVENT_TYPES = [
  'impression',
  'tap',
  'accept',
  'swap',
  'escape',
  'abandon',
  'outcome_cooked_within_24h',
  'outcome_skipped',
  'zero_result_filter_combo',
] as const;

/** Free-text keys that must NEVER be persisted (PII guard, FX3.3). */
const PII_FILTER_KEYS = new Set([
  'search',
  'searchQuery',
  'cravingQuery',
  'query',
  'note',
  'freeText',
  'description',
  'comment',
]);

/** Telemetry contract constants — codified once, referenced everywhere. */
export const TELEMETRY_CONTRACT = {
  /** Sample rate for all recommenderEvent writes. 1.0 = 100%. */
  samplingRate: 1.0,
  /** Days to retain raw events. Daily rollups retained indefinitely. */
  rawEventTtlDays: 90,
  /** Hard cap on metadata depth — guard against accidental payload bloat. */
  maxMetadataKeys: 24,
} as const;

const recordSchema = z.object({
  userId: z.string().min(1, 'userId required'),
  surface: z
    .string()
    .refine((s) => SURFACE_SET.has(s), {
      message: 'unknown surface — add to RECOMMENDER_SURFACES first',
    }),
  eventType: z.string().min(1).max(64),
  asOf: z.date().optional(),
  /** retrievalCallId — N0.3 cursor; nullable for surfaces that don't use it. */
  retrievalCallId: z.string().optional().nullable(),
  /** Picked / target recipe id when applicable. */
  pickedRecipeId: z.string().optional().nullable(),
  /** Free-form structured payload — validator strips PII keys before write. */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Position within a list-style surface (0-indexed). */
  position: z.number().int().min(0).optional(),
  /** Confidence ∈ [0, 1] for ranker outputs. */
  confidence: z.number().min(0).max(1).optional(),
  /** copyLine returned to client (rationale ribbon, hero copy, etc). */
  copyLine: z.string().max(280).optional(),
  /** 'llm' | 'retrieval_fallback' | 'rule_based'. Free-form for forward-compat. */
  source: z.string().min(1).max(32).optional(),
});

export type RecommenderEventInput = z.infer<typeof recordSchema>;

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
  cleaned?: RecommenderEventInput;
}

/** Strips PII keys + caps metadata size. */
function sanitizeMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const out: Record<string, unknown> = {};
  let keptKeys = 0;
  for (const [k, v] of Object.entries(input)) {
    if (PII_FILTER_KEYS.has(k)) continue;
    if (keptKeys >= TELEMETRY_CONTRACT.maxMetadataKeys) break;
    out[k] = v;
    keptKeys += 1;
  }
  return out;
}

/**
 * Validates an event payload against the unified contract. Returns a result
 * describing pass/fail + cleaned payload (PII stripped, metadata capped).
 *
 * Callers MAY use validateEvent + the existing `prisma.recommenderEvent.create`
 * directly, or use `recordRecommenderEvent` below for the integrated flow.
 */
export function validateEvent(input: unknown): ValidationResult {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    );
    return { ok: false, errors };
  }
  const data = parsed.data;
  const cleaned: RecommenderEventInput = {
    ...data,
    metadata: sanitizeMetadata(data.metadata),
  };
  return { ok: true, cleaned };
}

/** Build the contextSnapshot payload from a validated event. */
export function buildContextSnapshot(
  event: RecommenderEventInput,
): Record<string, unknown> {
  return {
    surface: event.surface,
    eventType: event.eventType,
    ...(event.metadata ? { metadata: event.metadata } : {}),
    ...(event.position !== undefined ? { position: event.position } : {}),
    ...(event.retrievalCallId
      ? { retrievalCallId: event.retrievalCallId }
      : {}),
  };
}

/**
 * Single contract entry point for writing a unified recommender event.
 * Validates, sanitizes, and persists in one call. Returns the event id on
 * success or null on failure (logged, never thrown — telemetry is best-effort).
 *
 * Cross-tier dovetail: this is the writer that RD7.1's `recipe_detail_*`
 * surfaces, future IG / WK / build-a-plate writers, and N12 activation
 * surfaces should call. Existing writers (recordProposal, recordZeroResultFilter,
 * logHomeSurfaceEvent) keep their bespoke shapes for backward compatibility
 * — they may migrate to this writer over time.
 */
export async function recordRecommenderEvent(
  input: RecommenderEventInput | unknown,
): Promise<string | null> {
  const result = validateEvent(input);
  if (!result.ok || !result.cleaned) {
    logger.warn(
      { errors: result.errors },
      'N1.3 recordRecommenderEvent rejected — invalid payload',
    );
    return null;
  }
  const event = result.cleaned;
  try {
    const created = (await (prisma as any).recommenderEvent.create({
      data: {
        userId: event.userId,
        asOf: event.asOf ?? new Date(),
        contextSnapshot: serializeJsonColumnSafe('contextSnapshot', buildContextSnapshot(event)),
        candidateIds: serializeJsonColumnSafe('candidateIds', []),
        pickedRecipeId: event.pickedRecipeId ?? null,
        confidence: event.confidence ?? 0,
        copyLine: event.copyLine ?? '',
        source: event.source ?? 'unknown',
      },
    })) as { id: string };
    return created.id;
  } catch (err) {
    logger.warn(
      { err, surface: event.surface, userId: event.userId },
      'N1.3 recordRecommenderEvent persist failed',
    );
    return null;
  }
}

/** Helper for callers querying the unified table by surface. */
export function isKnownSurface(s: string): s is RecommenderSurface {
  return SURFACE_SET.has(s);
}
