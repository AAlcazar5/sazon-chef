// Phase 8 (10Y-E) + Tier S S7: per-user daily token ceiling. When a user
// crosses 100% of either input or output budget for the UTC day, we downgrade
// them to the free-tier model (Haiku) for the rest of the day and emit a
// one-time soft notice to the SSE stream.
//
// S7: tier-aware budget — free users get a much smaller ceiling than premium
// because the cheaper Haiku model + photo-attach gating already keeps spend
// low; the ceiling is a backstop against runaway loops, not a usage tax.

import { prisma } from '@/lib/prisma';
import { COACH_MODELS, type CoachTier } from './coachService';

export interface DailyTokenBudget {
  input: number;
  output: number;
}

export const TIER_BUDGETS: Record<CoachTier, DailyTokenBudget> = {
  free: { input: 25_000, output: 10_000 },
  premium: { input: 500_000, output: 100_000 },
};

// Back-compat: legacy callers / tests still import dailyTokenBudget. Points at
// the premium budget since pre-S7 code only used this path for Pro users.
export const dailyTokenBudget = TIER_BUDGETS.premium;

export const COST_CEILING_NOTICE_TEXT =
  "I'm taking a quick breath — back at full power tomorrow.";

interface DailyTokenUsage {
  input: number;
  output: number;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function getDailyTokenUsage(
  userId: string,
): Promise<DailyTokenUsage> {
  const since = startOfTodayUTC();
  const agg = await prisma.coachMessage.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: {
      promptTokens: true,
      cacheReadTokens: true,
      completionTokens: true,
    },
  });
  const promptTokens = Number(agg._sum.promptTokens ?? 0);
  const cacheReadTokens = Number(agg._sum.cacheReadTokens ?? 0);
  const completionTokens = Number(agg._sum.completionTokens ?? 0);
  return {
    input: promptTokens + cacheReadTokens,
    output: completionTokens,
  };
}

export interface SelectModelWithBudgetInput {
  userId: string;
  defaultModel: string;
  tier?: CoachTier;
}

export interface SelectModelWithBudgetResult {
  model: string;
  notice: string | null;
  usage: DailyTokenUsage;
  overBudget: boolean;
  budget: DailyTokenBudget;
}

export async function selectModelWithBudget(
  input: SelectModelWithBudgetInput,
): Promise<SelectModelWithBudgetResult> {
  const tier: CoachTier = input.tier ?? 'premium';
  const budget = TIER_BUDGETS[tier];
  const usage = await getDailyTokenUsage(input.userId);
  const overInput = usage.input > budget.input;
  const overOutput = usage.output > budget.output;
  const overBudget = overInput || overOutput;
  if (overBudget) {
    return {
      model: COACH_MODELS.free,
      notice: COST_CEILING_NOTICE_TEXT,
      usage,
      overBudget: true,
      budget,
    };
  }
  return {
    model: input.defaultModel,
    notice: null,
    usage,
    overBudget: false,
    budget,
  };
}
