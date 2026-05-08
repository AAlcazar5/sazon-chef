#!/usr/bin/env ts-node
// ROADMAP 4.0 Tier i18n-OPS7 — DeepL build-time translator CLI.
//
// Reads frontend/i18n/locales/en.json, finds keys missing from the target
// locale file, calls DeepL to fill the gaps, and writes back. Existing
// (curated) translations are NEVER overwritten — this only fills holes.
//
// Usage:
//   DEEPL_API_KEY=... npx ts-node backend/scripts/i18n/translateLocale.ts <locale>
//   DEEPL_API_KEY=... npx ts-node backend/scripts/i18n/translateLocale.ts es --dry-run
//
// Locale arg follows BCP 47 in the locale-file naming: `es`, `pt`, `fr`,
// `es-MX`, `pt-BR`, etc. The DeepL target_lang is derived from the
// language-only segment (everything before the first hyphen), with a
// regional override map for the cases DeepL distinguishes (PT vs PT-BR,
// EN-US vs EN-GB).

import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  translateBatch,
  findMissingKeys,
  mergeTranslations,
  type LocaleStrings,
} from '../../src/services/i18n/deeplTranslator';

const LOCALES_DIR = path.resolve(__dirname, '../../../frontend/i18n/locales');
const SOURCE_FILE = 'en.json';
const BATCH_SIZE = 50;

// DeepL target_lang codes. Source: deepl.com/docs-api/translate-text.
// Default: uppercased language segment. Override map covers regional
// distinctions DeepL actually supports (rest fall back to base language).
//
// Project convention (i18n-OPS3.4): `pt.json` is the BR-leaning base, with
// `pt-BR.json` as a delta and `pt-PT.json` for European Portuguese. So we
// map bare `pt` → `PT-BR` here — DeepL's default `PT` is European, which
// would write `Apagar/teu/A pesquisar` into a BR-voiced bundle.
const TARGET_LANG_OVERRIDES: Record<string, string> = {
  pt: 'PT-BR',
  'pt-BR': 'PT-BR',
  'pt-PT': 'PT-PT',
  'en-US': 'EN-US',
  'en-GB': 'EN-GB',
};

function resolveTargetLang(locale: string): string {
  return TARGET_LANG_OVERRIDES[locale] ?? locale.split('-')[0].toUpperCase();
}

async function readJson(file: string): Promise<LocaleStrings> {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as LocaleStrings;
}

async function writeJson(file: string, data: LocaleStrings): Promise<void> {
  // Stable key order = source order; preserves diff-ability across runs.
  const ordered: LocaleStrings = {};
  for (const k of Object.keys(data)) ordered[k] = data[k];
  await fs.writeFile(file, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
}

async function loadTarget(file: string): Promise<LocaleStrings> {
  try {
    return await readJson(file);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

export async function run(
  locale: string,
  dryRun: boolean,
): Promise<{ added: number; skipped: number }> {
  if (!locale) throw new Error('Usage: translateLocale.ts <locale> [--dry-run]');

  const sourcePath = path.join(LOCALES_DIR, SOURCE_FILE);
  const targetPath = path.join(LOCALES_DIR, `${locale}.json`);
  const targetLang = resolveTargetLang(locale);

  const source = await readJson(sourcePath);
  const target = await loadTarget(targetPath);
  const missing = findMissingKeys(source, target);

  if (missing.length === 0) {
    console.log(`[i18n] ${locale}: nothing to translate (${Object.keys(target).length} keys present).`);
    return { added: 0, skipped: 0 };
  }

  console.log(`[i18n] ${locale}: ${missing.length} missing key(s) → DeepL ${targetLang}`);
  if (dryRun) {
    for (const k of missing.slice(0, 20)) console.log(`  - ${k}: "${source[k]}"`);
    if (missing.length > 20) console.log(`  …and ${missing.length - 20} more`);
    console.log('[i18n] dry-run: no API calls, no writes.');
    return { added: 0, skipped: missing.length };
  }

  const additions: LocaleStrings = {};
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const slice = missing.slice(i, i + BATCH_SIZE);
    const inputs = slice.map((k) => source[k]);
    const outputs = await translateBatch(inputs, targetLang, { sourceLang: 'EN' });
    slice.forEach((k, idx) => {
      additions[k] = outputs[idx];
    });
  }

  const merged = mergeTranslations(target, additions);
  await writeJson(targetPath, merged);
  console.log(`[i18n] ${locale}: wrote ${missing.length} new keys to ${path.relative(process.cwd(), targetPath)}`);
  return { added: missing.length, skipped: 0 };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const locale = args.find((a) => !a.startsWith('--')) ?? '';
  const dryRun = args.includes('--dry-run');
  run(locale, dryRun).catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
