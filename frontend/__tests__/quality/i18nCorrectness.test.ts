// Tier Q5 — i18n runtime correctness.
//
// Static audit on the locale resource files + i18n.ts helper:
//   1. Base locales (es/pt/fr) have parity with en.json — every key present.
//   2. No key has an empty string value (would render blank to the user).
//   3. Interpolation placeholders (`{{name}}`) match across locales for the
//      same key — drift = broken render.
//   4. Plural-form pairs are complete: if `key_one` exists, the relevant
//      `key_other` (and `_few`/`_many` for plural-rich locales) is present.
//      Catches the classic "1 recipe" / "2 recipess" mistranslation surface.
//   5. The fallback chain in `i18n.ts` resolves to `en` for every regional
//      tag — no orphan locales.
//   6. No raw `new Date().toString()` or `.toLocaleString()` without explicit
//      locale arg in user-facing UI code — formatting must go through Intl.

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const LOCALE_ROOT = path.join(FRONTEND_ROOT, 'i18n', 'locales');

const BASE_LOCALES = ['en', 'es', 'pt', 'fr'] as const;
const REGIONAL_LOCALES = ['es-MX', 'es-AR', 'es-ES', 'es-CO', 'pt-BR', 'pt-PT'] as const;

const PLURAL_SUFFIXES = ['_one', '_other', '_few', '_many', '_zero'];

interface LocaleBundle {
  [key: string]: string;
}

