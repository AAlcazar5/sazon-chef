// ROADMAP 4.0 I3.3 — variable-cost telemetry per user.
//
// Sums LLM token spend per user per day, exposes a median query across
// cohorts, and fires a (no-op) alert when the cohort median crosses the
// "subsidy turning into a death spiral" threshold.
//
// The freemium math (per Tier I3 docs): variable cost per active free user
// should sit at $0.10–$0.25/mo. If a cohort spikes past $0.50/mo median,
// the free tier needs a softer cap (rate-limit, not feature gate). This
// service is the alarm, not the brake.
//
// Reads the existing `coachMessage` rows directly — no new aggregate table
// in v1. If cohort queries get slow at >100k users we'll add a daily
// rollup table; meanwhile the per-user-day sum is fine.

import { prisma } from '@/lib/prisma';

// ─── Pricing table (USD per 1M tokens) ────────────────────────────────────
//
// Sources:
//   - Anthropic public pricing (claude-haiku-4-5 / claude-sonnet-4-6):
//     https://www.anthropic.com/pricing
//   - Google Gemini Flash pricing: https://ai.google.dev/pricing
//   - Cache reads price at 10% of fresh-input rate (Anthropic standard).
//   - Cache writes price at 25% premium over fresh input (Anthropic).
//
// Update when rates change. Tests assert relative ordering, not exact
// values, so a price drop won't break the suite.

export interface ModelPricing {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cache-read tokens */
  cacheRead: number;
  /** USD per 1M cache-write tokens */
  cacheWrite: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini Flash — the lowest-cost backend; this is what most free traffic
  // routes through after Tier $$ cost optimization.
  'gemini-flash-latest': { input: 0.075, output: 0.3, cacheRead: 0.01875, cacheWrite: 0.09375 },
  'gemini-2.0-flash': { input: 0.075, output: 0.3, cacheRead: 0.01875, cacheWrite: 0.09375 },

  // Anthropic Haiku 4.5 — free-tier model when on Anthropic backend.
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },

  // Anthropic Sonnet 4.6 — premium-tier model.
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4-5-20251001': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
};

// Used when a row has no modelUsed or an unrecognized model. Errs on the
// side of "not free" so unaccounted spend doesn't hide.
const FALLBACK_PRICING: ModelPricing = MODEL_PRICING['claude-haiku-4-5-20251001'];

export interface MessageCostInput {
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  model: string | null | undefined;
}

/**
 * Pure cost calculation for a single message. USD.
 */
export function calculateMessageCost(input: MessageCostInput): number {
  const pricing =
    (input.model && MODEL_PRICING[input.model]) || FALLBACK_PRICING;
  const perToken = (rate: number) => rate / 1_000_000;
  return (
    input.promptTokens * perToken(pricing.input) +
    input.completionTokens * perToken(pricing.output) +
    input.cacheReadTokens * perToken(pricing.cacheRead) +
    input.cacheWriteTokens * perToken(pricing.cacheWrite)
  );
}

// ─── Per-user-day aggregation ─────────────────────────────────────────────

