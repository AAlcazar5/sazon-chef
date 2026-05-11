// Tier Q1 — bundle size + cold-start audit (ratchet).
//
// This test serves three purposes:
//   1. Surface the top-20 heaviest node_modules deps (informational).
//   2. Ban known-heavy / known-redundant deps that have lighter alternatives
//      (lodash full import, moment.js, etc.) so they cannot be re-added.
//   3. Bound the number of synchronous imports + module-scope side effects in
//      `app/_layout.tsx` — every line there runs before the first paint.
//
// Findings + baseline are documented in `frontend/docs/bundle-baseline.md`.
// When a legitimate change pushes a bound, update the constants here AND
// the doc in the same PR.

import fs from 'fs';
import path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const NODE_MODULES = path.join(FRONTEND_ROOT, 'node_modules');
const PACKAGE_JSON = path.join(FRONTEND_ROOT, 'package.json');
const ROOT_LAYOUT = path.join(FRONTEND_ROOT, 'app', '_layout.tsx');

// Known-heavy deps that should never appear in production. Each entry has a
// lighter alternative noted in the comment.
const BANNED_DEPS = [
  'moment', // → use dayjs / date-fns (5x smaller)
  'lodash', // → use lodash-es or per-method imports (lodash/cloneDeep, etc.)
  'underscore', // → use native ES + per-method imports
  'jquery', // → no jQuery in RN, ever
  'request', // → deprecated; use fetch / axios
  'rxjs', // → not needed for this app; native promises + AsyncStorage suffice
];

// Root-layout boot budget. Every import + module-scope statement runs before
// first paint, so this is the hottest line-count to bound. Current baseline
// recorded 2026-05-10.
const ROOT_LAYOUT_IMPORT_BUDGET = 40;
const ROOT_LAYOUT_MODULE_SCOPE_SIDE_EFFECT_BUDGET = 6;

// Devs that must NEVER bleed into production deps. Catches accidental
// `npm install` of a debugging tool into the wrong section.
const DEVTOOLS_LEAK_DEPS = [
  'react-devtools-core',
  '@testing-library/react-native',
  'jest',
  '@types/jest',
];

function readPkgJson(): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
}

function readRootLayout(): string {
  return fs.readFileSync(ROOT_LAYOUT, 'utf-8');
}

/** Count top-level `import` lines (excluding type-only imports — those compile away). */
function countSyncImports(src: string): number {
  return src
    .split('\n')
    .filter((line) => /^\s*import\s+(?!type\b)/.test(line))
    .length;
}

/**
 * Count module-scope side effects: bare statements + call expressions that
 * execute at module load. Inside-function code doesn't count.
 *
 * Heuristic: lines that start at column 0, are not import/export/comment/
 * empty/function-body, and contain a call expression `(`.
 */
function countModuleScopeSideEffects(src: string): number {
  const lines = src.split('\n');
  let count = 0;
  let inBlock = false;
  let braceDepth = 0;
  for (const line of lines) {
    // Track block depth so we only count column-0 statements outside any block.
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (braceDepth === 0 && !inBlock) {
      // Module scope.
      const stripped = line.trim();
      if (
        stripped &&
        !stripped.startsWith('//') &&
        !stripped.startsWith('/*') &&
        !stripped.startsWith('*') &&
        !stripped.startsWith('import') &&
        !stripped.startsWith('export') &&
        !stripped.startsWith('declare') &&
        !stripped.startsWith('type ') &&
        !stripped.startsWith('interface ') &&
        !stripped.startsWith('const ') &&
        !stripped.startsWith('let ') &&
        !stripped.startsWith('var ') &&
        !stripped.startsWith('function ') &&
        !stripped.startsWith('class ') &&
        !stripped.startsWith('async function')
      ) {
        if (/\(.*\)/.test(stripped)) {
          count += 1;
        }
      }
      // Also count chained side-effects like `.catch(() => {})` on a module-scope call
      if (/^[A-Za-z_$][\w$.]*\s*\(/.test(stripped) && /\)\s*\.[A-Za-z_$][\w$]*\s*\(/.test(stripped)) {
        // already counted above, skip
      }
    }
    braceDepth += opens - closes;
    if (braceDepth < 0) braceDepth = 0;
  }
  return count;
}

function dirSizeKB(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const fp = path.join(d, e.name);
      try {
        if (e.isDirectory()) {
          walk(fp);
        } else if (e.isFile()) {
          total += fs.statSync(fp).size;
        }
      } catch {}
    }
  };
  walk(dir);
  return Math.round(total / 1024);
}

