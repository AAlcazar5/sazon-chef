// ROADMAP 4.0 N10.1 — Sazon tab ↔ sazonBrain bridge.
//
// When the user asks Sazon "what should I cook tonight," the answer should
// match Today's hero (or explicitly diverge with a rationale — "you said
// earlier you wanted Mexican, so I'm offering tacos instead of the Persian
// pick on Today"). Today the coach has no awareness of the hero pick.
// Eliminates the "two disagreeing assistants" risk.
//
// Today: brain stub returns `ranker_unavailable` for `sazon_chat`. Callers
// fall through to `legacyFallback` (the existing coachService prompt path).
// Future: S4 ships the brain integration; bridge routes through with no
// caller change.

import { recommend } from './recommender/sazonBrain';
import { logger } from '../utils/logger';

export interface CoachRecipeRec {
  recipeId: string;
  /** Optional rationale string. When the brain returns one, it's surfaced
   *  alongside the recipe so the coach can explain the pick. */
  rationale?: string;
}

export interface CoachBridgeInput<TFallback> {
  userId: string;
  /**
   * Legacy coach path — invoked when the brain returns `ranker_unavailable`
   * or `fallbackUsed: true`. This is the prompt-driven coachService path.
   */
  legacyFallback: () => Promise<TFallback>;
}

export interface CoachBridgeResult<TFallback> {
  fromBrain: boolean;
  /** Top brain pick (when fromBrain=true). */
  pick?: CoachRecipeRec;
  /** All brain candidates (when fromBrain=true) — caller can rank further. */
  candidates?: CoachRecipeRec[];
  /** Legacy result (when fromBrain=false). */
  fallback?: TFallback;
  source: string;
}

export async function recommendCoachReplyViaBrain<TFallback>(
  input: CoachBridgeInput<TFallback>,
): Promise<CoachBridgeResult<TFallback>> {
  if (!input.userId) {
    const fallback = await input.legacyFallback();
    return { fromBrain: false, fallback, source: 'legacy_no_user' };
  }
  try {
    const result = await recommend({
      surface: 'sazon_chat',
      userId: input.userId,
    });
    if (result.fallbackUsed || result.candidates.length === 0) {
      const fallback = await input.legacyFallback();
      return { fromBrain: false, fallback, source: result.source };
    }
    const candidates: CoachRecipeRec[] = result.candidates.map((c) => ({
      recipeId: c.recipeId,
      rationale: result.rationale || undefined,
    }));
    return {
      fromBrain: true,
      pick: candidates[0],
      candidates,
      source: result.source,
    };
  } catch (err) {
    logger.warn(
      { err, userId: input.userId },
      'N10.1 brain call failed — falling back to legacy coach',
    );
    const fallback = await input.legacyFallback();
    return { fromBrain: false, fallback, source: 'legacy_brain_error' };
  }
}
