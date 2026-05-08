// I2.2 — frontend ingredient localizer tests.

import {
  normalizeIngredientName,
  lookupLocalEquivalent,
  resolveLocal,
  localizeIngredientText,
  STARTER_LOCAL_EQUIVALENTS,
  type LocalEquivalent,
} from '../../lib/ingredientLocal';

describe('normalizeIngredientName (frontend)', () => {
  it('strips accents (Açaí → acai, jalapeño → jalapeno)', () => {
    expect(normalizeIngredientName('Açaí')).toBe('acai');
    expect(normalizeIngredientName('jalapeño')).toBe('jalapeno');
  });

  it('lowercases + collapses whitespace', () => {
    expect(normalizeIngredientName(' BLACK   BEANS ')).toBe('black beans');
  });

  it('returns empty string on empty input', () => {
    expect(normalizeIngredientName('')).toBe('');
  });
});

describe('resolveLocal (frontend mirror of backend)', () => {
  it('kale + pt-BR → couve manteiga, common', () => {
    const r = resolveLocal('kale', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.displayName).toBe('couve manteiga');
    expect(r.availabilityTier).toBe('common');
  });

  it('huitlacoche + en-US → specialty + substitute', () => {
    const r = resolveLocal('huitlacoche', 'en-US');
    expect(r.availabilityTier).toBe('specialty');
    expect(r.substitute).toMatch(/poblano/);
  });

  it('unknown ingredient → matched=false, no throw', () => {
    const r = resolveLocal('unobtainium', 'pt-BR');
    expect(r.matched).toBe(false);
    expect(r.displayName).toBe('unobtainium');
  });

  it('unknown locale → falls back to en-US', () => {
    const r = resolveLocal('kale', 'jp-JP');
    expect(r.resolvedLocale).toBe('en-US');
  });

  it('accent-bearing input matches canonical (Açaí → acai)', () => {
    const r = resolveLocal('Açaí', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.displayName).toBe('açaí');
  });
});

describe('lookupLocalEquivalent — fallback chain', () => {
  const rows: LocalEquivalent[] = [
    { canonical: 'kale', locale: 'en-US', localName: 'kale', availabilityTier: 'common' },
    { canonical: 'kale', locale: 'es', localName: 'col rizada', availabilityTier: 'common' },
    { canonical: 'kale', locale: 'pt-BR', localName: 'couve manteiga', availabilityTier: 'common' },
  ];

  it('exact-match wins over base-language', () => {
    expect(lookupLocalEquivalent(rows, 'kale', 'pt-BR')?.localName).toBe('couve manteiga');
  });

  it('base-language match when no regional row (es-VE → es)', () => {
    expect(lookupLocalEquivalent(rows, 'kale', 'es-VE')?.localName).toBe('col rizada');
  });

  it('falls all the way through to en-US', () => {
    expect(lookupLocalEquivalent(rows, 'kale', 'fr-FR')?.locale).toBe('en-US');
  });
});

describe('localizeIngredientText — freeform line localization', () => {
  it('swaps the canonical ingredient inside a freeform string', () => {
    const r = localizeIngredientText('2 cups kale, chopped', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.localized).toBe('2 cups couve manteiga, chopped');
    expect(r.canonical).toBe('kale');
  });

  it('multi-word canonicals win over their substring (black beans > beans)', () => {
    const r = localizeIngredientText('1 can black beans', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.localized).toBe('1 can feijão preto');
    expect(r.canonical).toBe('black beans');
  });

  it('preserves capitalization elsewhere in the line', () => {
    const r = localizeIngredientText('Cooked Kale (rough chop)', 'pt-BR');
    expect(r.matched).toBe(true);
    expect(r.localized).toMatch(/Cooked .* \(rough chop\)/);
    expect(r.localized).toContain('couve manteiga');
  });

  it('handles accented input source text', () => {
    const r = localizeIngredientText('1 cup Açaí pulp', 'es-MX');
    // Canonical key is 'acai' (NFD-stripped); es-MX displayName is 'açaí',
    // so an accent-only "translation" still counts as a match — the user
    // sees the proper accented spelling in their locale.
    expect(r.matched).toBe(true);
    expect(r.canonical).toBe('acai');
    expect(r.availabilityTier).toBe('specialty');
    expect(r.localized).toContain('açaí');
  });

  it('returns the original text unchanged when locale is en-US', () => {
    const r = localizeIngredientText('2 cups kale, chopped', 'en-US');
    expect(r.localized).toBe('2 cups kale, chopped');
    expect(r.matched).toBe(false);
  });

  it('returns substitute hint for specialty/rare matches', () => {
    const r = localizeIngredientText('1 cup huitlacoche', 'pt-BR');
    expect(r.availabilityTier).toBe('rare');
    expect(r.substitute).toMatch(/cogumelo|pimentão/);
  });

  it('returns the input unchanged when no catalog ingredient is present', () => {
    const r = localizeIngredientText('1 tsp gold dust', 'pt-BR');
    expect(r.matched).toBe(false);
    expect(r.localized).toBe('1 tsp gold dust');
    expect(r.canonical).toBeNull();
  });

  it('empty string is safe', () => {
    const r = localizeIngredientText('', 'pt-BR');
    expect(r.localized).toBe('');
    expect(r.matched).toBe(false);
  });

  it('ignores word that contains canonical as a substring (planters vs plantain)', () => {
    const r = localizeIngredientText('1 cup planters peanuts', 'pt-BR');
    // 'plantain' must not match 'planters' — whole-word boundary.
    expect(r.canonical).not.toBe('plantain');
  });
});

describe('STARTER_LOCAL_EQUIVALENTS — frontend mirror integrity', () => {
  it('every row has a normalized canonical', () => {
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      expect(row.canonical).toBe(normalizeIngredientName(row.canonical));
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

  it('locales are BCP 47 well-formed', () => {
    const ok = /^[a-z]{2}(-[A-Z]{2})?$/;
    for (const row of STARTER_LOCAL_EQUIVALENTS) {
      expect(row.locale).toMatch(ok);
    }
  });
});
