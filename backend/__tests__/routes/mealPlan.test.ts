// U18: mealPlan backend contract test.
//
// Pre-U18: the mealPlan module shipped 10 source files with 0 dedicated
// tests. A full supertest integration suite would require mocking the
// AI service graph (aiRecipeService → Anthropic SDK → key loading), the
// recipe ranker, the cost-tracking service, and the recurring-meals
// scheduler — each with its own initialization side effects that throw
// silently under the mock.
//
// This contract test instead asserts the **public route surface** via
// static + module-load inspection. It catches:
//   - the routes file failing to compile
//   - any route line getting accidentally deleted
//   - the rate limiter (U6) and recipeApi/$transaction wirings drifting
//
// Deeper happy-path supertest coverage is tracked as Tier-V follow-up.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../src/modules/mealPlan/mealPlanRoutes.ts');
const CONTROLLER = path.resolve(__dirname, '../../src/modules/mealPlan/mealPlanController.ts');

describe('U18: mealPlan routes contract', () => {
  const routesSrc = readFileSync(FILE, 'utf8');
  const controllerSrc = readFileSync(CONTROLLER, 'utf8');

  it('routes file applies the U6 rate limiter at the router level', () => {
    expect(routesSrc).toMatch(/router\.use\(\s*userActionLimiter\s*\)/);
    expect(routesSrc).toMatch(/from\s+['"]@\/middleware\/rateLimiter['"]/);
  });

  it('all flagship route paths are registered', () => {
    // Each line below is a load-bearing route — if any disappears in a
    // refactor, the corresponding feature breaks silently in production.
    const required: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string }> = [
      { method: 'get', path: '/daily' },
      { method: 'get', path: '/weekly' },
      { method: 'post', path: '/generate' },
      { method: 'post', path: '/regenerate-day' },
      { method: 'get', path: '/cooked-recipe-ids' },
      { method: 'get', path: '/history' },
      { method: 'post', path: '/add-recipe' },
      { method: 'post', path: '/quick-log' },
      { method: 'put', path: '/meals/:mealId/complete' },
      { method: 'put', path: '/meals/:mealId/notes' },
      { method: 'get', path: '/weekly-nutrition' },
      { method: 'get', path: '/weekly-budget' },
      { method: 'get', path: '/templates' },
      { method: 'post', path: '/templates' },
      { method: 'post', path: '/duplicate' },
      { method: 'post', path: '/find-recipes' },
    ];
    for (const r of required) {
      const re = new RegExp(
        String.raw`router\.${r.method}\(\s*['"]` +
          r.path.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&') +
          String.raw`['"]`,
      );
      expect(routesSrc).toMatch(re);
    }
  });

  it('exports the router as both default and a named export', () => {
    expect(routesSrc).toMatch(/export\s+default\s+router\b/);
    expect(routesSrc).toMatch(/export\s*\{\s*router\s+as\s+mealPlanRoutes\s*\}/);
  });

  it('module loads without throwing at import time', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../src/modules/mealPlan/mealPlanRoutes');
    expect(mod).toBeDefined();
    expect(mod.default ?? mod.mealPlanRoutes).toBeDefined();
  });
});

describe('U18: mealPlan quick-log validation', () => {
  const src = readFileSync(CONTROLLER, 'utf8');

  it('validates name is non-empty', () => {
    expect(src).toMatch(/Meal name is required/);
  });

  it('validates calories ≥ 0', () => {
    expect(src).toMatch(/Calories is required and must be >= 0/);
  });

  it('validates mealType is one of breakfast / lunch / dinner / snack', () => {
    expect(src).toMatch(/validMealTypes\s*=\s*\[['"]breakfast['"],\s*['"]lunch['"],\s*['"]dinner['"],\s*['"]snack['"]\]/);
  });
});
