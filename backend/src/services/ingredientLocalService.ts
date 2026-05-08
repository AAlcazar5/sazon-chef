// backend/src/services/ingredientLocalService.ts
// ROADMAP 4.0 I2.1 — Local-ingredient resolver (L0 manual map).
//
// Given a canonical (en-US) ingredient name + a user locale, return the
// local-market name + availability tier + optional substitute hint. JSON-
// backed at L0; logic is identical when the seed table eventually moves
// to Prisma at L1+.
//
// Locale fallback chain:
//   exact (e.g. 'es-MX')
//   → base language (e.g. 'es')
//   → 'en-US' (canonical fallback)
//   → null (caller renders the canonical name unchanged)
//
// This service is read-only and pure. No prisma, no network. Caller can
// inject a custom `source` for tests or for reading from a future Prisma
// table without changing the lookup contract.

import {
  STARTER_LOCAL_EQUIVALENTS,
  type LocalEquivalent,
  type AvailabilityTier,
} from '../data/ingredientLocalEquivalents';

const COLLAPSE_WHITESPACE = /\s+/g;

/**
 * Normalize an ingredient name for canonical matching:
 *   - Unicode NFD + strip combining accents (Açaí → acai)
 *   - lowercase
 *   - trim + collapse internal whitespace
 *
 * Idempotent. Empty input returns empty string.
 */
export function normalizeIngredientName(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(COLLAPSE_WHITESPACE, ' ');
}

/**
 * BCP 47-ish fallback chain. Identical shape to coachPromptService /
 * frontend i18n: exact → base → 'en-US'. Returns the canonical/no-locale
 * tier as the final fallback.
 */
function buildLocaleChain(locale: string): string[] {
  const out: string[] = [];
  if (locale) {
    out.push(locale);
    const base = locale.split('-')[0];
    if (base && base !== locale) out.push(base);
  }
  if (!out.includes('en-US')) out.push('en-US');
  return out;
}

/**
 * Pure lookup: given a row source + canonical key + locale, return the
 * best match by walking the locale chain. Used directly by tests; the
 * exported `resolveLocal` wraps this with the default starter source.
 */
export function lookupLocalEquivalent(
  rows: ReadonlyArray<LocalEquivalent>,
  canonicalRaw: string,
  locale: string
): LocalEquivalent | null {
  const canonical = normalizeIngredientName(canonicalRaw);
  if (!canonical) return null;
  const chain = buildLocaleChain(locale);
  for (const loc of chain) {
    const hit = rows.find(
      (r) => r.canonical === canonical && r.locale === loc
    );
    if (hit) return hit;
  }
  return null;
}

export interface ResolveLocalResult {
  /** What to render to the user. */
  displayName: string;
  /** Availability in the resolved locale ('common' if we fell back to en-US). */
  availabilityTier: AvailabilityTier;
  /** Substitute hint when availabilityTier !== 'common'. */
  substitute: string | null;
  /** True when we found a real entry; false when we fell back to canonical-as-display. */
  matched: boolean;
  /** The locale we ended up resolving against ('en-US' on fallback, null on no-match). */
  resolvedLocale: string | null;
  /** Free-form tip from the curator, when present. */
  notes: string | null;
}

/**
 * Resolve an ingredient name for display in `locale`.
 *
 * - Found a local entry? Return its localName + tier + sub.
 * - Found only an en-US entry? Return that (canonical fallback).
 * - Found nothing? Return the input name unchanged with `matched: false`.
 *
 * Never throws. Unknown locale is fine. Unknown ingredient is fine.
 */
export function resolveLocal(
  canonicalRaw: string,
  locale: string,
  source: ReadonlyArray<LocalEquivalent> = STARTER_LOCAL_EQUIVALENTS
): ResolveLocalResult {
  const hit = lookupLocalEquivalent(source, canonicalRaw, locale);
  if (hit) {
    return {
      displayName: hit.localName,
      availabilityTier: hit.availabilityTier,
      substitute: hit.localSubstitute ?? null,
      matched: true,
      resolvedLocale: hit.locale,
      notes: hit.notes ?? null,
    };
  }
  return {
    displayName: canonicalRaw,
    availabilityTier: 'common',
    substitute: null,
    matched: false,
    resolvedLocale: null,
    notes: null,
  };
}

/** Re-export for callers/tests that want the raw seed data. */
export { STARTER_LOCAL_EQUIVALENTS } from '../data/ingredientLocalEquivalents';
export type { LocalEquivalent, AvailabilityTier } from '../data/ingredientLocalEquivalents';
