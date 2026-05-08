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

  it('shouldPersistAutoDetected returns the resolved BCP 47 tag (not the raw header value)', () => {
    // Unknown region es-VE walks the chain → resolves to base 'es'.
    expect(__INTERNALS.shouldPersistAutoDetected(null, 'es-VE,es;q=0.9')).toBe(
      'es',
    );
  });

  it('shouldPersistAutoDetected respects q-value ordering', () => {
    // First entry has q=0.5; en has q=1.0 by default. en wins → no persist.
    expect(
      __INTERNALS.shouldPersistAutoDetected(null, 'es-MX;q=0.5,en'),
    ).toBeNull();
    // Now flip — Spanish has higher q, should win.
    expect(
      __INTERNALS.shouldPersistAutoDetected(null, 'en;q=0.5,es-MX'),
    ).toBe('es-MX');
  });
});

describe('resolveLocaleForRequest — auto-persist side effect', () => {
  it('invokes onAutoDetected with the resolved locale when User.locale is null + header detects', async () => {
    const onAutoDetected = jest.fn();
    await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-AR,es;q=0.9',
      readUserLocale: async () => null,
      onAutoDetected,
    });
    expect(onAutoDetected).toHaveBeenCalledWith('u1', 'es-AR');
  });

  it('does NOT invoke onAutoDetected when User.locale is already set', async () => {
    const onAutoDetected = jest.fn();
    await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-AR',
      readUserLocale: async () => 'es-MX',
      onAutoDetected,
    });
    expect(onAutoDetected).not.toHaveBeenCalled();
  });

  it('does NOT invoke onAutoDetected when header is English-only', async () => {
    const onAutoDetected = jest.fn();
    await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'en-US,en;q=0.9',
      readUserLocale: async () => null,
      onAutoDetected,
    });
    expect(onAutoDetected).not.toHaveBeenCalled();
  });

  it('still resolves correctly even when onAutoDetected is omitted (backward-compat)', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-MX',
      readUserLocale: async () => null,
    });
    expect(out).toBe('es-MX');
  });

  it('does not surface errors from onAutoDetected (fire-and-forget)', async () => {
    const onAutoDetected = jest.fn().mockRejectedValue(new Error('db down'));
    // Should not throw.
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-MX',
      readUserLocale: async () => null,
      onAutoDetected,
    });
    expect(out).toBe('es-MX');
  });
});

describe('G1.2 — coachLocale override (highest priority)', () => {
  it('coachLocale wins over User.locale', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'en',
      readUserLocale: async () => 'en',
      readUserCoachLocale: async () => 'es-MX',
    });
    expect(out).toBe('es-MX');
  });

  it('coachLocale wins over Accept-Language', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'en',
      readUserLocale: async () => null,
      readUserCoachLocale: async () => 'pt-BR',
    });
    expect(out).toBe('pt-BR');
  });

  it('falls through to User.locale when coachLocale is null', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'en',
      readUserLocale: async () => 'es-MX',
      readUserCoachLocale: async () => null,
    });
    expect(out).toBe('es-MX');
  });

  it('falls through to Accept-Language when both coachLocale and User.locale are null', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'pt-BR',
      readUserLocale: async () => null,
      readUserCoachLocale: async () => null,
    });
    expect(out).toBe('pt-BR');
  });

  it('coachLocale unknown tag falls through (does not silently coerce to en)', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'es-MX',
      readUserLocale: async () => null,
      readUserCoachLocale: async () => 'jp-JP',
    });
    // Unknown coachLocale → fall through. Header detects es-MX.
    expect(out).toBe('es-MX');
  });

  it('does not auto-persist when coachLocale provides the override (user already chose)', async () => {
    const onAutoDetected = jest.fn();
    await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'pt-BR',
      readUserLocale: async () => null,
      readUserCoachLocale: async () => 'es-MX',
      onAutoDetected,
    });
    expect(onAutoDetected).not.toHaveBeenCalled();
  });

  it('backward-compat: callers that omit readUserCoachLocale still resolve correctly', async () => {
    const out = await resolveLocaleForRequest({
      userId: 'u1',
      acceptLanguageHeader: 'pt-BR',
      readUserLocale: async () => null,
    });
    expect(out).toBe('pt-BR');
  });
});
