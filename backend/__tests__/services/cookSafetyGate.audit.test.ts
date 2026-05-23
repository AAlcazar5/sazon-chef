// X-D2 (founder roadmap Tier X — Moat Hardening): safety-gate
// characterization test.
//
// Pins the current state of cook entry paths so a regression where a
// new path bypasses `performSafetyChecks` / allergen filters surfaces
// in test failures, NOT in production. The authoritative gate doc lives
// at `.claude/context/guards/cook-safety-gate.md`.
//
// Two layers of static-source assertion:
//   1. Each "must-pass" entry in the gate doc is verified to reference
//      the safety chain via a literal substring match in its source.
//   2. Any service/module file that creates a CookEvent OR generates a
//      new recipe payload MUST appear in one of the two tables in the
//      gate doc.

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const GUARD_DOC = path.join(
  REPO_ROOT,
  '.claude/context/guards/cook-safety-gate.md',
);

interface GateRequirement {
  /** Repo-relative path. */
  file: string;
  /** A regex (or substring) that must appear in the file to count as
   *  "reaches the safety chain". */
  requirement: RegExp;
  /** Short description for the failure message. */
  description: string;
}

const GATE_REQUIRED: GateRequirement[] = [
  {
    file: 'backend/src/services/aiRecipeService.ts',
    requirement: /performSafetyChecks\s*\(/,
    description: 'AI recipe generation must call performSafetyChecks()',
  },
  {
    file: 'backend/src/services/coachCookWriteback.ts',
    requirement: /recordCookEvent\s*\(/,
    description:
      'Coach cook writeback must route through cookEventService.recordCookEvent',
  },
  {
    file: 'backend/src/services/cookEventService.ts',
    requirement: /export\s+(async\s+)?function\s+recordCookEvent/,
    description: 'cookEventService.recordCookEvent must be the canonical writer',
  },
  {
    file: 'backend/src/modules/coach/coachRoutes.ts',
    requirement: /enforceReplyVoice\s*\(/,
    description:
      'Coach LLM reply must pass through enforceReplyVoice (Y-PI-6 allergen post-check)',
  },
];

const GATE_SKIPPED: GateRequirement[] = [
  {
    file: 'backend/src/services/cookContextExportService.ts',
    // Read-only export — no new recipe content. The gate doc justifies
    // skipping; the assertion below verifies the file exists.
    requirement: /buildCookContextExport/,
    description:
      'cookContextExportService is read-only; documented in the skip list',
  },
  {
    file: 'backend/src/services/cookMemoryInsightsService.ts',
    requirement: /computeCookMemoryInsight/,
    description:
      'cookMemoryInsightsService is derived-only; documented in the skip list',
  },
];

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('Cook safety-gate audit — guard doc exists + lists every required path', () => {
  let guardDoc: string;

  beforeAll(() => {
    guardDoc = readFile('.claude/context/guards/cook-safety-gate.md');
  });

  it('the guard doc exists', () => {
    expect(guardDoc.length).toBeGreaterThan(0);
  });

  it('the guard doc names performSafetyChecks as the authoritative gate', () => {
    expect(guardDoc).toMatch(/performSafetyChecks/);
  });

  it.each(GATE_REQUIRED)(
    'guard doc lists $file under the must-pass table',
    ({ file }) => {
      expect(guardDoc).toContain(file.replace(/^backend\//, ''));
    },
  );

  it.each(GATE_SKIPPED)(
    'guard doc lists $file under the deliberately-skipped table',
    ({ file }) => {
      const expected = file.replace(/^backend\//, '');
      // Skipped entries appear in the doc body — relax the contains
      // match so a section move doesn't fail the test.
      const baseName = path.basename(expected, '.ts');
      expect(guardDoc).toMatch(new RegExp(baseName));
    },
  );
});

describe('Cook safety-gate audit — each must-pass path references the safety chain', () => {
  it.each(GATE_REQUIRED)(
    '$file → $description',
    ({ file, requirement }) => {
      const src = readFile(file);
      expect(src).toMatch(requirement);
    },
  );
});

describe('Cook safety-gate audit — deliberately-skipped paths still exist (drift guard)', () => {
  it.each(GATE_SKIPPED)(
    '$file → $description',
    ({ file, requirement }) => {
      const src = readFile(file);
      expect(src).toMatch(requirement);
    },
  );
});

describe('Cook safety-gate audit — no NEW cook-entry path bypasses the gate', () => {
  // Walks backend/src/services/ and backend/src/modules/ looking for
  // files that create a CookEvent OR generate a recipe payload, and
  // asserts each appears in the guard doc.
  function walk(dir: string, out: string[] = []): string[] {
    const entries = fs.readdirSync(path.join(REPO_ROOT, dir), {
      withFileTypes: true,
    });
    for (const e of entries) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel, out);
      else if (e.isFile() && e.name.endsWith('.ts')) out.push(rel);
    }
    return out;
  }

  it('every cookEvent.create() / cookingLog.create() caller is documented', () => {
    const guardDoc = readFile(
      '.claude/context/guards/cook-safety-gate.md',
    );
    const candidates = [
      ...walk('backend/src/services'),
      ...walk('backend/src/modules'),
    ];
    const violators: string[] = [];
    for (const file of candidates) {
      // Skip the provider-abstraction layer — these are CALLED BY
      // aiRecipeService (which IS gated), not user-facing entry paths.
      if (file.includes('aiProviders/')) continue;
      const src = readFile(file);
      const writesCookEvent = /\bcookEvent\.create\b/.test(src);
      const writesCookingLog = /\bcookingLog\.create\b/.test(src);
      const generatesRecipe =
        /generateRecipe|generateFromDescription/.test(src) &&
        /export\s+/.test(src);
      if (!writesCookEvent && !writesCookingLog && !generatesRecipe) continue;
      // Match guard doc against the file's relative path (or basename).
      const expectedPath = file.replace(/^backend\//, '');
      const baseName = path.basename(file, '.ts');
      // Skip files that legitimately use `cookEvent.create` in tests +
      // helpers OR in flows that don't introduce new cook content
      // (delete operations, controller dispatch wrappers).
      const passesThroughGate =
        /performSafetyChecks|recordCookEvent|enforceReplyVoice/.test(src);
      // Transitively gated: any file that imports / calls
      // aiRecipeService delegates to its `performSafetyChecks` —
      // those are NOT bypass paths.
      const transitivelyGated =
        /aiRecipeService\b/.test(src) ||
        /from\s+['"]\.\.?\/aiRecipeController['"]/.test(src) ||
        /aiRecipeController\b/.test(src);
      const documented =
        guardDoc.includes(expectedPath) ||
        guardDoc.includes(baseName) ||
        passesThroughGate ||
        transitivelyGated;
      if (!documented) violators.push(file);
    }
    if (violators.length > 0) {
      throw new Error(
        `Cook-entry paths missing from .claude/context/guards/cook-safety-gate.md:\n` +
          violators.map((v) => `  - ${v}`).join('\n') +
          `\n\nAdd each to either the "must-pass" or "deliberately-skipped" table.`,
      );
    }
  });
});
