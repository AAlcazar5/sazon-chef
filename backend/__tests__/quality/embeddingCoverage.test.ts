// backend/__tests__/quality/embeddingCoverage.test.ts
// Tier TB6.3 — retirement gate for the title-signature stopgap.
//
// The title-signature diversifier (`utils/diversifyResults.ts`) is the v1
// fallback used when Recipe.embedding is null. TB6.3 retires it once the
// dev/staging catalog has ≥95% embedding coverage. This file is the gate
// that enforces "deleted iff coverage met."
//
// Today the catalog has near-zero coverage so the function is preserved.
// The test asserts the function STILL EXISTS so a future engineer can't
// delete it without flipping the gate.
//
// Flipping the gate:
//   1. Run a coverage probe against staging:
//        SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL)::float
//             / COUNT(*) FROM "Recipe";
//      and confirm result ≥ 0.95.
//   2. Set RETIREMENT_GATE_FIRED = true (below).
//   3. In the same PR, remove `diversifyByTitleSignature` (and its
//      `utils/diversifyResults.ts` file if it has no other callers).
//   4. Re-run this test — it now asserts deletion.

import * as fs from 'fs';
import * as path from 'path';

const DIVERSIFY_RESULTS_PATH = path.resolve(
  __dirname,
  '../../src/utils/diversifyResults.ts',
);

const RECIPE_CONTROLLER_PATH = path.resolve(
  __dirname,
  '../../src/modules/recipe/recipeController.ts',
);

/**
 * Set to `true` ONLY after:
 *   - Staging catalog reports ≥95% Recipe.embedding non-null coverage
 *   - The TB6.1 + TB6.2 (partial) PRs have been live ≥7 days with no
 *     diversity regressions in the recommender-weekly cron output
 *
 * Flipping this constant + deleting `diversifyByTitleSignature` should
 * ship in the same PR.
 */
const RETIREMENT_GATE_FIRED = false;

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readSource(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}

describe('TB6.3 — title-signature retirement gate', () => {
  if (RETIREMENT_GATE_FIRED) {
    it('diversifyByTitleSignature is deleted', () => {
      // After retirement, the source file is either gone or no longer
      // exports the function. Either is acceptable.
      if (!fileExists(DIVERSIFY_RESULTS_PATH)) {
        expect(true).toBe(true);
        return;
      }
      const src = readSource(DIVERSIFY_RESULTS_PATH);
      expect(src).not.toMatch(/export function diversifyByTitleSignature/);
    });

    it('recipeController has no remaining diversifyByTitleSignature import', () => {
      const src = readSource(RECIPE_CONTROLLER_PATH);
      expect(src).not.toMatch(/diversifyByTitleSignature/);
    });
  } else {
    it('diversifyByTitleSignature still exists (gate not yet fired)', () => {
      expect(fileExists(DIVERSIFY_RESULTS_PATH)).toBe(true);
      const src = readSource(DIVERSIFY_RESULTS_PATH);
      expect(src).toMatch(/export function diversifyByTitleSignature/);
    });

    it('the gate constant is parseable as a boolean false', () => {
      // Sanity: if a future PR accidentally changes RETIREMENT_GATE_FIRED to
      // a truthy non-boolean (e.g. a string), the if-branch above would
      // execute the wrong block. Pin it to exactly `false`.
      expect(RETIREMENT_GATE_FIRED).toBe(false);
    });
  }
});
