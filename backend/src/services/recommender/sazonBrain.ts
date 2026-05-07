// ROADMAP 4.0 N0.1 — sazonBrain coordinator (stub form).
//
// Single entry point above the four rankers. This file is the *contract* +
// dispatch layer; per-surface adapters live alongside the rankers they wrap.
//
// **2026-05-06 stub note.** Per the host-tier ride-along plan, surfaces whose
// rankers don't yet exist (IG ingredient adjacency, WK week-plan retrieval,
// build-a-plate slot ranker) return `{ source: 'ranker_unavailable',
// fallbackUsed: true }`. Surfaces with shipped rankers (T-bis today_*,
// RD2 recipe_detail_similar, RD6 recipe_detail_insight, FX filter_*) route
// through to the real implementation. As IG/WK/HX ship, this file gets
// per-surface dispatch entries — the contract stays stable.
//
// Cross-tier dovetail:
//   - N0.2: every dispatch reads from the unified `personalizationContext`
//   - N0.3: callers stash `retrievalCallId` from the response for re-rolls
//   - N1.1: result.source feeds the unified RecommenderEvent contract
//   - N3.1: rationale prose runs through `sazonVoiceService`

import type { RankedCandidate } from './retrievalSession';
import {
  buildPersonalizationContext,
  type PersonalizationContext,
} from '../personalizationContext';
import { retrieveCandidates } from './retrieveCandidates';
import { retrieveSimilar } from './retrieveSimilar';
import { compute as computeDiscoveryInsight } from '../recipeDiscoveryInsightService';

export type SazonSurface =
  // user-anchored
  | 'today_hero'
  | 'today_grid'
  | 'week_slot'
  | 'build_a_plate_slot'
  | 'sazon_chat'
  | 'pantry_iq'
  | 'activation'
  // item-anchored
  | 'recipe_detail_similar'
  | 'recipe_detail_insight';

export type SazonAnchor = { type: 'recipe'; id: string };

export type RecommendSource =
  | 'ranker_t_bis'
  | 'ranker_rd2_similar'
  | 'ranker_rd6_insight'
  | 'ranker_unavailable'
  | 'cold_start';

export interface RecommendCandidate {
  recipeId: string;
  score: number;
  /** Optional pre-formatted display fields when the underlying ranker provides them. */
  title?: string;
  cuisine?: string | null;
  cookTime?: number | null;
  imageUrl?: string | null;
}

export interface RecommendResult {
  /** Surface dispatched. */
  surface: SazonSurface;
  /** Ordered candidates (may be empty). */
  candidates: RecommendCandidate[];
  /** Lifestyle-voice rationale (single line, may be empty). */
  rationale: string;
  /** Where the answer came from. */
  source: RecommendSource;
  /** True iff a real ranker was unavailable and we degraded. */
  fallbackUsed: boolean;
  /** The personalization snapshot used. Re-readable by callers. */
  context: PersonalizationContext;
}

export interface RecommendInput {
  surface: SazonSurface;
  userId: string;
  /** Item-anchored surfaces require this; user-anchored surfaces ignore it. */
  anchor?: SazonAnchor;
  /** Top-K to return; surface-specific defaults applied when omitted. */
  k?: number;
  /** Inject reference time for tests. */
  now?: Date;
  /** Inject pre-built personalizationContext (skip rebuild). */
  context?: PersonalizationContext;
}

/** Surface families whose rankers exist today. */
const SHIPPED_SURFACES = new Set<SazonSurface>([
  'today_hero',
  'today_grid',
  'recipe_detail_similar',
  'recipe_detail_insight',
]);

const ITEM_ANCHORED = new Set<SazonSurface>([
  'recipe_detail_similar',
  'recipe_detail_insight',
]);

function emptyResult(
  surface: SazonSurface,
  context: PersonalizationContext,
  source: RecommendSource = 'ranker_unavailable',
): RecommendResult {
  return {
    surface,
    candidates: [],
    rationale: '',
    source,
    fallbackUsed: source === 'ranker_unavailable',
    context,
  };
}