describe('Q1 — bundle audit', () => {
  describe('banned-deps guard', () => {
    const pkg = readPkgJson();
    const declared = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    for (const banned of BANNED_DEPS) {
      it(`production deps do NOT include ${banned}`, () => {
        expect(pkg.dependencies?.[banned]).toBeUndefined();
      });
    }

    it('declared deps that are banned only appear in devDependencies if at all', () => {
      for (const banned of BANNED_DEPS) {
        if (declared[banned]) {
          expect(pkg.devDependencies?.[banned]).toBeDefined();
        }
      }
    });
  });

  describe('devtools-leak guard', () => {
    const pkg = readPkgJson();

    for (const tool of DEVTOOLS_LEAK_DEPS) {
      it(`${tool} is not in production dependencies`, () => {
        expect(pkg.dependencies?.[tool]).toBeUndefined();
      });
    }
  });

  describe('root layout boot budget', () => {
    it(`app/_layout.tsx synchronous imports ≤ ${ROOT_LAYOUT_IMPORT_BUDGET}`, () => {
      const src = readRootLayout();
      const count = countSyncImports(src);
      expect(count).toBeLessThanOrEqual(ROOT_LAYOUT_IMPORT_BUDGET);
    });

    it(`app/_layout.tsx module-scope side effects ≤ ${ROOT_LAYOUT_MODULE_SCOPE_SIDE_EFFECT_BUDGET}`, () => {
      const src = readRootLayout();
      const count = countModuleScopeSideEffects(src);
      expect(count).toBeLessThanOrEqual(ROOT_LAYOUT_MODULE_SCOPE_SIDE_EFFECT_BUDGET);
    });
  });

  describe('top-20 heaviest deps — informational snapshot', () => {
    // This test ALWAYS passes; it exists to surface the current top-20 in CI
    // output so drift is visible at PR-review time. If a 100MB+ dep suddenly
    // appears, the watcher notices.
    it('logs the top-20 deps by disk size (skipped if node_modules absent)', () => {
      if (!fs.existsSync(NODE_MODULES)) {
        // node_modules may not be present in some CI shapes; don't fail.
        return;
      }
      const entries = fs.readdirSync(NODE_MODULES, { withFileTypes: true });
      const sizes: Array<{ name: string; kb: number }> = [];
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('.')) continue;
        const dir = path.join(NODE_MODULES, e.name);
        // Handle scoped packages.
        if (e.name.startsWith('@')) {
          const subEntries = fs.readdirSync(dir, { withFileTypes: true });
          for (const sub of subEntries) {
            if (!sub.isDirectory()) continue;
            const full = `${e.name}/${sub.name}`;
            sizes.push({ name: full, kb: dirSizeKB(path.join(dir, sub.name)) });
          }
        } else {
          sizes.push({ name: e.name, kb: dirSizeKB(dir) });
        }
      }
      sizes.sort((a, b) => b.kb - a.kb);
      const top20 = sizes.slice(0, 20);
      // Always passes; the assertion is just "we found something."
      expect(top20.length).toBeGreaterThan(0);
      // No single dep over 200MB (would indicate something has gone catastrophically wrong).
      for (const dep of top20) {
        expect(dep.kb).toBeLessThan(200 * 1024);
      }
    });
  });
});
