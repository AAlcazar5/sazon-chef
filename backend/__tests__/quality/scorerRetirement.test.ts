// backend/__tests__/quality/scorerRetirement.test.ts
// ROADMAP 4.0 WK0.2 — Cap test guarding the rule-based scorer retirement.
//
// `computeMatchScore` (the 25/25/20/15/10/5 hand-tuned weighted scorer in
// mealPlanFindRecipesController.ts) is replaced by the post-T-bis adapter
// (WK0.1, shipped). DELETION is gated on:
//   1. WK0.1 in production for ≥ 14 days (controlled by deploy timestamp)
//   2. ablation report shows TB2 acceptance rate ≥ weighted-scorer rate
//      (controlled by the ablation feature flag below)
//
// This cap test enforces the gate. Today the function is preserved
// intentionally; the test asserts the function STILL EXISTS so a future
// engineer doesn't delete it without flipping the gate. When the gate
// fires, set RETIREMENT_GATE_FIRED=true and the assertion flips to
// "function deleted."

import * as fs from 'fs';
import * as path from 'path';

const CONTROLLER_PATH = path.resolve(
  __dirname,
  '../../src/modules/mealPlan/mealPlanFindRecipesController.ts',
);

/**
 * Set to `true` ONLY after:
 *   - WK0.1 has been live in production ≥ 14 days
 *   - The ablation report (recommenderEvent surface 'week_slot' with
 *     eventType 'accept' / 'swap') shows TB2 ranker beats the rule-based
 *     scorer on per-slot acceptance rate
 *
 * Flipping this constant + deleting the function from the controller
 * should ship in the same PR. The test below enforces "deleted iff fired."
 */
const RETIREMENT_GATE_FIRED = false;

function readControllerSource(): string {
  return fs.readFileSync(CONTROLLER_PATH, 'utf-8');
}

describe('WK0.2 — computeMatchScore retirement gate', () => {
  it('controller file exists', () => {
    expect(fs.existsSync(CONTROLLER_PATH)).toBe(true);
  });

  if (!RETIREMENT_GATE_FIRED) {
    it('pre-gate: computeMatchScore is intentionally preserved (delete ONLY when gate fires)', () => {
      const src = readControllerSource();
      expect(src).toContain('computeMatchScore');
    });
  } else {
    it('post-gate: computeMatchScore has been deleted', () => {
      const src = readControllerSource();
      expect(src.includes('computeMatchScore')).toBe(false);
    });
  }

  it('publishes the gate flag for inspection', () => {
    expect(typeof RETIREMENT_GATE_FIRED).toBe('boolean');
  });
});
