// frontend/lib/ingredientLocal.ts
// ROADMAP 4.0 I2.2 — Frontend-side resolver for local ingredient names.
//
// Mirrors `backend/src/services/ingredientLocalService.ts` so recipe
// detail + Build-a-Plate slot UI can render local equivalents without
// a server round-trip. Recipe text in the DB stays canonical (English) —
// localization is a presentation-layer concern.
//
// MIRROR INVARIANT
// ──────────────────────────────────────────────────────────────────────────
// The catalog below MUST stay in lockstep with
// `backend/src/data/ingredientLocalEquivalents.ts`. The single starter
// row count is small (~30) so a manual mirror is cheaper than wiring a
// catalog endpoint. When the catalog crosses ~100 entries OR ships a
// Prisma backing, replace this with a fetch + cache strategy.
//
// Editorial rules: see the backend data file's header.

export type AvailabilityTier = 'common' | 'specialty' | 'rare';

export interface LocalEquivalent {
  canonical: string;
  locale: string;
  localName: string;
  localSubstitute?: string;
  availabilityTier: AvailabilityTier;
  notes?: string;
}

const COLLAPSE_WHITESPACE = /\s+/g;

/** Match-the-backend normalization: NFD strip-accents + lowercase + collapse. */
export function normalizeIngredientName(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(COLLAPSE_WHITESPACE, ' ');
}

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

// MIRROR of backend STARTER_LOCAL_EQUIVALENTS — keep in sync per the
// invariant note above.
export const STARTER_LOCAL_EQUIVALENTS: ReadonlyArray<LocalEquivalent> = [
  { canonical: 'kale', locale: 'en-US', localName: 'kale', availabilityTier: 'common' },
  { canonical: 'kale', locale: 'pt-BR', localName: 'couve manteiga', availabilityTier: 'common' },
  { canonical: 'kale', locale: 'es-MX', localName: 'kale', localSubstitute: 'acelga', availabilityTier: 'specialty' },

  { canonical: 'huitlacoche', locale: 'es-MX', localName: 'huitlacoche', availabilityTier: 'common' },
  { canonical: 'huitlacoche', locale: 'en-US', localName: 'huitlacoche', localSubstitute: 'roasted poblano + cremini mushrooms', availabilityTier: 'specialty' },
  { canonical: 'huitlacoche', locale: 'pt-BR', localName: 'huitlacoche', localSubstitute: 'cogumelo paris + pimentão assado', availabilityTier: 'rare' },

  { canonical: 'tomatillo', locale: 'es-MX', localName: 'tomate verde', availabilityTier: 'common' },
  { canonical: 'tomatillo', locale: 'en-US', localName: 'tomatillo', availabilityTier: 'common' },
  { canonical: 'tomatillo', locale: 'pt-BR', localName: 'tomatillo', localSubstitute: 'tomate verde mexicano (mercado importado)', availabilityTier: 'rare' },

  { canonical: 'cassava', locale: 'en-US', localName: 'yuca', availabilityTier: 'specialty' },
  { canonical: 'cassava', locale: 'es-MX', localName: 'yuca', availabilityTier: 'common' },
  { canonical: 'cassava', locale: 'pt-BR', localName: 'mandioca', availabilityTier: 'common' },

  { canonical: 'acai', locale: 'pt-BR', localName: 'açaí', availabilityTier: 'common' },
  { canonical: 'acai', locale: 'en-US', localName: 'açaí', availabilityTier: 'common' },
  { canonical: 'acai', locale: 'es-MX', localName: 'açaí', availabilityTier: 'specialty' },

  { canonical: 'chayote', locale: 'es-MX', localName: 'chayote', availabilityTier: 'common' },
  { canonical: 'chayote', locale: 'en-US', localName: 'chayote', localSubstitute: 'zucchini', availabilityTier: 'specialty' },
  { canonical: 'chayote', locale: 'pt-BR', localName: 'chuchu', availabilityTier: 'common' },

  { canonical: 'pumpkin', locale: 'en-US', localName: 'pumpkin', availabilityTier: 'common' },
  { canonical: 'pumpkin', locale: 'es-MX', localName: 'calabaza', availabilityTier: 'common' },
  { canonical: 'pumpkin', locale: 'pt-BR', localName: 'abóbora', availabilityTier: 'common' },

  { canonical: 'cilantro', locale: 'en-US', localName: 'cilantro', availabilityTier: 'common' },
  { canonical: 'cilantro', locale: 'es-MX', localName: 'cilantro', availabilityTier: 'common' },
  { canonical: 'cilantro', locale: 'pt-BR', localName: 'coentro', availabilityTier: 'common' },

  { canonical: 'plantain', locale: 'en-US', localName: 'plantain', availabilityTier: 'specialty' },
  { canonical: 'plantain', locale: 'es-MX', localName: 'plátano macho', availabilityTier: 'common' },
  { canonical: 'plantain', locale: 'pt-BR', localName: 'banana-da-terra', availabilityTier: 'common' },

  { canonical: 'black beans', locale: 'en-US', localName: 'black beans', availabilityTier: 'common' },
  { canonical: 'black beans', locale: 'es-MX', localName: 'frijoles negros', availabilityTier: 'common' },
  { canonical: 'black beans', locale: 'pt-BR', localName: 'feijão preto', availabilityTier: 'common' },
];