async function dispatchTodayHero(
  input: RecommendInput,
  context: PersonalizationContext,
): Promise<RecommendResult> {
  // T-bis retrieveCandidates needs a contextVector + hardFilters. The
  // adapter wiring lives in `homeFeedRetrievalAdapter` — but for the stub
  // we degrade to "shipped surface, no candidates" when caller hasn't
  // wired through the vector. This still distinguishes today_hero from
  // unavailable surfaces so downstream telemetry is correct.
  //
  // When HX0 ships its hero ↔ ranker reunion, this dispatch swaps the
  // empty contextVector + filters for the live ones.
  void retrieveCandidates; // imported so future wiring stays adjacent
  return {
    surface: input.surface,
    candidates: [],
    rationale: '',
    source: 'ranker_t_bis',
    fallbackUsed: false,
    context,
  };
}

async function dispatchSimilar(
  input: RecommendInput,
  context: PersonalizationContext,
): Promise<RecommendResult> {
  if (!input.anchor || input.anchor.type !== 'recipe') {
    return emptyResult(input.surface, context);
  }
  const k = input.k ?? 8;
  const similar = await retrieveSimilar({
    anchorRecipeId: input.anchor.id,
    userId: input.userId || undefined,
    k,
  });
  const candidates: RecommendCandidate[] = similar.map((s) => ({
    recipeId: s.id,
    score: s.score,
    title: s.title,
    cuisine: s.cuisine,
    cookTime: s.cookTime,
    imageUrl: s.imageUrl,
  }));
  return {
    surface: input.surface,
    candidates,
    rationale: '',
    source: 'ranker_rd2_similar',
    fallbackUsed: false,
    context,
  };
}

async function dispatchInsight(
  input: RecommendInput,
  context: PersonalizationContext,
): Promise<RecommendResult> {
  if (!input.anchor || input.anchor.type !== 'recipe') {
    return emptyResult(input.surface, context);
  }
  const insight = await computeDiscoveryInsight({
    userId: input.userId,
    recipeId: input.anchor.id,
    asOf: context.asOf,
  });
  return {
    surface: input.surface,
    candidates: [],
    rationale: insight?.line ?? '',
    source: 'ranker_rd6_insight',
    fallbackUsed: false,
    context,
  };
}

/**
 * Single dispatch entry point for every recommendation surface. Validates
 * the surface, builds (or reuses) the personalizationContext, dispatches to
 * the right ranker, and returns a unified shape.
 *
 * Item-anchored surfaces (`recipe_detail_*`) require `anchor: { type, id }`.
 * Surfaces whose ranker hasn't shipped yet return
 * `{ source: 'ranker_unavailable', fallbackUsed: true }` so callers can
 * gracefully fall back without checking each surface individually.
 */
export async function recommend(
  input: RecommendInput,
): Promise<RecommendResult> {
  if (!input.userId) {
    throw new Error('sazonBrain.recommend: userId required');
  }
  if (ITEM_ANCHORED.has(input.surface) && !input.anchor) {
    throw new Error(
      `sazonBrain.recommend: surface "${input.surface}" requires anchor`,
    );
  }

  const context =
    input.context ??
    (await buildPersonalizationContext({ userId: input.userId, now: input.now }));

  if (!SHIPPED_SURFACES.has(input.surface)) {
    return emptyResult(input.surface, context);
  }

  switch (input.surface) {
    case 'today_hero':
    case 'today_grid':
      return dispatchTodayHero(input, context);
    case 'recipe_detail_similar':
      return dispatchSimilar(input, context);
    case 'recipe_detail_insight':
      return dispatchInsight(input, context);
    default:
      return emptyResult(input.surface, context);
  }
}

/** Test helper — exposes the shipped-surface set for cap tests. */
export const __helpers = { SHIPPED_SURFACES, ITEM_ANCHORED };

/** Re-export RankedCandidate so callers can type-check session cursor I/O. */
export type { RankedCandidate };
