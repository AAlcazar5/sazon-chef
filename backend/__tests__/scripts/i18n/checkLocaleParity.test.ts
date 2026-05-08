// ROADMAP 4.0 i18n-OPS7.4 — locale-parity smoke test for CI.
//
// Walks all frontend/i18n/locales/*.json, compares each non-source bundle
// to en.json, reports missing keys + broken {{interpolation}} placeholder
// counts. Exits non-zero if any locale has gaps so CI blocks the merge.
//
// Tests cover the pure logic (checkLocaleParity) — the CLI runner is
// thin and shells out to this function.

import {
  checkLocaleParity,
  countPlaceholders,
  resolveFallbackChain,
} from '../../../scripts/i18n/checkLocaleParity';

describe('countPlaceholders', () => {
  it('counts {{name}} placeholders', () => {
    expect(countPlaceholders('Hello {{name}}')).toEqual(['name']);
    expect(countPlaceholders('No placeholder')).toEqual([]);
  });

  it('handles multiple distinct placeholders (returns sorted for stable diffs)', () => {
    expect(countPlaceholders('Hi {{name}}, you cooked {{count}} meals')).toEqual([
      'count',
      'name',
    ]);
  });

  it('dedupes repeated placeholders', () => {
    expect(countPlaceholders('{{x}} and {{x}} and {{x}}')).toEqual(['x']);
  });

  it('returns sorted output for stable diffs', () => {
    const out = countPlaceholders('{{zebra}} {{apple}} {{mango}}');
    expect(out).toEqual(['apple', 'mango', 'zebra']);
  });
});

describe('checkLocaleParity', () => {
  it('reports zero issues when target has every source key + matching placeholders', () => {
    const source = {
      'tabs.today': 'Today',
      'paywall.greeting': 'Hi {{name}}',
    };
    const target = {
      'tabs.today': 'Hoy',
      'paywall.greeting': 'Hola {{name}}',
    };
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.locale).toBe('es');
    expect(report.missingKeys).toEqual([]);
    expect(report.placeholderMismatches).toEqual([]);
    expect(report.hasIssues).toBe(false);
  });

  it('lists keys present in source but missing from target', () => {
    const source = {
      'a': 'A',
      'b': 'B',
      'c': 'C',
    };
    const target = { 'a': 'A_es' };
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.missingKeys.sort()).toEqual(['b', 'c']);
    expect(report.hasIssues).toBe(true);
  });

  it('flags placeholder mismatches when target drops a {{var}}', () => {
    const source = { 'paywall.greeting': 'Hi {{name}}, your {{plan}} is ready' };
    const target = { 'paywall.greeting': 'Hola {{name}}' }; // missing {{plan}}
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.missingKeys).toEqual([]);
    expect(report.placeholderMismatches).toHaveLength(1);
    expect(report.placeholderMismatches[0].key).toBe('paywall.greeting');
    expect(report.placeholderMismatches[0].missing.sort()).toEqual(['plan']);
    expect(report.hasIssues).toBe(true);
  });

  it('flags placeholder mismatches when target ADDS a stray {{var}}', () => {
    const source = { 'x': 'Hello' };
    const target = { 'x': 'Hola {{name}}' }; // stray placeholder
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.placeholderMismatches[0].extra.sort()).toEqual(['name']);
    expect(report.hasIssues).toBe(true);
  });

  it('aggregates missing keys + placeholder mismatches in one report', () => {
    const source = { 'a': 'A', 'b': 'Hi {{name}}' };
    const target = { 'b': 'Hola' }; // missing 'a' AND missing placeholder
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.missingKeys).toEqual(['a']);
    expect(report.placeholderMismatches).toHaveLength(1);
    expect(report.hasIssues).toBe(true);
  });

  it('skips placeholder check on missing keys (no false-positive double-flagging)', () => {
    const source = { 'a': 'Hi {{name}}' };
    const target = {}; // missing entirely
    const report = checkLocaleParity({ locale: 'es', source, target });
    expect(report.missingKeys).toEqual(['a']);
    // Don't ALSO flag a placeholder mismatch — the key is missing, period.
    expect(report.placeholderMismatches).toEqual([]);
  });

  it('respects an allowlist of keys intentionally untranslated', () => {
    const source = { 'a': 'A', 'brand.name': 'Sazon' };
    const target = { 'a': 'A_es' }; // brand.name missing
    const report = checkLocaleParity({
      locale: 'es',
      source,
      target,
      allowMissing: ['brand.name'],
    });
    expect(report.missingKeys).toEqual([]);
    expect(report.hasIssues).toBe(false);
  });

  it('walks the fallback chain (es-MX → es) before flagging missing keys', () => {
    const source = { 'a': 'A', 'b': 'B' };
    const es = { 'a': 'A_es', 'b': 'B_es' }; // base has both
    const esMX = { 'a': 'A_mx' }; // delta only — 'b' inherited from es
    const report = checkLocaleParity({
      locale: 'es-MX',
      source,
      target: esMX,
      fallbackChain: [es],
    });
    expect(report.missingKeys).toEqual([]);
    expect(report.hasIssues).toBe(false);
  });

  it('still flags keys missing from BOTH the regional file AND its base', () => {
    const source = { 'a': 'A', 'b': 'B', 'c': 'C' };
    const es = { 'a': 'A_es' }; // base missing b + c
    const esMX = { 'b': 'B_mx' }; // regional missing a + c
    const report = checkLocaleParity({
      locale: 'es-MX',
      source,
      target: esMX,
      fallbackChain: [es],
    });
    expect(report.missingKeys).toEqual(['c']);
    expect(report.hasIssues).toBe(true);
  });
});

describe('resolveFallbackChain', () => {
  const bundles = {
    en: { 'a': 'A' },
    es: { 'a': 'A_es' },
    pt: { 'a': 'A_pt' },
    fr: { 'a': 'A_fr' },
  };

  it('returns [] for a base locale (no hyphen)', () => {
    expect(resolveFallbackChain('es', bundles)).toEqual([]);
  });

  it('returns [base] for a 2-segment regional locale (es-MX → [es])', () => {
    expect(resolveFallbackChain('es-MX', bundles)).toEqual([bundles.es]);
  });

  it('returns chain in order most-specific → least-specific (deeper fallback last)', () => {
    const deeper = {
      ...bundles,
      'pt-BR': { 'a': 'A_pt_br' },
    };
    // pt-BR-Foo (hypothetical) → [pt-BR, pt]
    const chain = resolveFallbackChain('pt-BR-Foo', deeper);
    expect(chain).toEqual([deeper['pt-BR'], deeper.pt]);
  });

  it('skips fallback levels with no matching bundle', () => {
    // fr-CA → no fr-CA bundle, base fr exists → just [fr]
    expect(resolveFallbackChain('fr-CA', bundles)).toEqual([bundles.fr]);
  });
});
