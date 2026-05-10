// P10: ASO + deep-link audit.
//
// Locks invariants for App Store / Play Store metadata and the URL scheme:
//   - app.json `scheme` is the brand-namespaced "sazon" (not the generic
//     scaffold value "app").
//   - Per-locale keywords / name / subtitle stay within Apple's hard caps
//     (30 / 30 / 100 chars respectively) and are non-empty.
//   - Every locale that ships an `app_store/` folder has all five required
//     metadata files populated.

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_JSON = path.join(REPO_ROOT, 'app.json');
const METADATA = path.join(REPO_ROOT, 'app-store-metadata');

const APP_STORE_REQUIRED = [
  'name.txt',
  'subtitle.txt',
  'keywords.txt',
  'description.txt',
  'promotional_text.txt',
];

interface LimitsShape {
  name: number;
  subtitle: number;
  keywords: number;
  promotional_text: number;
}

const APP_STORE_LIMITS = {
  name: 30,
  subtitle: 30,
  keywords: 100,
  promotional_text: 170,
} as LimitsShape;

function readMetadata(locale: string, store: string, file: string): string {
  return readFileSync(path.join(METADATA, locale, store, file), 'utf8').trim();
}

function listLocales(): string[] {
  const entries = readdirSync(METADATA);
  const locales: string[] = [];
  for (const entry of entries) {
    const isDir = statSync(path.join(METADATA, entry)).isDirectory();
    const hasStore = existsSync(path.join(METADATA, entry, 'app_store'));
    if (isDir && hasStore) locales.push(entry);
  }
  return locales;
}

describe('P10: ASO + deep-link metadata', () => {
  it('app.json uses a brand-namespaced URL scheme', () => {
    const json = JSON.parse(readFileSync(APP_JSON, 'utf8'));
    const scheme = json.expo && json.expo.scheme;
    expect(scheme).toBeDefined();
    expect(scheme).not.toBe('app');
    expect(scheme).not.toBe('myapp');
    expect(scheme).toBe('sazon');
  });

  it('every app_store locale ships all five required metadata files', () => {
    const locales = listLocales();
    expect(locales.length).toBeGreaterThan(0);
    for (const locale of locales) {
      for (const file of APP_STORE_REQUIRED) {
        const p = path.join(METADATA, locale, 'app_store', file);
        expect(existsSync(p)).toBe(true);
        expect(readMetadata(locale, 'app_store', file).length).toBeGreaterThan(0);
      }
    }
  });

  it('per-locale metadata stays within App Store character limits', () => {
    const locales = listLocales();
    const violations: string[] = [];
    const keys: Array<keyof LimitsShape> = ['name', 'subtitle', 'keywords', 'promotional_text'];
    for (const locale of locales) {
      for (const key of keys) {
        const file = String(key) + '.txt';
        const limit = APP_STORE_LIMITS[key];
        const content = readMetadata(locale, 'app_store', file);
        if (content.length > limit) {
          violations.push(locale + '/' + file + ' ' + content.length + '>' + limit);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error('Metadata exceeds limits:\n  ' + violations.join('\n  '));
    }
    expect(violations.length).toBe(0);
  });
});
