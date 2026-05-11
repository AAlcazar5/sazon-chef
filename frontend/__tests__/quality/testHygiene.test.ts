// Tier Q8 — flake / test-perf audit (frontend).
//
// Three ratchets:
//   1. No `.skip` / `.only` / `xdescribe` / `xit` anywhere in the test
//      tree. Skipped tests are zombie code; isolated tests are a dev
//      crutch that ships green CI but silently disables coverage.
//   2. No bare `setTimeout` in tests (root cause of most flake — real
//      timers are non-deterministic). Force fake timers or use the
//      RN testing-library's `waitFor` helpers.
//   3. Total test file count floor — catches accidental mass-deletion
//      of test files in a refactor.
//
// Slow-test surfacing is best done as a CI artifact (jest --json + a
// post-process step), not a unit test. Documented in the audit doc;
// not enforced here.

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const TEST_ROOT = path.join(FRONTEND_ROOT, '__tests__');

const TEST_FILE_FLOOR = 400;

const walkTests = (dir, out) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walkTests(fp, out);
    } else if (e.isFile() && /\.(test|spec)\.(ts|tsx)$/.test(e.name)) {
      out.push(fp);
    }
  }
  return out;
};

// Allowlist for files that legitimately use `.skip` or `.only` (e.g.
// migration-in-progress, gated infra). Empty today — keep it that way.
const SKIP_ALLOWLIST = new Set();

describe('Q8 — test hygiene', () => {
  const allTestFiles = walkTests(TEST_ROOT, []);

  describe('total test surface', () => {
    it(`test file count ≥ ${TEST_FILE_FLOOR} (drop triggers review)`, () => {
      if (allTestFiles.length < TEST_FILE_FLOOR) {
        throw new Error(
          `Test file count dropped from ${TEST_FILE_FLOOR} baseline to ${allTestFiles.length}. ` +
            `If this is intentional, update TEST_FILE_FLOOR.`,
        );
      }
      expect(allTestFiles.length).toBeGreaterThanOrEqual(TEST_FILE_FLOOR);
    });
  });

  describe('no skipped / isolated tests', () => {
    // Anti-patterns:
    //   describe.skip / it.skip / test.skip / xdescribe / xit  — zombie tests
    //   describe.only / it.only / test.only / fdescribe / fit  — ships
    //     CI green while disabling sibling coverage
    const FORBIDDEN_PATTERNS = [
      { pattern: /\b(?:describe|it|test)\.skip\s*\(/, label: '.skip' },
      { pattern: /\b(?:describe|it|test)\.only\s*\(/, label: '.only' },
      { pattern: /\bxdescribe\s*\(/, label: 'xdescribe' },
      { pattern: /\bxit\s*\(/, label: 'xit' },
      { pattern: /\bfdescribe\s*\(/, label: 'fdescribe' },
      { pattern: /\bfit\s*\(\s*['"]/, label: 'fit (focused)' },
    ];

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      it(`no ${label}() anywhere in __tests__/`, () => {
        const offenders = [];
        for (const f of allTestFiles) {
          const rel = path.relative(FRONTEND_ROOT, f);
          if (SKIP_ALLOWLIST.has(rel)) continue;
          const src = fs.readFileSync(f, 'utf-8');
          if (pattern.test(src)) {
            offenders.push(rel);
          }
        }
        if (offenders.length > 0) {
          throw new Error(
            `${offenders.length} test file(s) use ${label}():\n  ${offenders.slice(0, 5).join('\n  ')}`,
          );
        }
        expect(offenders).toEqual([]);
      });
    }
  });

  describe('no real timers in tests (flake source)', () => {
    // Real `setTimeout(...)` in a test body is the #1 cause of intermittent
    // failures across CI runners. Catches the pattern. Allowed:
    //   - `jest.useFakeTimers()` (the explicit override)
    //   - `setTimeout` inside a test util file (test-utils/*) that wraps it
    //   - test files that call `jest.useFakeTimers()` in the same file
    it('no bare `setTimeout(` in test bodies without `jest.useFakeTimers()` in scope', () => {
      const offenders = [];
      for (const f of allTestFiles) {
        const rel = path.relative(FRONTEND_ROOT, f);
        if (rel.includes('test-utils/')) continue;
        const src = fs.readFileSync(f, 'utf-8');
        const usesSetTimeout = /\bsetTimeout\s*\(/.test(src);
        const usesFakeTimers = /jest\.useFakeTimers\s*\(/.test(src);
        if (usesSetTimeout && !usesFakeTimers) {
          offenders.push(rel);
        }
      }
      // Many existing files use setTimeout legitimately (waitFor wrappers,
      // promise-resolution helpers in test-utils). We don't fail today; we
      // surface so future drift is visible.
      // Future ratchet: bound the count, then drop to 0.
      const SETTIMEOUT_BUDGET = 40;
      if (offenders.length > SETTIMEOUT_BUDGET) {
        throw new Error(
          `Bare setTimeout usage in test files climbed from baseline ${SETTIMEOUT_BUDGET} to ${offenders.length}. ` +
            `Add jest.useFakeTimers() in the affected files or wrap the wait in a test-utils helper.`,
        );
      }
      expect(offenders.length).toBeLessThanOrEqual(SETTIMEOUT_BUDGET);
    });
  });

  describe('test files have at least one test', () => {
    it('every *.test.{ts,tsx} contains at least one it()/test() call', () => {
      const offenders = [];
      for (const f of allTestFiles) {
        const src = fs.readFileSync(f, 'utf-8');
        // Accept `it(`, `test(`, `it.each([`, `test.each([`, `it.concurrent(` etc.
        if (!/\b(?:it|test)(?:\.\w+)?\s*\(/.test(src)) {
          offenders.push(path.relative(FRONTEND_ROOT, f));
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});
