// ROADMAP 4.0 N7.1 — Build-a-Plate ↔ sazonBrain bridge.
//
// `composedPlateService` and `composedPlateVariationService` currently rank
// slot candidates with their own logic. This bridge routes that decision
// through `sazonBrain.recommend({ surface: 'build_a_plate_slot' })` so the
// moat feature uses the same ranker + cross-cutting boosts (pantry coverage,
// expiring items, friend cohort) as the rest of the app.
//
// Today: the brain stub returns `ranker_unavailable` for build_a_plate_slot
// (the host-tier ranker hasn't shipped). Callers automatically fall back
// to the legacy logic via `legacyFallback`.
// Future: HX ships the build_a_plate slot ranker → bridge transparently
// routes through it without caller changes.

import { recommend } from './recommender/sazonBrain';
import { logger } from '../utils/logger';

export interface SlotRecommendation {
  recipeId: string;
  score: number;
}

export interface BridgeRecommendInput<TFallback> {
  userId: string;
  /** Slot identifier (e.g., 'protein', 'starch', 'side'). */
  slot: string;
  /** Composed-plate state for context. Forwarded to the brain. */
  plateState?: Record<string, unknown>;
  /**
   * Legacy ranking logic — invoked when the brain returns
   * `ranker_unavailable` or `fallbackUsed: true`. This is the existing
   * `composedPlateService` path that worked before N7.1.
   */
  legacyFallback: () => Promise<TFallback>;
}

export interface BridgeResult<TFallback> {
  /** True when the brain returned candidates; false when we fell back. */
  fromBrain: boolean;
  /** Brain candidates (when fromBrain=true). */
  candidates?: SlotRecommendation[];
  /** Legacy result (when fromBrain=false). */
  fallback?: TFallback;
  /** Source label for telemetry (e.g., 'ranker_unavailable'). */
  source: string;
}

/**
 * Try the brain first; on `ranker_unavailable` or `fallbackUsed`, invoke
 * `legacyFallback`. Telemetry-friendly — caller can log `result.source`.
 */
export async function recommendSlotViaBrain<TFallback>(
  input: BridgeRecommendInput<TFallback>,
): Promise<BridgeResult<TFallback>> {
  if (!input.userId) {
    const fallback = await input.legacyFallback();
    return { fromBrain: false, fallback, source: 'legacy_no_user' };
  }
  try {
    const result = await recommend({
      surface: 'build_a_plate_slot',
      userId: input.userId,
    });
    if (result.fallbackUsed || result.candidates.length === 0) {
      const fallback = await input.legacyFallback();
      return { fromBrain: false, fallback, source: result.source };
    }
    return {
      fromBrain: true,
      candidates: result.candidates.map((c) => ({
        recipeId: c.recipeId,
        score: c.score,
      })),
      source: result.source,
    };
  } catch (err) {
    logger.warn(
      { err, userId: input.userId, slot: input.slot },
      'N7.1 brain call failed — falling back to legacy',
    );
    const fallback = await input.legacyFallback();
    return { fromBrain: false, fallback, source: 'legacy_brain_error' };
  }
}
