#!/usr/bin/env ts-node
// ROADMAP 4.0 i18n-OPS7.4 — locale-parity smoke test for CI.
//
// Walks every `frontend/i18n/locales/*.json` (skipping the source bundle
// `en.json`), reports missing keys + broken `{{interpolation}}` placeholder
// counts vs the source. Exits non-zero when any locale has gaps so CI
// can block the merge.
//
// Usage:
//   npx ts-node backend/scripts/i18n/checkLocaleParity.ts
//   npx ts-node backend/scripts/i18n/checkLocaleParity.ts --json
//   npx ts-node backend/scripts/i18n/checkLocaleParity.ts --allow-missing brand.name
//
// Exit codes:
//   0 — every non-source locale has every source key with matching
//       placeholders (clean parity).
//   1 — at least one locale has issues (missing key, placeholder
//       mismatch). The report is printed to stdout.
//   2 — script error (missing source file, malformed JSON, etc.).

import { promises as fs } from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../../../frontend/i18n/locales');
const SOURCE_FILE = 'en.json';
const PLACEHOLDER_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export type LocaleStrings = Record<string, string>;

/** Extract all `{{var}}` placeholder names from a string, deduped + sorted. */
export function countPlaceholders(s: string): string[] {
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(s)) !== null) {
    seen.add(m[1]);
  }
  return [...seen].sort();
}

export interface PlaceholderMismatch {
  key: string;
  /** Placeholders present in source but missing from target. */
  missing: string[];
  /** Stray placeholders in target that aren't in source. */
  extra: string[];
}

export interface ParityReport {
  locale: string;
  missingKeys: string[];
  placeholderMismatches: PlaceholderMismatch[];
  hasIssues: boolean;
}

export interface ParityCheckInput {
  locale: string;
  source: LocaleStrings;
  target: LocaleStrings;
  /** Keys allowed to be missing from target (e.g. brand names that stay English). */
  allowMissing?: string[];
  /**
   * Optional fallback chain. Keys present in any chain bundle count as
   * present — covers BCP 47 delta files (es-MX → es → en) where the
   * regional file only stores divergent overrides.
   */
  fallbackChain?: LocaleStrings[];
}

function lookupInChain(
  key: string,
  primary: LocaleStrings,
  chain: LocaleStrings[],
): string | undefined {
  if (primary[key] !== undefined) return primary[key];
  for (const bundle of chain) {
    if (bundle[key] !== undefined) return bundle[key];
  }
  return undefined;
}

export function checkLocaleParity(input: ParityCheckInput): ParityReport {
  const allowMissingSet = new Set(input.allowMissing ?? []);
  const chain = input.fallbackChain ?? [];
  const missingKeys: string[] = [];
  const mismatches: PlaceholderMismatch[] = [];

  for (const [key, sourceVal] of Object.entries(input.source)) {
    const targetVal = lookupInChain(key, input.target, chain);
    if (targetVal === undefined) {
      if (!allowMissingSet.has(key)) {
        missingKeys.push(key);
      }
      continue;
    }
    if (typeof sourceVal !== 'string' || typeof targetVal !== 'string') continue;

    const srcPh = countPlaceholders(sourceVal);
    const tgtPh = countPlaceholders(targetVal);
    const missing = srcPh.filter((p) => !tgtPh.includes(p));
    const extra = tgtPh.filter((p) => !srcPh.includes(p));
    if (missing.length > 0 || extra.length > 0) {
      mismatches.push({ key, missing, extra });
    }
  }

  return {
    locale: input.locale,
    missingKeys: missingKeys.sort(),
    placeholderMismatches: mismatches,
    hasIssues: missingKeys.length > 0 || mismatches.length > 0,
  };
}

/**
 * Resolve the BCP 47 fallback chain for a locale. `es-MX` → [es]. `pt-PT`
 * → [pt]. `fr-CA` → [fr]. `en` → []. Returns bundles in fallback order.
 */