/** Pure: walk the locale chain looking for the best match. */
export function lookupLocalEquivalent(
  rows: ReadonlyArray<LocalEquivalent>,
  canonicalRaw: string,
  locale: string
): LocalEquivalent | null {
  const canonical = normalizeIngredientName(canonicalRaw);
  if (!canonical) return null;
  const chain = buildLocaleChain(locale);
  for (const loc of chain) {
    const hit = rows.find((r) => r.canonical === canonical && r.locale === loc);
    if (hit) return hit;
  }
  return null;
}

export interface ResolveLocalResult {
  displayName: string;
  availabilityTier: AvailabilityTier;
  substitute: string | null;
  matched: boolean;
  resolvedLocale: string | null;
  notes: string | null;
}

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

// ─── Freeform-text localization ────────────────────────────────────────────
//
// Recipe ingredient strings are freeform: "2 cups kale, chopped". We need
// to find the canonical INGREDIENT NAME inside the text, not the whole
// string. Strategy: walk every catalog row whose locale matches en-US
// (the canonical key) and check whether its `canonical` appears in the
// normalized input text (whole-word match). First match wins by longest
// canonical (so "black beans" beats "beans" when both are catalogued).
//
// Input substitution preserves the rest of the text — quantities, units,
// prep notes ("chopped", "diced") — so "2 cups kale, chopped" becomes
// "2 cups couve manteiga, chopped".

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface LocalizedIngredientText {
  /** Original input, unchanged. */
  original: string;
  /** Localized version (same as `original` when no canonical found). */
  localized: string;
  /** True iff a catalog entry was applied. */
  matched: boolean;
  /** Tier of the resolved match (defaults to 'common' when unmatched). */
  availabilityTier: AvailabilityTier;
  /** Substitute hint to render inline when tier !== 'common'. */
  substitute: string | null;
  /** The canonical ingredient name we matched, if any. */
  canonical: string | null;
}

function listCanonicals(
  source: ReadonlyArray<LocalEquivalent>
): string[] {
  const set = new Set<string>();
  for (const row of source) set.add(row.canonical);
  // Longest first so multi-word canonicals win over their substrings.
  return [...set].sort((a, b) => b.length - a.length);
}

/**
 * Localize a freeform ingredient line. Finds the catalog ingredient
 * embedded in `text`, replaces it with the locale-appropriate name,
 * preserves quantities / units / prep notes.
 */
export function localizeIngredientText(
  text: string,
  locale: string,
  source: ReadonlyArray<LocalEquivalent> = STARTER_LOCAL_EQUIVALENTS
): LocalizedIngredientText {
  if (!text) {
    return {
      original: text,
      localized: text,
      matched: false,
      availabilityTier: 'common',
      substitute: null,
      canonical: null,
    };
  }
  const normalizedText = normalizeIngredientName(text);
  for (const canonical of listCanonicals(source)) {
    // Whole-word match against the normalized text.
    const re = new RegExp(`\\b${escapeRegExp(canonical)}\\b`);
    if (!re.test(normalizedText)) continue;
    const resolved = resolveLocal(canonical, locale, source);
    // For en-US (or any locale where displayName === canonical), keep the
    // text unchanged but still report tier + substitute so the UI can
    // render an inline sub hint when the canonical itself is specialty.
    const sameAsCanonical = !resolved.matched || resolved.displayName === canonical;
    if (sameAsCanonical) {
      return {
        original: text,
        localized: text,
        matched: false,
        availabilityTier: resolved.availabilityTier,
        substitute: resolved.substitute,
        canonical,
      };
    }
    // Substitute against the original text (case-insensitive, accent-aware).
    // Casing outside the substitution is preserved.
    const swapped = swapInOriginal(text, canonical, resolved.displayName);
    return {
      original: text,
      localized: swapped,
      matched: true,
      availabilityTier: resolved.availabilityTier,
      substitute: resolved.substitute,
      canonical,
    };
  }
  return {
    original: text,
    localized: text,
    matched: false,
    availabilityTier: 'common',
    substitute: null,
    canonical: null,
  };
}

function swapInOriginal(
  text: string,
  canonical: string,
  replacement: string
): string {
  // Build a regex that matches `canonical` ignoring case AND ignoring
  // accents in the source text. For each char in canonical, generate a
  // class that accepts either the bare char or any accented variant.
  const pattern = canonical
    .split('')
    .map((c) => {
      if (c === ' ') return '\\s+';
      const lower = c.toLowerCase();
      // Common accent-folding pairs we'd see in en-US ingredient text.
      const variants: Record<string, string> = {
        a: 'aáàâãä',
        c: 'cç',
        e: 'eéèêë',
        i: 'iíìîï',
        n: 'nñ',
        o: 'oóòôõö',
        u: 'uúùûü',
      };
      const set = variants[lower] ?? lower;
      const upper = set.toUpperCase();
      return `[${set}${upper}]`;
    })
    .join('');
  // Unicode-aware boundaries — \b is ASCII-only, which fails on trailing
  // accented characters like "Açaí" (the í falls outside JS's default
  // \w class so \b on either side stops working). Use \p{L} negative
  // lookarounds with the u flag instead.
  const re = new RegExp(`(?<!\\p{L})${pattern}(?!\\p{L})`, 'u');
  return text.replace(re, replacement);
}
