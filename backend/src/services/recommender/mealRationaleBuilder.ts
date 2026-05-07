// ROADMAP 4.0 WK8.1 — Per-meal rationale builder.
//
// Stitches the active personalization signals into a one-sentence
// lifestyle-voice rationale that fits under MAX_LENGTH characters. Signals
// are prioritized: most-concrete first (carry-over chains, pantry use)
// because those are the easiest "screenshot it and send to a friend"
// moments; cuisine-lean is least concrete (always available, low signal).
//
// When fragments exceed MAX_LENGTH, drop fragments from lowest priority
// up until the result fits. Returns the empty string when no signals are
// active (caller decides whether to render).
//
// Pure function — no DB, no mutation.

const MAX_LENGTH = 90;
const SEPARATOR = ' · ';

export interface MealRationaleSignals {
  pantryBoost?: { matched: string[] };
  carryOver?: { sourceLabel: string };
  leftoverChain?: { eatOnDay: string };
  magnesiumGap?: { addressedMicros: string[] };
  /** Generic micro-gap signal. Backwards-compatible with `magnesiumGap`. */
  microGap?: { addressedMicros: string[] };
  cuisineLean?: { cluster: string };
  useItUp?: { ingredient: string };
}

export interface BuildMealRationaleInput {
  signals: MealRationaleSignals;
  maxLength?: number;
}

interface Fragment {
  priority: number; // lower = higher priority
  text: string;
}

function buildFragments(signals: MealRationaleSignals): Fragment[] {
  const out: Fragment[] = [];
  if (signals.carryOver?.sourceLabel) {
    out.push({
      priority: 1,
      text: `uses ${signals.carryOver.sourceLabel}`,
    });
  }
  if (signals.leftoverChain?.eatOnDay) {
    out.push({
      priority: 2,
      text: `carries over to ${signals.leftoverChain.eatOnDay}`,
    });
  }
  if (signals.useItUp?.ingredient) {
    out.push({
      priority: 3,
      text: `uses up your ${signals.useItUp.ingredient}`,
    });
  }
  if (signals.pantryBoost?.matched && signals.pantryBoost.matched.length > 0) {
    const head = signals.pantryBoost.matched.slice(0, 2).join(' + ');
    out.push({
      priority: 4,
      text: `built on your ${head}`,
    });
  }
  // Micro gap (magnesiumGap is the legacy alias)
  const gapMicros =
    signals.microGap?.addressedMicros ??
    signals.magnesiumGap?.addressedMicros;
  if (gapMicros && gapMicros.length > 0) {
    out.push({
      priority: 5,
      text: `leans into ${gapMicros[0]}`,
    });
  }
  if (signals.cuisineLean?.cluster) {
    out.push({
      priority: 6,
      text: `${signals.cuisineLean.cluster} vibe`,
    });
  }
  return out;
}

export function buildMealRationale(input: BuildMealRationaleInput): string {
  const max = input.maxLength ?? MAX_LENGTH;
  const fragments = buildFragments(input.signals).sort((a, b) => a.priority - b.priority);
  if (fragments.length === 0) return '';

  // Try the full set; if too long, drop from lowest-priority end.
  let active = fragments.slice();
  while (active.length > 0) {
    const text = active.map((f) => f.text).join(SEPARATOR);
    if (text.length <= max) return text;
    active = active.slice(0, active.length - 1);
  }
  // Single fragment still too long? Hard-truncate to fit.
  return fragments[0].text.slice(0, max);
}

export const __INTERNALS = {
  MAX_LENGTH,
  SEPARATOR,
};