export function resolveFallbackChain(
  locale: string,
  bundles: Record<string, LocaleStrings>,
): LocaleStrings[] {
  const parts = locale.split('-');
  const chain: LocaleStrings[] = [];
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const fallback = parts.slice(0, i).join('-');
    if (bundles[fallback]) {
      chain.push(bundles[fallback]);
    }
  }
  return chain;
}

// ─── CLI runner ──────────────────────────────────────────────────────────

async function readJson(p: string): Promise<LocaleStrings> {
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw) as LocaleStrings;
}

interface CliOptions {
  json: boolean;
  allowMissing: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const allowMissing: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--allow-missing' && i + 1 < args.length) {
      allowMissing.push(args[i + 1]);
      i += 1;
    }
  }
  return { json, allowMissing };
}

async function main(opts: CliOptions): Promise<number> {
  let sourcePath: string;
  try {
    sourcePath = path.join(LOCALES_DIR, SOURCE_FILE);
    await fs.access(sourcePath);
  } catch (error) {
    console.error(`[i18n-parity] source bundle missing: ${LOCALES_DIR}/${SOURCE_FILE}`);
    return 2;
  }

  const source = await readJson(sourcePath);
  const entries = await fs.readdir(LOCALES_DIR);
  const targets = entries
    .filter((f) => f.endsWith('.json') && f !== SOURCE_FILE)
    .sort();

  // Pre-load all bundles once so the fallback chain (es-MX → es → en)
  // can be resolved without re-reading.
  const bundles: Record<string, LocaleStrings> = {};
  for (const file of targets) {
    bundles[file.replace(/\.json$/, '')] = await readJson(path.join(LOCALES_DIR, file));
  }

  const reports: ParityReport[] = [];
  for (const file of targets) {
    const locale = file.replace(/\.json$/, '');
    reports.push(
      checkLocaleParity({
        locale,
        source,
        target: bundles[locale],
        allowMissing: opts.allowMissing,
        fallbackChain: resolveFallbackChain(locale, bundles),
      }),
    );
  }

  const offenders = reports.filter((r) => r.hasIssues);

  if (opts.json) {
    console.log(JSON.stringify({ locales: reports }, null, 2));
  } else {
    for (const r of reports) {
      const status = r.hasIssues ? '❌' : '✅';
      console.log(
        `${status} ${r.locale}: ${r.missingKeys.length} missing, ${r.placeholderMismatches.length} placeholder mismatch(es)`,
      );
      if (r.missingKeys.length > 0) {
        const preview = r.missingKeys.slice(0, 5).join(', ');
        const more = r.missingKeys.length > 5 ? ` …+${r.missingKeys.length - 5} more` : '';
        console.log(`    missing: ${preview}${more}`);
      }
      if (r.placeholderMismatches.length > 0) {
        for (const pm of r.placeholderMismatches.slice(0, 5)) {
          const parts: string[] = [];
          if (pm.missing.length > 0) parts.push(`-{{${pm.missing.join(',')}}}`);
          if (pm.extra.length > 0) parts.push(`+{{${pm.extra.join(',')}}}`);
          console.log(`    ${pm.key}: ${parts.join(' ')}`);
        }
        if (r.placeholderMismatches.length > 5) {
          console.log(`    …+${r.placeholderMismatches.length - 5} more mismatches`);
        }
      }
    }
    console.log('');
    if (offenders.length > 0) {
      console.log(
        `[i18n-parity] ${offenders.length}/${reports.length} locale(s) have issues — failing CI.`,
      );
    } else {
      console.log(`[i18n-parity] all ${reports.length} locales are at parity.`);
    }
  }

  return offenders.length > 0 ? 1 : 0;
}

if (require.main === module) {
  const opts = parseArgs(process.argv);
  main(opts)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('[i18n-parity] script error:', err);
      process.exit(2);
    });
}