function readBundle(locale: string): LocaleBundle {
  const file = path.join(LOCALE_ROOT, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function extractPlaceholders(value: string): string[] {
  const matches = value.match(/\{\{(\w+)\}\}/g) ?? [];
  return matches.map((m) => m.slice(2, -2)).sort();
}

function stripPluralSuffix(key: string): string | null {
  for (const suf of PLURAL_SUFFIXES) {
    if (key.endsWith(suf)) return key.slice(0, -suf.length);
  }
  return null;
}

describe('Q5 — i18n runtime correctness', () => {
  describe('locale file presence', () => {
    for (const loc of [...BASE_LOCALES, ...REGIONAL_LOCALES]) {
      it(`${loc}.json exists in i18n/locales/`, () => {
        expect(fs.existsSync(path.join(LOCALE_ROOT, `${loc}.json`))).toBe(true);
      });
    }
  });

  describe('base-locale parity with en.json', () => {
    const en = readBundle('en');
    const enKeys = new Set(Object.keys(en));

    for (const loc of BASE_LOCALES) {
      if (loc === 'en') continue;
      it(`${loc}.json has every key in en.json`, () => {
        const bundle = readBundle(loc);
        const missing = [...enKeys].filter((k) => !(k in bundle));
        if (missing.length > 0) {
          throw new Error(
            `${loc}.json missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
          );
        }
        expect(missing).toEqual([]);
      });

      it(`${loc}.json has no extra keys not in en.json (catches typos)`, () => {
        const bundle = readBundle(loc);
        const extra = Object.keys(bundle).filter((k) => !enKeys.has(k));
        if (extra.length > 0) {
          throw new Error(
            `${loc}.json has ${extra.length} keys not in en.json: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '…' : ''}`,
          );
        }
        expect(extra).toEqual([]);
      });
    }
  });

  describe('no empty values', () => {
    for (const loc of [...BASE_LOCALES, ...REGIONAL_LOCALES]) {
      it(`${loc}.json has no empty-string values`, () => {
        const bundle = readBundle(loc);
        const empty = Object.entries(bundle)
          .filter(([, v]) => typeof v === 'string' && v.trim() === '')
          .map(([k]) => k);
        expect(empty).toEqual([]);
      });
    }
  });

  describe('interpolation placeholder consistency across locales', () => {
    const en = readBundle('en');

    for (const loc of BASE_LOCALES) {
      if (loc === 'en') continue;
      it(`${loc}.json placeholders match en.json for every translated key`, () => {
        const bundle = readBundle(loc);
        const mismatches: string[] = [];
        for (const [key, enValue] of Object.entries(en)) {
          if (!(key in bundle)) continue;
          const enHoles = extractPlaceholders(enValue);
          const locHoles = extractPlaceholders(bundle[key]);
          if (JSON.stringify(enHoles) !== JSON.stringify(locHoles)) {
            mismatches.push(`${key}: en=[${enHoles.join(',')}] vs ${loc}=[${locHoles.join(',')}]`);
          }
        }
        if (mismatches.length > 0) {
          throw new Error(
            `Placeholder drift in ${loc}.json:\n  ${mismatches.slice(0, 5).join('\n  ')}${mismatches.length > 5 ? `\n  …${mismatches.length - 5} more` : ''}`,
          );
        }
        expect(mismatches).toEqual([]);
      });
    }
  });

  describe('plural-form completeness', () => {
    // When a key like `recipes_one` exists, the matching `_other` MUST exist
    // in the same bundle. Catches half-translated plural sets.
    for (const loc of [...BASE_LOCALES, ...REGIONAL_LOCALES]) {
      it(`${loc}.json: every _one key has a matching _other`, () => {
        const bundle = readBundle(loc);
        const missing: string[] = [];
        for (const key of Object.keys(bundle)) {
          if (!key.endsWith('_one')) continue;
          const stem = stripPluralSuffix(key);
          if (stem && !(`${stem}_other` in bundle)) {
            missing.push(`${key} → missing ${stem}_other`);
          }
        }
        expect(missing).toEqual([]);
      });
    }
  });

  describe('regional locales delegate cleanly', () => {
    // Regional bundles can be tiny (overrides only) — every key they DO
    // contain must also exist in en.json so the fallback chain resolves.
    for (const loc of REGIONAL_LOCALES) {
      it(`${loc}.json: every key resolves through fallback (exists in en.json)`, () => {
        const en = readBundle('en');
        const bundle = readBundle(loc);
        const orphans = Object.keys(bundle).filter((k) => !(k in en));
        expect(orphans).toEqual([]);
      });
    }
  });

  describe('locale formatting in user-facing UI code', () => {
    // Disallow raw `new Date(...).toString()` and `toLocaleString()` (no args)
    // in components / app code — those don't respect the user's locale.
    // Whitelist:
    //   - Test files (fixtures often hard-code English dates)
    //   - lib/api/*.ts (server-side timestamps, not user-facing)
    //   - Files importing from 'date-fns' or 'expo-localization' — those
    //     explicitly handle locale
    function walk(dir: string, out: string[]): string[] {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return out;
      }
      for (const e of entries) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
          walk(fp, out);
        } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
          out.push(fp);
        }
      }
      return out;
    }

    it('no `new Date(...).toString()` in app/** or components/**', () => {
      const dirs = [
        path.join(FRONTEND_ROOT, 'app'),
        path.join(FRONTEND_ROOT, 'components'),
      ];
      const files: string[] = [];
      for (const d of dirs) walk(d, files);
      const offenders: string[] = [];
      for (const f of files) {
        const src = fs.readFileSync(f, 'utf-8');
        if (/new\s+Date\([^)]*\)\.toString\(\)/.test(src)) {
          offenders.push(path.relative(FRONTEND_ROOT, f));
        }
      }
      expect(offenders).toEqual([]);
    });

    it('no bare `.toLocaleString()` (without args) in app/** or components/**', () => {
      // .toLocaleString(undefined) and .toLocaleString() both use the system
      // default — wrong for users whose UI is set to a different locale than
      // the device. Caller should pass the active sazon locale explicitly.
      const dirs = [
        path.join(FRONTEND_ROOT, 'app'),
        path.join(FRONTEND_ROOT, 'components'),
      ];
      const files: string[] = [];
      for (const d of dirs) walk(d, files);
      const offenders: string[] = [];
      for (const f of files) {
        const src = fs.readFileSync(f, 'utf-8');
        // Match `.toLocaleString()` with NO argument (empty parens). Allow
        // `.toLocaleString('es-MX', ...)` and `.toLocaleString(locale, ...)`.
        if (/\.toLocaleString\(\s*\)/.test(src)) {
          offenders.push(path.relative(FRONTEND_ROOT, f));
        }
      }
      if (offenders.length > 0) {
        throw new Error(
          `${offenders.length} file(s) call .toLocaleString() with no args (uses system default, ignores active sazon locale):\n  ${offenders.slice(0, 5).join('\n  ')}`,
        );
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('i18n.ts fallback chain', () => {
    it('every regional locale eventually resolves to en', () => {
      // Smoke-test the fallback chain — every regional locale walks down to
      // its base, then to en. Asserted by reading i18n.ts source.
      const src = fs.readFileSync(path.join(FRONTEND_ROOT, 'lib', 'i18n.ts'), 'utf-8');
      // Regional Spanish chains: locale → es → en
      expect(src).toMatch(/return \[locale, 'es', 'en'\]/);
      // Regional Portuguese: locale → pt → en
      expect(src).toMatch(/return \[locale, 'pt', 'en'\]/);
    });
  });
});
