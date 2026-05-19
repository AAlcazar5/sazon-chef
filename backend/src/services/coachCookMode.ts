// backend/src/services/coachCookMode.ts
// W-C1 — Free-tier DeepSeek + cost-ceiling degrade.
//
// Two jobs, both deterministic and provider-spy-provable:
//
//  1. Provider order for a cook turn. Free tier cooks on DeepSeek-V3 (cheap;
//     cook prompts carry no PII — step text + quantities only, never the
//     personalized profile). Premium stays Anthropic (brand voice + tool
//     reliability are non-negotiable on the paid surface). COACH_LLM_PROVIDER
//     still hard-overrides for E2E / local dev.
//
//  2. The cost-ceiling degrade. Step navigation and recipe scaling are ALWAYS
//     deterministic (W-A2 owns the scale math; the LLM must never compute
//     quantities). So when `coachCostCeilingService` trips, the cook is NOT
//     stranded: they can still step through the recipe and scale it with
//     ZERO provider calls. Only freeform Q&A needs the model — and when the
//     ceiling is tripped that degrades to the deterministic surface rather
//     than spending a call we don't have.

import type { CoachTier } from './coachService';
import {
  scaleIngredients,
  scaleRecipeToTarget,
  type ScalableIngredient,
} from '../utils/scaleRecipe';

export type CookProviderId =
  | 'anthropic'
  | 'deepseek'
  | 'openrouter-gemini'
  | 'gemini-direct';

const FORCEABLE: ReadonlySet<string> = new Set([
  'anthropic',
  'deepseek',
  'openrouter-gemini',
  'gemini-direct',
]);

export function resolveCookProviderOrder(tier: CoachTier): CookProviderId[] {
  const force = process.env.COACH_LLM_PROVIDER;
  if (force && FORCEABLE.has(force)) return [force as CookProviderId];
  if (tier === 'premium') return ['anthropic'];
  return ['deepseek', 'anthropic'];
}

// ── Deterministic cook ops (zero provider calls by construction) ──────────

export interface StepNavResult {
  index: number;
  step: string;
  isLast: boolean;
  isFirst: boolean;
}

export function navigateStep(
  steps: readonly string[],
  currentIndex: number,
  direction: 'next' | 'prev' | 'goto',
  gotoIndex?: number,
): StepNavResult {
  if (steps.length === 0) {
    throw new Error('cannot navigate an empty step list');
  }
  const clamp = (n: number): number =>
    Math.max(0, Math.min(steps.length - 1, n));
  let next: number;
  if (direction === 'next') next = clamp(currentIndex + 1);
  else if (direction === 'prev') next = clamp(currentIndex - 1);
  else next = clamp(gotoIndex ?? currentIndex);
  return {
    index: next,
    step: steps[next],
    isLast: next === steps.length - 1,
    isFirst: next === 0,
  };
}

export type CookOperation =
  | {
      kind: 'step-nav';
      steps: readonly string[];
      currentIndex: number;
      direction: 'next' | 'prev' | 'goto';
      gotoIndex?: number;
    }
  | {
      kind: 'scale-factor';
      ingredients: readonly ScalableIngredient[];
      factor: number;
    }
  | {
      kind: 'scale-target';
      ingredients: readonly ScalableIngredient[];
      referenceName: string;
      target: { amount: number; unit: string };
    };

export function isDeterministicCookOp(op: { kind: string }): boolean {
  return (
    op.kind === 'step-nav' ||
    op.kind === 'scale-factor' ||
    op.kind === 'scale-target'
  );
}

/**
 * The `llm` dep is accepted ONLY so callers and tests can prove it is never
 * invoked on this path — deterministic cook ops resolve entirely locally.
 */
export interface ServeCookDeps {
  llm: { invoke: (...args: unknown[]) => unknown };
}

export type ServeCookResult =
  | { kind: 'step-nav'; result: StepNavResult; usedProvider: false }
  | { kind: 'scale'; result: ScalableIngredient[]; usedProvider: false };

export function serveCookOperation(
  op: CookOperation,
  _deps: ServeCookDeps,
): ServeCookResult {
  switch (op.kind) {
    case 'step-nav':
      return {
        kind: 'step-nav',
        result: navigateStep(
          op.steps,
          op.currentIndex,
          op.direction,
          op.gotoIndex,
        ),
        usedProvider: false,
      };
    case 'scale-factor':
      return {
        kind: 'scale',
        result: scaleIngredients(op.ingredients, op.factor),
        usedProvider: false,
      };
    case 'scale-target':
      return {
        kind: 'scale',
        result: scaleRecipeToTarget(
          op.ingredients,
          op.referenceName,
          op.target,
        ),
        usedProvider: false,
      };
  }
}

// ── The degrade decision ─────────────────────────────────────────────────

export type CookTurnOp = CookOperation | { kind: 'freeform'; text: string };

export interface CookTurnInput {
  tier: CoachTier;
  ceilingTripped: boolean;
  op: CookTurnOp;
}

export type CookTurnPlan =
  | { mode: 'deterministic'; reason: 'cook-op' | 'ceiling-degrade' }
  | { mode: 'provider'; order: CookProviderId[] };

export function planCookTurn(input: CookTurnInput): CookTurnPlan {
  if (isDeterministicCookOp(input.op)) {
    // Step-nav / scale never need a model — ceiling state is irrelevant.
    return { mode: 'deterministic', reason: 'cook-op' };
  }
  if (input.ceilingTripped) {
    // Freeform would need the model, but we've hit the daily ceiling —
    // degrade to the deterministic surface instead of spending a call we
    // don't have. The cook can still step + scale.
    return { mode: 'deterministic', reason: 'ceiling-degrade' };
  }
  return { mode: 'provider', order: resolveCookProviderOrder(input.tier) };
}
