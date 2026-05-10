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
  // Bumped 5500 → 5600 (2026-05-08) — incremental growth across recent
  // recipe-detail features. Split into sub-controllers tracked as a
  // future Tier-R item.
  'modules/recipe/recipeController.ts': 5600,
  'modules/user/userController.ts': 1400,
  // Bumped 1300 → 1320 (2026-05-09) — Tier L L2/H9 added planningMode zod
  // validation + 400 path. Split into module-local sub-controllers tracked
  // as a Tier-R follow-up.
  'modules/mealPlan/mealPlanController.ts': 1320,
  'modules/mealPrep/mealPrepController.ts': 1200,
  'services/aiRecipeService.ts': 1300,
  // Bumped from 1200 → 1450 after Tier S4 added find_recipes /
  // find_recipes_smart / propose_tonight tools. Split tracked separately.
  // Bumped 1450 → 2000 (2026-05-08) — Sazon work added 7 new tools
  // (get_meal_plan, get_shopping_list, get_user_profile, get_recipe_detail,
  // add_to_shopping_list, schedule_meal, generate_recipe — see IA2 era).
  // Split planned but not yet scoped; cap absorbs current shape.
  'services/coachTools.ts': 2000,
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
