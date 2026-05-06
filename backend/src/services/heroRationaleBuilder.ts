// backend/src/services/heroRationaleBuilder.ts
// ROADMAP 4.0 HX0.2 — "Why today's hero" rationale builder.
//
// Stitches the active ranker inputs into a one-line primary reason + 2-3
// supporting signals. Lifestyle voice — no "you should" / "you're missing"
// verdict tone. Returns null when no signal is strong enough to justify a
// rationale (cold-start should not invent reasons).
//
// Cross-tier dovetail (N3.2): once `sazonVoiceService` lands, the prose
// generation path routes through it. Until then, the inline templates here
// enforce the same rules — no banned vocabulary; ≤ 90-char primary line.

export type RationaleSignal =
  | 'pantry_coverage_high'
  | 'pantry_coverage_partial'
  | 'nutrient_gap'
  | 'cuisine_novelty'
  | 'cuisine_cadence'
  | 'friend_cooked'
  | 'time_friendly'
  | 'protein_lean';

export interface RationaleInput {
  /** Pantry coverage 0..1 — share of recipe ingredients you already have. */
  pantryCoverage?: number;
  /** Most-deficient nutrient over a 7-day window (e.g. "magnesium"). */
  nutrientGap?: string | null;
  /** True when the recipe's cuisine is one the user has never cooked. */
  cuisineNovelty?: boolean;
  /** Days since the user last cooked this cuisine (null if never). */
  cuisineCadenceDays?: number | null;
  /** Number of followed friends who cooked this in the last 14 days. */
  friendCooks?: number;
  /** Recipe cook time + user's pref-time bucket from C1, in minutes. */
  cookTime?: number;
  preferredCookTime?: number | null;
  /** Recipe protein per serving. */
  proteinPerServing?: number | null;
  /** Cuisine label for prose. */
  cuisineLabel?: string | null;
  /** Top ingredient (for pantry-anchor prose). */
  topPantryIngredient?: string | null;
}

export interface Rationale {
  /** Lifestyle one-liner ≤ 90 chars. */
  primaryReason: string;
  /** Up to 3 supporting bullets. */
  secondaryReasons: string[];
  /** Structured signal tags so the UI can render iconography. */
  signals: RationaleSignal[];
}

const PRIMARY_MAX = 90;
const MAX_SECONDARY = 3;

const BANNED_PRIMARY = [
  /\byou should\b/i,
  /\byou're missing\b/i,
  /\byou are missing\b/i,
  /\byou need\b/i,
  /\bfailing\b/i,
];

function clean(line: string): string {
  // Defensive: never let a banned phrase slip through. Strip any matched
  // segment; tests verify the contract.
  let out = line;
  for (const re of BANNED_PRIMARY) out = out.replace(re, '').replace(/\s+/g, ' ').trim();
  return out.length > PRIMARY_MAX ? out.slice(0, PRIMARY_MAX - 1).trim() + '…' : out;
}

interface RankedSignal {
  signal: RationaleSignal;
  /** Primary-line candidate prose. */
  primary?: string;
  /** Secondary bullet (always present). */
  secondary: string;
  /** Higher = stronger candidate for the primary slot. */
  priority: number;
}

function rankSignals(input: RationaleInput): RankedSignal[] {
  const ranked: RankedSignal[] = [];
  const cuisine = input.cuisineLabel?.toLowerCase() ?? null;

  if ((input.pantryCoverage ?? 0) >= 0.6) {
    const ing = input.topPantryIngredient ?? 'what you have';
    ranked.push({
      signal: 'pantry_coverage_high',
      primary: `Uses ${ing} — already in your pantry.`,
      secondary: `${Math.round((input.pantryCoverage ?? 0) * 100)}% of ingredients are on hand`,
      priority: 80,
    });
  } else if ((input.pantryCoverage ?? 0) >= 0.35) {
    ranked.push({
      signal: 'pantry_coverage_partial',
      secondary: `Most ingredients already in your pantry`,
      priority: 40,
    });
  }

  if (input.nutrientGap) {
    ranked.push({
      signal: 'nutrient_gap',
      primary: `Leans into your ${input.nutrientGap} stride for the week.`,
      secondary: `Rich in ${input.nutrientGap}`,
      priority: 70,
    });
  }

  if (input.cuisineNovelty && cuisine) {
    ranked.push({
      signal: 'cuisine_novelty',
      primary: `First ${input.cuisineLabel} dish in your kitchen.`,
      secondary: `New cuisine for you`,
      priority: 90,
    });
  } else if (
    input.cuisineCadenceDays != null &&
    input.cuisineCadenceDays >= 14 &&
    cuisine
  ) {
    ranked.push({
      signal: 'cuisine_cadence',
      primary: `${input.cuisineLabel} has been quiet — fancy a return?`,
      secondary: `${input.cuisineCadenceDays} days since your last ${input.cuisineLabel} dish`,
      priority: 60,
    });
  }

  if ((input.friendCooks ?? 0) >= 2) {
    ranked.push({
      signal: 'friend_cooked',
      primary: `${input.friendCooks} friends cooked this in the last two weeks.`,
      secondary: `${input.friendCooks} friend cooks recently`,
      priority: 50,
    });
  }

  if (
    input.cookTime != null &&
    input.preferredCookTime != null &&
    input.cookTime <= input.preferredCookTime
  ) {
    ranked.push({
      signal: 'time_friendly',
      secondary: `Fits your usual cook-time window`,
      priority: 30,
    });
  }

  if ((input.proteinPerServing ?? 0) >= 30) {
    ranked.push({
      signal: 'protein_lean',
      secondary: `${input.proteinPerServing}g protein per serving`,
      priority: 25,
    });
  }

  return ranked.sort((a, b) => b.priority - a.priority);
}

export function buildHeroRationale(input: RationaleInput): Rationale | null {
  const ranked = rankSignals(input);
  if (ranked.length === 0) return null;

  // Pick the highest-priority signal that has a primary line; if none, the
  // strongest signal becomes both primary + secondary.
  const primaryCandidate = ranked.find((r) => r.primary);
  const primary = primaryCandidate?.primary ?? ranked[0].secondary;

  const secondaries = ranked
    .filter((r) => r !== primaryCandidate)
    .slice(0, MAX_SECONDARY)
    .map((r) => r.secondary);

  return {
    primaryReason: clean(primary),
    secondaryReasons: secondaries,
    signals: ranked.map((r) => r.signal),
  };
}
