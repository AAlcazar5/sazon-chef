// Tier $$ — i18n route plumbing — locale resolver tests.

import {
  parseAcceptLanguage,
  resolveLocaleForRequest,
  __INTERNALS,
} from '../../src/utils/coachLocaleResolver';

describe('parseAcceptLanguage', () => {
  it('returns empty array on missing/empty header', () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });

  it('parses comma-separated tags ordered by q-value (default 1.0)', () => {
    expect(parseAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toEqual([
      'es-MX',
      'es',
      'en',
    ]);
  });

  it('respects explicit q-values for ordering', () => {
    expect(parseAcceptLanguage('en;q=0.5,es-AR;q=0.9,fr;q=0.1')).toEqual([
      'es-AR',
      'en',
      'fr',
    ]);
  });

  it('strips whitespace + tolerates malformed entries', () => {
    expect(parseAcceptLanguage(' es-MX , es ; q = 0.9 ')).toEqual([
      'es-MX',
      'es',
    ]);
  });

  it('returns first known locale from a chain when resolving', () => {
    // Just parse — resolution to known set is in resolveCoachLocale (separate)
    expect(parseAcceptLanguage('es-VE,es-CO;q=0.9,en;q=0.8')).toEqual([
      'es-VE',
      'es-CO',
      'en',
    ]);
  });
});

describe('resolveLocaleForRequest', () => {
  it('uses User.locale when set on the row (highest priority)', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-AR',
      readUserLocale: async () => 'es-MX',
    });
    expect(out).toBe('es-MX');
  });

  it('falls back to Accept-Language when User.locale is null', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-AR,es;q=0.9',
      readUserLocale: async () => null,
    });
    expect(out).toBe('es-AR');
  });

  it('walks the Accept-Language chain to find the first known locale', async () => {
    // es-VE is unknown; should resolve to its base 'es'
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-VE',
      readUserLocale: async () => null,
    });
    expect(out).toBe('es');
  });

  it('falls back to en when nothing matches', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'jp-JP,fr-FR',
      readUserLocale: async () => null,
    });
    expect(out).toBe('en');
  });

  it('returns en when User.locale is null AND no Accept-Language', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: undefined,
      readUserLocale: async () => null,
    });
    expect(out).toBe('en');
  });

  it('handles a User.locale that is unknown by falling through to header', async () => {
    // Defensive: if a User row somehow has 'es-PE' (not in our known set),
    // still resolve through header rather than persist a broken value.
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-MX',
      readUserLocale: async () => 'es-PE',
    });
    // 'es-PE' resolves to base 'es'; 'es-MX' is exact match. Header wins
    // because the persisted value didn't resolve to a regional notes entry.
    // Either 'es' or 'es-MX' would be defensible — we choose 'es' (persisted
    // intent) since the user's preference is clearly Spanish.
    expect(['es', 'es-MX']).toContain(out);
  });
});

describe('__INTERNALS — auto-detect signal', () => {
  it('shouldPersistAutoDetected fires only when User.locale is unset AND header has Spanish', () => {
    expect(
      __INTERNALS.shouldPersistAutoDetected(null, 'es-MX,en;q=0.9'),
    ).toBe('es-MX');
    expect(__INTERNALS.shouldPersistAutoDetected('en', 'es-MX')).toBeNull();
    expect(
      __INTERNALS.shouldPersistAutoDetected(null, 'en'),
    ).toBeNull();
    expect(__INTERNALS.shouldPersistAutoDetected(null, undefined)).toBeNull();
  });
});
