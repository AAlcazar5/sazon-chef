// ROADMAP 4.0 N11.3 — Banned-vocabulary corpus + lifestyle-voice helper.
//
// Mirrored from backend/__tests__/__fixtures__/bannedVocabularyCorpus.ts so
// frontend tests can import without crossing TS project boundaries.
// Keep the two files in sync — both export the same shape.

export const TRAINER_TOKENS: readonly string[] = [
  'macro-friendly',
  'macro friendly',
  'skinny',
  'healthier',
] as const;

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
  /\byour\s+(cut|bulk|maintain|maintenance)\s+(phase|goal|target)\b/i,
  /\b(cut|bulk|maintain)\s+(week|day|streak)\b/i,
] as const;

export const SHAME_PATTERNS: readonly RegExp[] = [
  /\bexpiring\s+soon\b/i,
  /\bwaste\b/i,
  /\bthrowing\s+(out|away)\b/i,
  /\bspoil(ed|ing)?\b/i,
  /\byou\s+skipped\b/i,
  /\bdon'?t\s+let\s+it\s+go\s+bad\b/i,
  /\bbefore\s+it\s+goes\s+bad\b/i,
] as const;

export const DEPRECATED_BRAND_TOKENS: readonly string[] = [
  'Coach',
  'Cookbook',
  'Cravings, Made Real',
] as const;

const BRAND_SURFACE_PATTERNS: Record<string, readonly RegExp[]> = {
  default: [
    /\bthe\s+coach\s+(tab|screen|surface)\b/i,
    /\bcookbook\s+(tab|screen|surface)\b/i,
    /\bfast\s+food\s+makeovers?\b/i,
  ],
};

export interface AssertLifestyleVoiceOptions {
  surface?: string;
  allow?: ReadonlyArray<'trainer' | 'verdict' | 'shame' | 'brand'>;
}

export interface VoiceViolation {
  category: 'trainer' | 'verdict' | 'shame' | 'brand';
  match: string;
  rule: string;
}

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

export const ALL_BANNED_TOKENS: readonly string[] = [
  ...TRAINER_TOKENS,
  ...DEPRECATED_BRAND_TOKENS,
] as const;
