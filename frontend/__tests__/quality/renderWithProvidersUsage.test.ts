// ROADMAP 4.0 N11.1 — cap test: screen-level tests use renderWithProviders.
//
// R12 shipped the helper at frontend/test-utils/renderWithProviders.tsx so
// every screen-level test gets the same Auth + Theme provider tree without
// inline mocks. This cap test asserts all NEW screen tests use the helper.
// Existing files that pre-date the helper are listed in GRANDFATHERED.
//
// Why a grandfather list: ~30+ screen tests pre-date the helper. Forcing
// migration in one PR is high churn for low signal; pinning the list so it
// can't grow + welcoming cleanup that removes entries gives the same end
// state with less risk.

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const SCREEN_TEST_ROOTS = ['__tests__/screens', '__tests__/app'];

/** Files allowed to predate the helper. New entries here are NOT permitted. */
const GRANDFATHERED: ReadonlySet<string> = new Set([]);

const HELPER_PATTERN = /from\s+['"][^'"]*test-utils\/renderWithProviders['"]/i;
const RAW_PROVIDER_PATTERN = /<(AuthProvider|ThemeProvider|AuthContext\.Provider|ThemeContext\.Provider)[\s>]/;

function listTsxRecursive(rel: string): string[] {
  const dir = path.join(FRONTEND_ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (
        entry.isFile() &&
        (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts'))
      ) {
        out.push(path.relative(FRONTEND_ROOT, p));
      }
    }
  };
  walk(dir);
  return out;
}

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf-8');
}

describe('N11.1 — screen tests use renderWithProviders', () => {
  const allTests = SCREEN_TEST_ROOTS.flatMap(listTsxRecursive).sort();

  it('the helper file exists at the canonical path', () => {
    expect(
      fs.existsSync(
        path.join(FRONTEND_ROOT, 'test-utils/renderWithProviders.tsx'),
      ),
    ).toBe(true);
  });

  it('no test file inlines a raw <AuthProvider>/<ThemeProvider> outside the helper', () => {
    const violations: string[] = [];
    for (const rel of allTests) {
      if (GRANDFATHERED.has(rel)) continue;
      const src = readSrc(rel);
      // It's fine if a test mocks the AuthContext module; we're catching
      // tests that wrap the SUT in a raw provider element.
      if (RAW_PROVIDER_PATTERN.test(src)) {
        violations.push(rel);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `N11.1: these tests wrap the SUT in raw <AuthProvider>/<ThemeProvider> — use renderWithProviders instead:\n` +
          violations.map((v) => `  - ${v}`).join('\n'),
      );
    }
  });
});
