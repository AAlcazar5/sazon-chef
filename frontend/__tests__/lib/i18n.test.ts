// Tier i18n-OPS3.1 — t() helper tests.
//
// Resolves translation keys against a per-locale JSON dictionary with a
// BCP 47 fallback chain (es-MX → es → en). Returns the key string itself
// when missing — useful as a "tell" in development that a string isn't
// translated yet.

// Fix the module-level locale autodetection by mocking expo-localization
// to a known value. Tests then call setLocale() to override.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

import {
  t,
  setLocale,
  getLocale,
  __resetForTests,
} from '../../lib/i18n';

beforeEach(() => {
  __resetForTests();
});

describe('t() — basic lookup', () => {
  it('returns the English string when locale=en', () => {
    setLocale('en');
    expect(t('tabs.today')).toBe('Today');
  });

  it('returns the locale-specific string when set', () => {
    setLocale('es-MX');
    expect(t('tabs.today')).toBe('Hoy');
  });

  it('falls back through the BCP 47 chain (es-VE → es → en)', () => {
    setLocale('es-VE' as never); // not in our shipped locales
    // No es-VE bundle; should fall through to base 'es' (which we ship as
    // the LatAm-neutral default), and ultimately to 'en'.
    const result = t('tabs.today');
    // Either Spanish or English is acceptable — must NOT be the raw key.
    expect(result).not.toBe('tabs.today');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the key as a tell when the key is missing across all locales', () => {
    setLocale('en');
    expect(t('completely.invented.key' as never)).toBe('completely.invented.key');
  });
});

describe('t() — args interpolation', () => {
  it('substitutes {{name}} placeholders from args', () => {
    setLocale('en');
    // Pin a string we know has interpolation:
    // (define in en.json so this works)
    expect(t('paywall.greeting' as never, { name: 'Alex' })).toMatch(/Alex/);
  });

  it('leaves placeholders untouched when args missing', () => {
    setLocale('en');
    const out = t('paywall.greeting' as never);
    // Should still contain the {{name}} marker as a tell rather than crash
    expect(out).toMatch(/\{\{name\}\}|name/i);
  });
});

describe('setLocale / getLocale', () => {
  it('persists the active locale until reset', () => {
    setLocale('es-AR');
    expect(getLocale()).toBe('es-AR');
    setLocale('es-ES');
    expect(getLocale()).toBe('es-ES');
  });

  it('rejects unknown locale tags by falling back to en', () => {
    setLocale('jp-JP' as never);
    expect(getLocale()).toBe('en');
  });

  it('__resetForTests clears the override + re-autodetects', () => {
    setLocale('es-MX');
    __resetForTests();
    // Mock returns en-US — autodetect should land on 'en'
    expect(getLocale()).toBe('en');
  });
});

describe('regional fallback chain', () => {
  it('es-MX uses Mexican strings when present', () => {
    setLocale('es-MX');
    // Mexican-specific tab label (likely same as base es, but pinning the
    // shipped JSON keys)
    expect(t('tabs.kitchen')).toBe('Cocina');
  });

  it('es-AR falls through to base es when no es-AR override exists for that key', () => {
    setLocale('es-AR');
    // Tab labels are identical across LatAm — base es covers them.
    // Voseo-specific copy (e.g. "Comé el mundo") would override.
    expect(t('tabs.today')).toBe('Hoy');
  });
});
