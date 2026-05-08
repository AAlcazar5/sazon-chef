// ROADMAP 4.0 Tier i18n-OPS3.1 — minimal t() helper for Sazon.
//
// Why custom (not `i18n-js` / `react-i18next`)?
//   - Our key set is small (~50 high-impact strings). Full libraries add
//     ~50KB and pluralization machinery we don't need yet.
//   - Locale fallback chain matches the backend (es-MX → es → en) verbatim,
//     so server + client speak the same Spanish to the same user.
//   - Translations missing for a key → return the key itself as a "tell"
//     in development. CI catches via Tier N8.4's hardcoded-string cap.
//
// Auto-detect on import: the device's first preferred locale is read from
// `expo-localization`. The user can override via `setLocale(locale)` —
// ProfileScreen → Language picker (Tier i18n-OPS4.1, deferred).

import * as Localization from 'expo-localization';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import esMX from '../i18n/locales/es-MX.json';
import esAR from '../i18n/locales/es-AR.json';
import esES from '../i18n/locales/es-ES.json';
import esCO from '../i18n/locales/es-CO.json';
import pt from '../i18n/locales/pt.json';
import ptBR from '../i18n/locales/pt-BR.json';
import ptPT from '../i18n/locales/pt-PT.json';

export type SazonLocale =
  | 'en'
  | 'es'
  | 'es-MX'
  | 'es-AR'
  | 'es-CO'
  | 'es-ES'
  | 'pt'
  | 'pt-BR'
  | 'pt-PT';

const KNOWN_LOCALES: ReadonlySet<SazonLocale> = new Set([
  'en',
  'es',
  'es-MX',
  'es-AR',
  'es-ES',
  'es-CO',
  'pt',
  'pt-BR',
  'pt-PT',
]);

type StringDict = Record<string, string>;

const BUNDLES: Record<SazonLocale, StringDict> = {
  en: en as StringDict,
  es: es as StringDict,
  'es-MX': esMX as StringDict,
  'es-AR': esAR as StringDict,
  'es-ES': esES as StringDict,
  'es-CO': esCO as StringDict,
  pt: pt as StringDict,
  'pt-BR': ptBR as StringDict,
  'pt-PT': ptPT as StringDict,
};

/**
 * Mirrors backend `resolveCoachLocale`. Anything we don't ship a bundle for
 * walks the BCP 47 chain to its base, then to English.
 */
function normalizeLocale(raw: string | null | undefined): SazonLocale {
  if (!raw) return 'en';
  if (KNOWN_LOCALES.has(raw as SazonLocale)) return raw as SazonLocale;
  const base = raw.split('-')[0];
  if (KNOWN_LOCALES.has(base as SazonLocale)) return base as SazonLocale;
  return 'en';
}

function autoDetectLocale(): SazonLocale {
  try {
    const tags = Localization.getLocales();
    const top = tags[0]?.languageTag;
    return normalizeLocale(top);
  } catch {
    return 'en';
  }
}

let activeLocale: SazonLocale = autoDetectLocale();

/**
 * Look up a translation key. Walks the locale fallback chain:
 *   - active locale (e.g. 'es-MX')
 *   - base language (e.g. 'es')
 *   - 'en' (always present as the canonical key set)
 *
 * Returns the key itself if missing across all bundles — a development
 * "tell" so unwrapped strings don't ship silently.
 *
 * Args interpolation: `{{name}}` placeholders substitute from the args
 * object. Untouched if not provided (also a tell — the placeholder shows
 * up in the rendered string, prompting a fix).
 */
export function t(key: string, args?: Record<string, string | number>): string {
  const chain = buildFallbackChain(activeLocale);
  let raw: string | undefined;
  for (const loc of chain) {
    const candidate = BUNDLES[loc][key];
    if (typeof candidate === 'string') {
      raw = candidate;
      break;
    }
  }
  if (raw === undefined) return key;
  if (!args) return raw;
  return interpolate(raw, args);
}

function buildFallbackChain(locale: SazonLocale): SazonLocale[] {
  if (locale === 'en') return ['en'];
  if (locale === 'es') return ['es', 'en'];
  if (locale === 'pt') return ['pt', 'en'];
  // Regional Portuguese: region → base pt → en.
  if (locale === 'pt-BR' || locale === 'pt-PT') return [locale, 'pt', 'en'];
  // Regional Spanish: try region → base es → en.
  return [locale, 'es', 'en'];
}

function interpolate(
  template: string,
  args: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const v = args[name];
    return v == null ? match : String(v);
  });
}

/**
 * Override the active locale. Validates against the known set; unknown
 * tags fall back to English.
 */
export function setLocale(locale: string | SazonLocale): void {
  activeLocale = normalizeLocale(locale);
}

export function getLocale(): SazonLocale {
  return activeLocale;
}

/** Test helper — re-runs autodetect, clearing any setLocale override. */
export function __resetForTests(): void {
  activeLocale = autoDetectLocale();
}
