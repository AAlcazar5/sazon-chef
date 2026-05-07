// ROADMAP 4.0 N11.3 — Banned-vocabulary corpus + lifestyle-voice helper.
//
// Single source of truth for forbidden user-facing tokens across every voice
// regression test in the codebase. ~15+ planned tier tests across FX/IG/WK/HX/RD
// each shipped their own inline banned-vocab arrays — they drift independently.
// This corpus consolidates them; new banned tokens land in one PR, not 15.
//
// Cross-tier dovetail (N3.1): `sazonVoiceService.assertVoice()` uses this corpus
// at runtime to validate emitted prose before returning it to callers.
//
// CLAUDE.md is the canonical voice doc. This file enforces what CLAUDE.md says.

/**
 * Trainer / bodybuilder-cult vocabulary — explicitly banned by CLAUDE.md.
 * These tokens carry the wrong persona for the lifestyle eater.
 *
 * NOTE on "cut" / "bulk" / "maintain" — these are valid English in recipe
 * instructions ("cut the onion"). The voice-helper checks for the *goal-phase*
 * use, not the verb. See VERDICT_PATTERNS for the precise regex.
 */
export const TRAINER_TOKENS: readonly string[] = [
  'macro-friendly',
  'macro friendly',
  'skinny',
  'healthier', // implies a verdict on the original — banned per RD3 voice rules
] as const;

/**
 * Verdict / punitive vocabulary — phrases that grade the user's day instead
 * of inviting discovery. Banned by C11 voice rules + persona.md.
 */
export const VERDICT_PATTERNS: readonly RegExp[] = [
  /\byou\s+should\b/i,
  /\byou'?re\s+under\b/i,
  /\byou'?re\s+over\b/i,
  /\byou'?re\s+missing\b/i,
  /\bdeficient\b/i,
  /\blow\s+in\b/i,
  /\byou\s+missed\b/i,
  /\byou\s+failed\b/i,
  /\byou'?re\s+behind\b/i,
  /\bbelow\s+your\s+(goal|target)\b/i,
  /\babove\s+your\s+(goal|target)\b/i,
  // Goal-phase vocabulary in *narrative* form (not recipe instructions)
  /\byour\s+(cut|bulk|maintain|maintenance)\s+(phase|goal|target)\b/i,
  /\b(cut|bulk|maintain)\s+(week|day|streak)\b/i,
] as const;

/**
 * Shame-coded vocabulary specific to the leftover / pantry surfaces.
 * RD4 / IG4 / WK1.2 voice rules ban these.
 */
export const SHAME_PATTERNS: readonly RegExp[] = [
  /\bexpiring\s+soon\b/i,
  /\bwaste\b/i,
  /\bthrowing\s+(out|away)\b/i,
  /\bspoil(ed|ing)?\b/i,
  /\byou\s+skipped\b/i,
  /\bdon'?t\s+let\s+it\s+go\s+bad\b/i,
  /\bbefore\s+it\s+goes\s+bad\b/i,
] as const;

/**
 * Brand-vocabulary substitutions — these are deprecated app vocabulary.
 * The lifestyle-voice helper warns when prose still uses the old terms.
 */
export const DEPRECATED_BRAND_TOKENS: readonly string[] = [
  'Coach', // → use "Sazon" (the brand-as-friend; trainer vibe deprecated)
  'Cookbook', // → use "Kitchen" (recipes-only framing deprecated)
  'Cravings, Made Real', // canonical reframe of "Fast Food Makeovers"
] as const;

/**
 * Brand tokens that are deprecated as nouns describing the user's app section
 * but valid in other contexts (e.g., "the cookbook author Yotam Ottolenghi").
 * The helper requires opt-in via `surface` to enforce these — not tripped on
 * incidental editorial mentions.
 */
const BRAND_SURFACE_PATTERNS: Record<string, readonly RegExp[]> = {
  default: [
    /\bthe\s+coach\s+(tab|screen|surface)\b/i,
    /\bcookbook\s+(tab|screen|surface)\b/i,
    /\bfast\s+food\s+makeovers?\b/i,
  ],
};

export interface AssertLifestyleVoiceOptions {
  /** Surface this prose is rendered on. Tightens checks for that surface. */
  surface?: string;
  /** Skip a specific category if a test deliberately allows one. */
  allow?: ReadonlyArray<'trainer' | 'verdict' | 'shame' | 'brand'>;
}

export interface VoiceViolation {
  category: 'trainer' | 'verdict' | 'shame' | 'brand';
  match: string;
  rule: string;
}

/** Returns the first violation found in `prose`, or null if clean. */
export function findVoiceViolation(
  prose: string,
  options: AssertLifestyleVoiceOptions = {},
): VoiceViolation | null {
  const allow = new Set(options.allow ?? []);

  if (!allow.has('trainer')) {
    for (const token of TRAINER_TOKENS) {
      const idx = prose.toLowerCase().indexOf(token.toLowerCase());
      if (idx >= 0) {
        return {
          category: 'trainer',
          match: prose.slice(idx, idx + token.length),
          rule: `trainer-token: "${token}"`,
        };
      }
    }
  }

  if (!allow.has('verdict')) {
    for (const pattern of VERDICT_PATTERNS) {
      const m = prose.match(pattern);
      if (m) {
        return { category: 'verdict', match: m[0], rule: `verdict: ${pattern}` };
      }
    }
  }

  if (!allow.has('shame')) {
    for (const pattern of SHAME_PATTERNS) {
      const m = prose.match(pattern);
      if (m) {
        return { category: 'shame', match: m[0], rule: `shame: ${pattern}` };
      }
    }
  }

  if (!allow.has('brand')) {
    const surfacePatterns =
      BRAND_SURFACE_PATTERNS[options.surface ?? 'default'] ??
      BRAND_SURFACE_PATTERNS.default;
    for (const pattern of surfacePatterns) {
      const m = prose.match(pattern);
      if (m) {
        return { category: 'brand', match: m[0], rule: `brand: ${pattern}` };
      }
    }
  }

  return null;
}

/**
 * Throws if `prose` contains any banned vocabulary. Used by every voice
 * regression test as the single source of truth.
 *
 * @example
 *   assertLifestyleVoice("Your milk is expiring soon"); // throws
 *   assertLifestyleVoice("Your milk's been quiet — restock?"); // ok
 */
export function assertLifestyleVoice(
  prose: string,
  options: AssertLifestyleVoiceOptions = {},
): void {
  const violation = findVoiceViolation(prose, options);
  if (violation) {
    throw new Error(
      `Lifestyle voice violation [${violation.category}]: "${violation.match}" — ${violation.rule}\nProse: ${prose}`,
    );
  }
}

/** All banned-token forms exposed as one array for convenience / cap tests. */
export const ALL_BANNED_TOKENS: readonly string[] = [
  ...TRAINER_TOKENS,
  ...DEPRECATED_BRAND_TOKENS,
] as const;
