// frontend/utils/dailyRollover.ts
// Pure helper for Group 10G-B's per-day macro rollover display.
//
// Takes a map of YYYY-MM-DD → consumed calories and a daily target, and returns
// a Map keyed by the *next* day with `{ delta, fromDate }`. Positive delta means
// yesterday was under target (surplus carried into today); negative means over.
//
// Keeping this pure and date-format-agnostic so it can be tested in isolation
// without timezone or fake-timer gymnastics.

export interface DailyRolloverInput {
  /** Map of YYYY-MM-DD → consumed calories for that day (completed meals only). */
  dailyConsumed: Record<string, number>;
  /** User's daily calorie target. Values <= 0 disable rollover. */
  dailyTarget: number;
}

export interface DailyRollover {
  /** Delta carried into this day from yesterday. Positive = surplus, negative = deficit. */
  delta: number;
  /** The ISO date key (YYYY-MM-DD) the delta was carried from. */
  fromDate: string;
}

/**
 * Compute per-day rollover deltas.
 *
 * A day `T` appears in the result iff:
 * - there is an entry for day `T-1` in `dailyConsumed`
 * - that prior day had non-zero consumption (so there's actually something to carry)
 * - `dailyTarget` is positive
 *
 * The result key is day `T`; the value describes what `T` inherits from `T-1`.
 */
export function computeDailyRollovers(
  input: DailyRolloverInput,
): Map<string, DailyRollover> {
  const out = new Map<string, DailyRollover>();
  const { dailyConsumed, dailyTarget } = input;

  if (dailyTarget <= 0) return out;

  const sortedDates = Object.keys(dailyConsumed).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const dateKey = sortedDates[i];
    const consumed = dailyConsumed[dateKey];
    if (consumed <= 0) continue;

    const nextDay = addOneDay(dateKey);
    // Only emit a rollover entry if `nextDay` is itself a key we know about.
    if (!(nextDay in dailyConsumed)) continue;

    out.set(nextDay, {
      delta: dailyTarget - consumed,
      fromDate: dateKey,
    });
  }

  return out;
}

/** Add one calendar day to a YYYY-MM-DD string. Avoids Date timezone pitfalls. */
function addOneDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Use UTC math to skip DST boundaries.
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
