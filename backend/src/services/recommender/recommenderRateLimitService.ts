// ROADMAP 4.0 TB2.3 — Per-user daily LLM call budget.
//
// In-memory token bucket keyed by `${userId}:${utcDateString}`. Cheap,
// stateless across restarts (acceptable: budget is a soft cap, not a
// safety boundary). Default 5 calls/day; `RECOMMENDER_DAILY_BUDGET`
// env var overrides per-deploy.

const DEFAULT_BUDGET = 5;
const buckets = new Map<string, number>();

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketKey(userId: string, d: Date): string {
  return `${userId}:${utcDateKey(d)}`;
}

function dailyBudget(): number {
  const raw = process.env.RECOMMENDER_DAILY_BUDGET;
  if (!raw) return DEFAULT_BUDGET;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_BUDGET;
}

export interface BudgetCheck {
  allowed: boolean;
  remaining: number;
  budget: number;
}

export async function consumeBudget(
  userId: string,
  now: Date = new Date(),
): Promise<BudgetCheck> {
  const budget = dailyBudget();
  const key = bucketKey(userId, now);
  const used = buckets.get(key) ?? 0;
  if (used >= budget) {
    return { allowed: false, remaining: 0, budget };
  }
  buckets.set(key, used + 1);
  return { allowed: true, remaining: budget - used - 1, budget };
}

export function resetBudget(userId?: string): void {
  if (!userId) {
    buckets.clear();
    return;
  }
  for (const k of Array.from(buckets.keys())) {
    if (k.startsWith(`${userId}:`)) buckets.delete(k);
  }
}

export const __testHooks = {
  reset: () => buckets.clear(),
};
