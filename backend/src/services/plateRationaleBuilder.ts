// backend/src/services/plateRationaleBuilder.ts
// ROADMAP 4.0 BAP0.2 — "Why these slots" rationale builder.
//
// Mirrors HX0.2's heroRationaleBuilder pattern but operates on PLATE
// inputs (slot-level signals) instead of recipe-level inputs. Stitches
// pantry coverage / macro fit / cuisine cadence / leftover continuity
// into a one-line primary reason + up to 3 supporting bullets. Lifestyle
// voice — no "you should" verdict tone, no banned vocabulary.
//
// Returns null when no signal is strong enough — cold-start hero hides
// the ribbon rather than inventing prose.

export type PlateSignal =
  | 'leftover_continuity'
  | 'pantry_coverage_high'
  | 'pantry_coverage_partial'
  | 'macro_fit'
  | 'cuisine_cadence'
  | 'macro_anchor';

export interface PlateRationaleInput {
  /** ≥2 components from yesterday's plate are still in inventory. */
  leftoverContinuityCount?: number;
  /** Pantry coverage 0..1 — share of plate slots already in pantry. */
  pantryCoverage?: number;
  /** Macro target fit 0..1 (how close the plate's macros are to target). */
  macroFitScore?: number | null;
  /** Days since the user last cooked this plate's dominant cuisine. */
  cuisineCadenceDays?: number | null;
  cuisineLabel?: string | null;
  /** Top protein for prose ("Your salmon's waiting"). */
  topProteinName?: string | null;
  /** Top pantry ingredient (anchor for the pantry-coverage line). */
  topPantryIngredient?: string | null;
}

export interface PlateRationale {
  primaryReason: string;
  secondaryReasons: string[];
  signals: PlateSignal[];
}

const PRIMARY_MAX = 90;
const MAX_SECONDARY = 3;

const BANNED_PHRASES = [
  /\byou should\b/i,
  /\byou're missing\b/i,
  /\byou are missing\b/i,
  /\byou need\b/i,
  /\bfailing\b/i,
  /\bmacro-friendly\b/i,
  /\b(cut|bulk|maintain)\b/i,
];

function clean(line: string): string {
  let out = line;
  for (const re of BANNED_PHRASES) {
    out = out.replace(re, '').replace(/\s+/g, ' ').trim();
  }
  return out.length > PRIMARY_MAX ? out.slice(0, PRIMARY_MAX - 1).trim() + '…' : out;
}

interface RankedSignal {
  signal: PlateSignal;
  primary?: string;
  secondary: string;
  priority: number;
}

function rankSignals(input: PlateRationaleInput): RankedSignal[] {
  const ranked: RankedSignal[] = [];

  // Leftover continuity is the strongest signal — yesterday's cook is
  // the most personally-relevant context the engine can have.
  if ((input.leftoverContinuityCount ?? 0) >= 2) {
    const protein = input.topProteinName?.trim();
    ranked.push({
      signal: 'leftover_continuity',
      primary: protein
        ? `${protein} from last night — already half a plate.`
        : `Last night's plate has carry-over — already half done.`,
      secondary: `${input.leftoverContinuityCount} components still in your kitchen`,
      priority: 100,
    });
  }

  if ((input.pantryCoverage ?? 0) >= 0.6) {
    const ing = input.topPantryIngredient?.trim() ?? 'what you have';
    ranked.push({
      signal: 'pantry_coverage_high',
      primary: `Built around ${ing} — already on your shelf.`,
      secondary: `${Math.round((input.pantryCoverage ?? 0) * 100)}% of slots covered by your pantry`,
      priority: 80,
    });
  } else if ((input.pantryCoverage ?? 0) >= 0.35) {
    ranked.push({
      signal: 'pantry_coverage_partial',
      secondary: 'Most slots already in your pantry',
      priority: 40,
    });
  }

  if (typeof input.macroFitScore === 'number' && input.macroFitScore >= 0.85) {
    ranked.push({
      signal: 'macro_fit',
      primary: `Lands on your macro target without nudging.`,
      secondary: 'Hits today\'s protein + calorie target',
      priority: 60,
    });
  } else if (typeof input.macroFitScore === 'number' && input.macroFitScore >= 0.65) {
    ranked.push({
      signal: 'macro_fit',
      secondary: 'Close to today\'s macro target',
      priority: 30,
    });
  }

  if (
    input.cuisineCadenceDays != null &&
    input.cuisineCadenceDays >= 14 &&
    input.cuisineLabel?.trim()
  ) {
    ranked.push({
      signal: 'cuisine_cadence',
      primary: `${input.cuisineLabel} has been quiet — fancy a return?`,
      secondary: `${input.cuisineCadenceDays} days since your last ${input.cuisineLabel}`,
      priority: 50,
    });
  }

  if (input.topProteinName?.trim() && ranked.length === 0) {
    // Macro-anchor is the weakest signal — only surfaced when nothing
    // stronger qualifies, and never as a primary reason on its own.
    ranked.push({
      signal: 'macro_anchor',
      secondary: `Built around ${input.topProteinName}`,
      priority: 10,
    });
  }

  return ranked.sort((a, b) => b.priority - a.priority);
}

/**
 * Build a plate rationale from the active inputs. Returns null when no
 * signal is strong enough to justify a primary line (cold-start case —
 * UI hides the ribbon rather than inventing prose).
 */
export function buildPlateRationale(
  input: PlateRationaleInput,
): PlateRationale | null {
  const ranked = rankSignals(input);
  if (ranked.length === 0) return null;

  // Primary slot needs an entry with a `primary` candidate. If none of
  // the qualifying signals carries a primary line (e.g. only weak
  // pantry coverage + macro anchor), the rationale isn't strong enough.
  const primaryEntry = ranked.find((r) => r.primary);
  if (!primaryEntry || !primaryEntry.primary) return null;

  const primary = clean(primaryEntry.primary);
  if (primary.length === 0) return null;

  // Secondaries: skip the primary's own secondary (already implied) and
  // dedupe identical strings across signals.
  const seen = new Set<string>();
  const secondaries: string[] = [];
  for (const r of ranked) {
    if (r === primaryEntry) continue;
    const s = clean(r.secondary);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    secondaries.push(s);
    if (secondaries.length >= MAX_SECONDARY) break;
  }

  const signals = ranked.map((r) => r.signal);

  return {
    primaryReason: primary,
    secondaryReasons: secondaries,
    signals,
  };
}
