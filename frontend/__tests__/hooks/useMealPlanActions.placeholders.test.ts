// U15: useMealPlanActions placeholders ratchet.
//
// Pre-U15: `handleTimePickerConfirm` shipped hardcoded calories=500,
// description="Delicious recipe added to your meal plan", prepTime="15 min",
// difficulty="Easy" during the optimistic-add. Users saw incorrect
// nutrition the moment they tapped Add.
//
// Post-U15: the handler fetches the recipe and uses its real values, with
// safe fallbacks (0 / "") when the fetch fails. This ratchet locks the
// invariant: the placeholder values must NEVER appear in the file again.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../hooks/useMealPlanActions.ts');

describe('U15: useMealPlanActions placeholders', () => {
  const src = readFileSync(FILE, 'utf8');

  it('does not contain the pre-U15 placeholder values', () => {
    expect(src).not.toMatch(/calories:\s*500\b/);
    expect(src).not.toMatch(/Delicious recipe added to your meal plan/);
    expect(src).not.toMatch(/prepTime:\s*['"]15 min['"]/);
    expect(src).not.toMatch(/difficulty:\s*['"]Easy['"]/);
  });

  it('imports recipeApi so it can fetch real recipe data', () => {
    expect(src).toMatch(/recipeApi/);
    expect(src).toMatch(/from\s+['"]\.\.\/lib\/api['"]/);
  });

  it('handleTimePickerConfirm calls recipeApi.getRecipe before inserting', () => {
    // Crude proximity check: the function block contains a getRecipe call.
    const fnMatch = src.match(/handleTimePickerConfirm\s*=\s*async[\s\S]*?\n  \};/);
    expect(fnMatch).not.toBeNull();
    expect((fnMatch as RegExpMatchArray)[0]).toMatch(/recipeApi\.getRecipe/);
  });
});
