// I2.1 — ingredientLocalService tests.
//
// Covers the spec from the roadmap entry:
//   resolveLocal('kale', 'pt-BR') → couve manteiga, common
//   resolveLocal('huitlacoche', 'es-MX') → common
//   resolveLocal('huitlacoche', 'en-US') → specialty + substitute
//   unknown ingredient or unknown locale → no throw, canonical fallback
//   accent normalization handles 'Açaí' → 'acai'
//
// Plus: BCP 47 fallback chain (exact → base → en-US), substitute hint
// surfaces only on non-common tiers, normalization idempotency.

import {
  normalizeIngredientName,
  lookupLocalEquivalent,
  resolveLocal,
  STARTER_LOCAL_EQUIVALENTS,
  type LocalEquivalent,
} from '../../src/services/ingredientLocalService';

describe('normalizeIngredientName', () => {
  it('strips accents (Açaí → acai)', () => {
    expect(normalizeIngredientName('Açaí')).toBe('acai');
    expect(normalizeIngredientName('jalapeño')).toBe('jalapeno');
  });

  it('lowercases + trims', () => {
    expect(normalizeIngredientName('  KALE  ')).toBe('kale');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeIngredientName('black\tbeans')).toBe('black beans');
    expect(normalizeIngredientName('black  beans')).toBe('black beans');
  });

  it('returns empty string on empty input', () => {
    expect(normalizeIngredientName('')).toBe('');
  });

  it('is idempotent', () => {
    const once = normalizeIngredientName('Açaí');
    const twice = normalizeIngredientName(once);
    expect(twice).toBe(once);
  });
});

describe('resolveLocal — roadmap spec', () => {
  it('kale + pt-BR → couve manteiga, common', () => {
    const r = resolveLocal('kale', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.displayName).toBe('couve manteiga');
    expect(r.availabilityTier).toBe('common');
    expect(r.resolvedLocale).toBe('pt-BR');
  });

  it('huitlacoche + es-MX → common (no substitute needed)', () => {
    const r = resolveLocal('huitlacoche', 'es-MX');
    expect(r.matched).toBe(true);
    expect(r.availabilityTier).toBe('common');
    expect(r.displayName).toBe('huitlacoche');
  });

  it('huitlacoche + en-US → specialty + substitute hint', () => {
    const r = resolveLocal('huitlacoche', 'en-US');
    expect(r.matched).toBe(true);
    expect(r.availabilityTier).toBe('specialty');
    expect(r.substitute).toMatch(/poblano/);
  });

  it('unknown ingredient → canonical fallback, never throws', () => {
    const r = resolveLocal('unobtainium', 'es-MX');
    expect(r.matched).toBe(false);
    expect(r.displayName).toBe('unobtainium');
    expect(r.resolvedLocale).toBeNull();
  });

  it('unknown locale → falls back to en-US for known ingredient', () => {
    const r = resolveLocal('kale', 'jp-JP');
    expect(r.matched).toBe(true);
    // Walks chain jp-JP → jp (none) → en-US, lands on en-US 'kale'
    expect(r.resolvedLocale).toBe('en-US');
    expect(r.displayName).toBe('kale');
  });

  it('handles input with accents (Açaí + pt-BR)', () => {
    const r = resolveLocal('Açaí', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.displayName).toBe('açaí');
    expect(r.availabilityTier).toBe('common');
  });

  it('handles uppercase + whitespace input', () => {
    const r = resolveLocal('  KALE  ', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.displayName).toBe('couve manteiga');
  });
});

describe('lookupLocalEquivalent — fallback chain', () => {
  const rows: LocalEquivalent[] = [
    { canonical: 'kale', locale: 'en-US', localName: 'kale', availabilityTier: 'common' },
    { canonical: 'kale', locale: 'es', localName: 'col rizada', availabilityTier: 'common' },
    { canonical: 'kale', locale: 'pt-BR', localName: 'couve manteiga', availabilityTier: 'common' },
  ];

  it('exact-match wins over base-language match', () => {
    const r = lookupLocalEquivalent(rows, 'kale', 'pt-BR');
    expect(r?.localName).toBe('couve manteiga');
  });

  it('base-language match when no regional row exists (es-VE → es)', () => {
    const r = lookupLocalEquivalent(rows, 'kale', 'es-VE');
    expect(r?.localName).toBe('col rizada');
  });

  it('falls all the way through to en-US when no other rows match', () => {
    const r = lookupLocalEquivalent(rows, 'kale', 'fr-FR');
    expect(r?.localName).toBe('kale');
    expect(r?.locale).toBe('en-US');
  });

  it('returns null when ingredient is unknown', () => {
    const r = lookupLocalEquivalent(rows, 'huitlacoche', 'es-MX');
    expect(r).toBeNull();
  });

  it('handles missing locale (empty string) by falling to en-US', () => {
    const r = lookupLocalEquivalent(rows, 'kale', '');
    expect(r?.locale).toBe('en-US');
  });
});

describe('resolveLocal — output shape contract', () => {
  it('matched=true entries surface notes when present', () => {
    const r = resolveLocal('kale', 'pt-BR');
    expect(r.notes).toMatch(/couve/i);
  });

  it('substitute is null on common-tier matches without an explicit sub', () => {
    const r = resolveLocal('cilantro', 'pt-BR');
    expect(r.substitute).toBeNull();
    expect(r.availabilityTier).toBe('common');
  });

  it('substitute populates on specialty/rare matches', () => {
    const r = resolveLocal('chayote', 'en-US');
    expect(r.availabilityTier).toBe('specialty');
    expect(r.substitute).toBe('zucchini');
  });

  it('canonical fallback (no match) returns common + no substitute + matched=false', () => {
    const r = resolveLocal('snozberry', 'pt-BR');
    expect(r.matched).toBe(false);
    expect(r.availabilityTier).toBe('common');
    expect(r.substitute).toBeNull();
    expect(r.notes).toBeNull();
  });
});

describe('STARTER_LOCAL_EQUIVALENTS — data integrity', () => {
  it('every row has a normalized-form canonical', () => {
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      expect(row.canonical).toBe(normalizeIngredientName(row.canonical));
    }
  });

  it('availabilityTier is one of common | specialty | rare', () => {
    const allowed = new Set(['common', 'specialty', 'rare']);
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      expect(allowed.has(row.availabilityTier)).toBe(true);
    }
  });

  it('no duplicate (canonical, locale) pairs', () => {
    const seen = new Set<string>();
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      const key = `${row.canonical}::${row.locale}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('locales used are all BCP 47 well-formed', () => {
    const ok = /^[a-z]{2}(-[A-Z]{2})?$/;
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      expect(row.locale).toMatch(ok);
    }
  });

  it('every specialty/rare row carries a localSubstitute when sensible', () => {
    // We allow specialty rows with no sub when localName == canonical and
    // substitution doesn't apply (e.g. 'açaí' in es-MX is just açaí).
    // Just assert that *most* specialty/rare rows have substitutes.
    const nonCommon = STARTER_LOCAL_EQUIVALENTS.filter(
      (r) => r.availabilityTier !== 'common'
    );
    const withSub = nonCommon.filter((r) => r.localSubstitute);
    expect(nonCommon.length).toBeGreaterThan(0);
    expect(withSub.length / nonCommon.length).toBeGreaterThanOrEqual(0.5);
  });
});