export interface DailyCostResult {
  userId: string;
  dayUTC: Date;
  totalUsd: number;
  messageCount: number;
  totalTokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function nextUtcDay(d: Date): Date {
  const start = startOfUtcDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function getDailyCostForUser(input: {
  userId: string;
  dayUTC: Date;
}): Promise<DailyCostResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const start = startOfUtcDay(input.dayUTC);
  const end = nextUtcDay(input.dayUTC);

  const messages = (await prisma.coachMessage.findMany({
    where: { userId: input.userId, createdAt: { gte: start, lt: end } },
    select: {
      promptTokens: true,
      completionTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
      modelUsed: true,
    },
  })) as Array<{
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    modelUsed: string | null;
  }>;

  let totalUsd = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalCR = 0;
  let totalCW = 0;
  for (const m of messages) {
    totalUsd += calculateMessageCost({
      promptTokens: m.promptTokens,
      completionTokens: m.completionTokens,
      cacheReadTokens: m.cacheReadTokens,
      cacheWriteTokens: m.cacheWriteTokens,
      model: m.modelUsed,
    });
    totalIn += m.promptTokens;
    totalOut += m.completionTokens;
    totalCR += m.cacheReadTokens;
    totalCW += m.cacheWriteTokens;
  }

  return {
    userId: input.userId,
    dayUTC: start,
    totalUsd,
    messageCount: messages.length,
    totalTokens: { input: totalIn, output: totalOut, cacheRead: totalCR, cacheWrite: totalCW },
  };
}

// ─── Cohort median ────────────────────────────────────────────────────────

export type CostTier = 'free' | 'premium';

export interface CohortMedianResult {
  tier: CostTier;
  windowDays: number;
  sampleSize: number;
  /** Median monthly USD across the cohort, or null when sample is empty. */
  medianUsd: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function getCohortMedianCost(input: {
  tier: CostTier;
  windowDays: number;
  asOf: Date;
}): Promise<CohortMedianResult> {
  const subscriptionFilter =
    input.tier === 'free'
      ? { subscriptionStatus: { not: 'active' } }
      : { subscriptionStatus: 'active' };

  const users = (await prisma.user.findMany({
    where: subscriptionFilter,
    select: { id: true },
  })) as Array<{ id: string }>;

  if (users.length === 0) {
    return { tier: input.tier, windowDays: input.windowDays, sampleSize: 0, medianUsd: null };
  }

  const windowStart = new Date(input.asOf.getTime() - input.windowDays * 24 * 60 * 60 * 1000);
  const perUserMonthly: number[] = [];
  for (const u of users) {
    const messages = (await prisma.coachMessage.findMany({
      where: { userId: u.id, createdAt: { gte: windowStart, lt: input.asOf } },
      select: {
        promptTokens: true,
        completionTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
        modelUsed: true,
      },
    })) as Array<{
      promptTokens: number;
      completionTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      modelUsed: string | null;
    }>;

    let userTotal = 0;
    for (const m of messages) {
      userTotal += calculateMessageCost({
        promptTokens: m.promptTokens,
        completionTokens: m.completionTokens,
        cacheReadTokens: m.cacheReadTokens,
        cacheWriteTokens: m.cacheWriteTokens,
        model: m.modelUsed,
      });
    }
    // Normalize to a monthly figure regardless of windowDays so the
    // alert threshold is comparable across windows.
    const monthly = userTotal * (30 / input.windowDays);
    perUserMonthly.push(monthly);
  }

  return {
    tier: input.tier,
    windowDays: input.windowDays,
    sampleSize: perUserMonthly.length,
    medianUsd: median(perUserMonthly),
  };
}

// ─── Alert ────────────────────────────────────────────────────────────────
//
// Thresholds expressed as a *monthly* USD median per user. When breached,
// the operator should consider tightening the rate-limit (not the feature
// gate). Per the I3 docs: "rate-limit, not feature gate."

export const COHORT_ALERT_THRESHOLDS: Record<CostTier, number> = {
  free: 0.5,
  premium: 8.0,
};

const DEFAULT_ALERT_WINDOW_DAYS = 30;

export interface CohortBudgetAlertResult {
  tier: CostTier;
  threshold: number;
  medianUsd: number | null;
  sampleSize: number;
  breached: boolean;
}

export async function checkCohortBudgetAlert(input: {
  tier: CostTier;
  asOf: Date;
  windowDays?: number;
}): Promise<CohortBudgetAlertResult> {
  const threshold = COHORT_ALERT_THRESHOLDS[input.tier];
  const cohort = await getCohortMedianCost({
    tier: input.tier,
    windowDays: input.windowDays ?? DEFAULT_ALERT_WINDOW_DAYS,
    asOf: input.asOf,
  });
  const breached =
    cohort.sampleSize > 0 &&
    cohort.medianUsd != null &&
    cohort.medianUsd > threshold;
  return {
    tier: input.tier,
    threshold,
    medianUsd: cohort.medianUsd,
    sampleSize: cohort.sampleSize,
    breached,
  };
}
