// backend/__tests__/quality/oversizedFiles.test.ts
// ROADMAP 4.0 R5 — Cap CI failure if oversized backend files grow without
// being split. Snapshots the current line counts as the upper bound; any
// growth requires either splitting the file or updating the cap with a
// deliberate justification.

import { execSync } from 'child_process';
import path from 'path';

const BACKEND_SRC = path.resolve(__dirname, '../../src');

function lineCount(absPath: string): number {
  try {
    const out = execSync(`wc -l < "${absPath}"`, { encoding: 'utf-8' });
    return Number(out.trim());
  } catch {
    return 0;
  }
}

// Files known to be oversized at R5 audit; values capture the *current* size,
// not the target. Splitting any of these is a follow-up.
const CAPS: Record<string, number> = {
  'modules/recipe/recipeController.ts': 5500,
  'modules/user/userController.ts': 1400,
  'modules/mealPlan/mealPlanController.ts': 1300,
  'modules/mealPrep/mealPrepController.ts': 1200,
  'services/aiRecipeService.ts': 1300,
  // Bumped from 1200 → 1450 after Tier S4 added find_recipes /
  // find_recipes_smart / propose_tonight tools. Split tracked separately.
  'services/coachTools.ts': 1450,
  'modules/shoppingList/shoppingListGenerationController.ts': 1100,
};

describe('Oversized backend files (R5)', () => {
  for (const [rel, cap] of Object.entries(CAPS)) {
    const abs = path.join(BACKEND_SRC, rel);
    it(`${rel} stays at or below ${cap} LOC`, () => {
      const actual = lineCount(abs);
      // Allow shrinking below the cap silently (expected after splits).
      expect(actual).toBeLessThanOrEqual(cap);
    });
  }
});
