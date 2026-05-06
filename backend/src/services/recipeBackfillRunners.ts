// backend/src/services/recipeBackfillRunners.ts
// ROADMAP 4.0 Tier D8 — Improve-bucket backfill runners.
//
// Three idempotent runners for the most common improvement actions
// flagged by D7 triage: regenerate image, refresh nutrition aggregate,
// rewrite copy. Each is adapter-injectable (production wires real
// image-gen/FDC/Claude; tests inject in-memory mocks).
//
// Non-destructive guarantees:
// - image runner refuses regression (new score < current → no-op)
// - nutrition runner skips when FDC data unchanged (idempotent)
// - copy rewrite preserves ingredients + instructions + cook times
//   verbatim — only prose fields (title + description) can change

export type BackfillOutcome = 'updated' | 'skipped' | 'failed';

export interface BackfillResult {
  recipeId: string;
  outcome: BackfillOutcome;
  oldScore: number | null;
  newScore: number | null;
  reason: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Image backfill
// ──────────────────────────────────────────────────────────────────────────

export interface BackfillImageDeps {
  fetchCurrent: (
    recipeId: string,
  ) => Promise<{ imageUrl: string | null; currentScore: number | null }>;
  generateImage: (recipeId: string) => Promise<string>;
  scoreImage: (imageUrl: string) => Promise<number>;
  updateImage: (recipeId: string, imageUrl: string) => Promise<void>;
}

export async function backfillImage(
  recipeId: string,
  deps: BackfillImageDeps,
): Promise<BackfillResult> {
  if (!recipeId) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: null,
      newScore: null,
      reason: 'empty recipeId',
    };
  }
  let current: { imageUrl: string | null; currentScore: number | null };
  try {
    current = await deps.fetchCurrent(recipeId);
  } catch (e) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: null,
      newScore: null,
      reason: `fetch failed: ${(e as Error).message}`,
    };
  }

  let newUrl: string;
  try {
    newUrl = await deps.generateImage(recipeId);
  } catch (e) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: current.currentScore,
      newScore: null,
      reason: `generate failed: ${(e as Error).message}`,
    };
  }

  const newScore = await deps.scoreImage(newUrl);
  const oldScore = current.currentScore ?? 0;
  if (newScore < oldScore) {
    return {
      recipeId,
      outcome: 'skipped',
      oldScore,
      newScore,
      reason: `regression refused (${newScore} < ${oldScore})`,
    };
  }
  await deps.updateImage(recipeId, newUrl);
  return {
    recipeId,
    outcome: 'updated',
    oldScore,
    newScore,
    reason: `image replaced (${oldScore} → ${newScore})`,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Nutrition backfill
// ──────────────────────────────────────────────────────────────────────────

export interface NutritionAggregate {
  /** Stable hash representing the FDC inputs used to compute this aggregate. */
  inputHash: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface BackfillNutritionDeps {
  fetchCurrent: (
    recipeId: string,
  ) => Promise<NutritionAggregate | null>;
  recompute: (recipeId: string) => Promise<NutritionAggregate>;
  updateAggregate: (
    recipeId: string,
    aggregate: NutritionAggregate,
  ) => Promise<void>;
}

export async function backfillNutrition(
  recipeId: string,
  deps: BackfillNutritionDeps,
): Promise<BackfillResult> {
  if (!recipeId) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: null,
      newScore: null,
      reason: 'empty recipeId',
    };
  }
  const current = await deps.fetchCurrent(recipeId);
  let next: NutritionAggregate;
  try {
    next = await deps.recompute(recipeId);
  } catch (e) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: current?.score ?? null,
      newScore: null,
      reason: `recompute failed: ${(e as Error).message}`,
    };
  }
  if (current && current.inputHash === next.inputHash) {
    return {
      recipeId,
      outcome: 'skipped',
      oldScore: current.score,
      newScore: next.score,
      reason: 'FDC inputs unchanged — idempotent skip',
    };
  }
  await deps.updateAggregate(recipeId, next);
  return {
    recipeId,
    outcome: 'updated',
    oldScore: current?.score ?? null,
    newScore: next.score,
    reason: `nutrition refreshed (${current?.score ?? 'n/a'} → ${next.score})`,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Copy rewrite
// ──────────────────────────────────────────────────────────────────────────

export interface RecipeCopySnapshot {
  title: string;
  description: string;
  // Non-prose fields the rewriter must NOT change.
  ingredients: ReadonlyArray<{ name: string; quantity: string; unit: string }>;
  instructions: ReadonlyArray<string>;
  cookTimeMin: number;
  prepTimeMin: number;
}

export interface RewrittenCopy {
  title: string;
  description: string;
  voiceScore: number;
}

export interface RewriteCopyDeps {
  fetchRecipe: (recipeId: string) => Promise<RecipeCopySnapshot>;
  rewrite: (input: RecipeCopySnapshot) => Promise<RewrittenCopy>;
  /** Score the rewritten copy via D2.4. */
  scoreVoice: (input: { title: string; description: string }) => Promise<number>;
  updateCopy: (
    recipeId: string,
    next: { title: string; description: string },
  ) => Promise<void>;
}

export async function rewriteCopy(
  recipeId: string,
  deps: RewriteCopyDeps,
): Promise<BackfillResult> {
  if (!recipeId) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore: null,
      newScore: null,
      reason: 'empty recipeId',
    };
  }
  const before = await deps.fetchRecipe(recipeId);
  const oldScore = await deps.scoreVoice({
    title: before.title,
    description: before.description,
  });

  let next: RewrittenCopy;
  try {
    next = await deps.rewrite(before);
  } catch (e) {
    return {
      recipeId,
      outcome: 'failed',
      oldScore,
      newScore: null,
      reason: `rewrite failed: ${(e as Error).message}`,
    };
  }

  if (next.voiceScore < oldScore) {
    return {
      recipeId,
      outcome: 'skipped',
      oldScore,
      newScore: next.voiceScore,
      reason: `regression refused (${next.voiceScore} < ${oldScore})`,
    };
  }

  await deps.updateCopy(recipeId, {
    title: next.title,
    description: next.description,
  });
  return {
    recipeId,
    outcome: 'updated',
    oldScore,
    newScore: next.voiceScore,
    reason: `copy rewritten (${oldScore} → ${next.voiceScore})`,
  };
}

/**
 * Verifies a rewriter's output preserves the non-prose fields exactly.
 * Callers can use this as a pre-flight check before persisting a
 * rewrite — guards against an LLM that hallucinates ingredient changes.
 */
export function preservesRecipeSubstance(
  before: RecipeCopySnapshot,
  after: RecipeCopySnapshot,
): boolean {
  if (before.cookTimeMin !== after.cookTimeMin) return false;
  if (before.prepTimeMin !== after.prepTimeMin) return false;
  if (before.ingredients.length !== after.ingredients.length) return false;
  if (before.instructions.length !== after.instructions.length) return false;
  for (let i = 0; i < before.ingredients.length; i++) {
    const a = before.ingredients[i];
    const b = after.ingredients[i];
    if (a.name !== b.name || a.quantity !== b.quantity || a.unit !== b.unit) {
      return false;
    }
  }
  for (let i = 0; i < before.instructions.length; i++) {
    if (before.instructions[i] !== after.instructions[i]) return false;
  }
  return true;
}
