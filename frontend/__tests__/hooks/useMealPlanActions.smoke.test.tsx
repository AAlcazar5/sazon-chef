// U17: useMealPlanActions contract test.
//
// 1871-line hook orchestrating meal-plan add / quick-log / mark-cooked.
// Pre-U17 had zero dedicated tests beyond the U15 placeholder ratchet.
// Contract test asserts public-API shape — full render coverage requires
// a substantial mock graph and is tracked as follow-up.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../hooks/useMealPlanActions.ts');

describe('U17: useMealPlanActions contract', () => {
  const src = readFileSync(FILE, 'utf8');

  it('exports useMealPlanActions as a function', () => {
    expect(src).toMatch(/export\s+function\s+useMealPlanActions\b/);
  });

  it('imports recipeApi (U15 wiring not silently removed)', () => {
    expect(src).toMatch(/recipeApi/);
  });

  it('exposes handleTimePickerConfirm as an async fn (U15)', () => {
    expect(src).toMatch(/handleTimePickerConfirm\s*=\s*async/);
  });

  it('module loads (catches type / syntax regressions)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../hooks/useMealPlanActions');
    expect(mod.useMealPlanActions).toBeDefined();
    expect(typeof mod.useMealPlanActions).toBe('function');
  });
});
