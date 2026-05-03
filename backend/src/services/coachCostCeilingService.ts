// Phase 8 (10Y-E): per-user daily token ceiling for Pro Coach. When a Pro user
// crosses 100% of either input or output budget for the UTC day, we downgrade
// them to the free-tier model (Sonnet) for the rest of the day and emit a
// one-time soft notice to the SSE stream.

import { prisma } from '@/lib/prisma';
import { COACH_MODELS } from './coachService';

export const dailyTokenBudget = {
  input: 500_000,
  output: 100_000,
} as const;

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
}

export interface SelectModelWithBudgetResult {
  model: string;
  notice: string | null;
  usage: DailyTokenUsage;
  overBudget: boolean;
}

export async function selectModelWithBudget(
  input: SelectModelWithBudgetInput,
): Promise<SelectModelWithBudgetResult> {
  const usage = await getDailyTokenUsage(input.userId);
  const overInput = usage.input > dailyTokenBudget.input;
  const overOutput = usage.output > dailyTokenBudget.output;
  const overBudget = overInput || overOutput;
  if (overBudget) {
    return {
      model: COACH_MODELS.free,
      notice: COST_CEILING_NOTICE_TEXT,
      usage,
      overBudget: true,
    };
  }
  return {
    model: input.defaultModel,
    notice: null,
    usage,
    overBudget: false,
  };
}
