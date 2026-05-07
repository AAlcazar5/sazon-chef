// ROADMAP 4.0 WK6.1 — Nutrient-gap closure as a planning objective.
//
// Reads the user's last-7-day nutrient roll-up (provided by D14), picks the
// K micros furthest below DV, and applies a SOFT boost to candidate recipes
// whose per-serving density of those micros sits in the top quartile of
// the candidate set. The boost is bounded — never enough to override a
// great recipe; just enough to bias toward gap closure.
//
// Discovery voice: "leans into magnesium." The function emits structural
// flags (which micros each candidate addresses) — copy lives in N3
// `sazonVoiceService`.
//
// Pure function — no DB, no mutation.

const DEFAULT_GAP_COUNT = 2;
const PER_GAP_BOOST = 0.05;
const MAX_GAP_BOOST = 0.12;
const TOP_QUARTILE_FRACTION = 0.25;

export interface NutrientRollupEntry {
  micro: string;
  /** Percent of DV achieved over the last window (0..1). */
  percentOfDV: number;
}

export interface IdentifyNutrientGapsInput {
  rollup: NutrientRollupEntry[];
  /** How many bottom micros to return. Default 2. */
  count?: number;
}

export function identifyNutrientGaps(
  input: IdentifyNutrientGapsInput,
): string[] {
  const k = input.count ?? DEFAULT_GAP_COUNT;
  const sorted = [...input.rollup]
    .filter((r) => r.percentOfDV < 1)
    .sort((a, b) => a.percentOfDV - b.percentOfDV);
  return sorted.slice(0, k).map((r) => r.micro);
}

export interface CandidateForGap {
  recipeId: string;
  score: number;
  /** Per-serving micro density: { magnesium: 0.42, ... } in arbitrary units. */
  microDensity: Record<string, number>;
}

export interface ApplyNutrientGapBoostInput {
  candidates: CandidateForGap[];
  gapMicros: string[];
  perGapBoost?: number;
  maxBoost?: number;
}

export interface BoostedNutrientCandidate extends CandidateForGap {
  boost: number;
  /** Lower-cased micro names that this candidate addresses. */
  addressesGaps: string[];
}

function topQuartileSet(
  candidates: CandidateForGap[],
  micro: string,
): Set<string> {
  const densities = candidates
    .map((c) => ({ id: c.recipeId, val: c.microDensity[micro] ?? 0 }))
    .filter((d) => d.val > 0);
  if (densities.length === 0) return new Set();
  const sortedDesc = [...densities].sort((a, b) => b.val - a.val);
  const topQuartileSize = Math.max(1, Math.ceil(sortedDesc.length * TOP_QUARTILE_FRACTION));
  const top = sortedDesc.slice(0, topQuartileSize);
  return new Set(top.map((d) => d.id));
}

export function applyNutrientGapBoost(
  input: ApplyNutrientGapBoostInput,
): BoostedNutrientCandidate[] {
  const perGap = input.perGapBoost ?? PER_GAP_BOOST;
  const cap = input.maxBoost ?? MAX_GAP_BOOST;
  if (input.gapMicros.length === 0) {
    return input.candidates.map((c) => ({ ...c, boost: 0, addressesGaps: [] }));
  }
  // Pre-compute the top-quartile recipe-id set per gap micro.
  const topSets = new Map<string, Set<string>>();
  for (const m of input.gapMicros) {
    topSets.set(m, topQuartileSet(input.candidates, m));
  }
  return input.candidates.map((c) => {
    const addresses: string[] = [];
    for (const m of input.gapMicros) {
      if (topSets.get(m)?.has(c.recipeId)) addresses.push(m);
    }
    const rawBoost = perGap * addresses.length;
    const boost = Math.min(cap, rawBoost);
    return {
      ...c,
      score: c.score + boost,
      boost,
      addressesGaps: addresses,
    };
  });
}

export const __INTERNALS = {
  DEFAULT_GAP_COUNT,
  PER_GAP_BOOST,
  MAX_GAP_BOOST,
  TOP_QUARTILE_FRACTION,
};
