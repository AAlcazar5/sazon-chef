// ROADMAP 4.0 Tier i18n-OPS7 — DeepL translator (build-time helper).
//
// Used by `backend/scripts/i18n/translateLocale.ts` to seed and refresh
// `frontend/i18n/locales/<lang>.json` from `en.json`. NOT wired into the
// runtime — translation is a build-time / CI step. No DeepL key ever ships
// in the app bundle.
//
// Placeholder strategy: i18n strings carry `{{var}}` interpolation tokens.
// DeepL's xml tag handling lets us wrap them as `<x>var</x>` so the
// translator leaves them as-is, then we unwrap on the way out. `<x>` is
// added to `ignore_tags` so the inner text is not translated either.

const FREE_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';

export type TranslateOptions = {
  sourceLang?: string;
};

export function __test_only_pickEndpoint(apiKey: string): string {
  return apiKey.endsWith(':fx') ? FREE_ENDPOINT : PRO_ENDPOINT;
}

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

function wrapPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER_RE, (_, name) => `<x>${name}</x>`);
}

function unwrapPlaceholders(text: string): string {
  return text.replace(/<x>(\w+)<\/x>/g, (_, name) => `{{${name}}}`);
}

export async function translateBatch(
  texts: readonly string[],
  targetLang: string,
  opts: TranslateOptions = {},
): Promise<string[]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPL_API_KEY is not set. Get a free key at https://www.deepl.com/pro-api and export it before running this script.',
    );
  }

  const wrapped = texts.map(wrapPlaceholders);
  const body: Record<string, unknown> = {
    text: wrapped,
    target_lang: targetLang,
    tag_handling: 'xml',
    ignore_tags: ['x'],
  };
  if (opts.sourceLang) body.source_lang = opts.sourceLang;

  const resp = await fetch(__test_only_pickEndpoint(apiKey), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`DeepL request failed: ${resp.status} ${errBody}`);
  }

  const json = (await resp.json()) as { translations: { text: string }[] };
  return json.translations.map((t) => unwrapPlaceholders(t.text));
}

export type LocaleStrings = Record<string, string>;

export function findMissingKeys(
  source: LocaleStrings,
  target: LocaleStrings,
): string[] {
  return Object.keys(source).filter((k) => !target[k]);
}

export function mergeTranslations(
  target: LocaleStrings,
  additions: LocaleStrings,
): LocaleStrings {
  const out: LocaleStrings = { ...target };
  for (const [k, v] of Object.entries(additions)) {
    if (v && !out[k]) out[k] = v;
  }
  return out;
}
