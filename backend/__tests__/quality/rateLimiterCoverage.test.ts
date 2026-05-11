// U6: Rate limiter coverage ratchet.
//
// Audit on 2026-05-11 found only 17/60 backend route files use a limiter.
// AI routes had `aiLimiter`; auth/coach/recipes/mealPlan/search/shoppingList
// did NOT. This ratchet pins coverage on the attack-attractive modules:
// every covered route file MUST import and apply some `*Limiter`. Files
// whose mount is *not* gated by `authenticateToken` at app.ts MUST use a
// strict tier (`authLimiter` for auth endpoints, `strictPublicLimiter` for
// everything else).

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/**
 * Manifest: covered route files + their mount-time auth posture.
 *   "auth"   — mounted with `authenticateToken` at app.ts (or nested under
 *              a router that is). Any limiter is acceptable.
 *   "public" — mounted without `authenticateToken`. MUST use a strict tier.
 *   "mixed"  — file declares both public and auth'd sub-routes inline (e.g.
 *              shoppingListShareRoutes). MUST use strictPublicLimiter (the
 *              public path is the threat surface).
 */
type AuthPosture = 'auth' | 'public' | 'mixed';

const MANIFEST: Array<{ file: string; posture: AuthPosture }> = [
  // auth module — `/api/auth` is mounted WITHOUT authenticateToken because
  // login/register/forgot-password ARE the auth surface; they use authLimiter.
  { file: 'src/modules/auth/authRoutes.ts', posture: 'public' },

  // coach module — `/api/coach` mounted with authenticateToken
  { file: 'src/modules/coach/coachRoutes.ts', posture: 'auth' },
  { file: 'src/modules/coach/coachContextRoutes.ts', posture: 'auth' },
  { file: 'src/modules/coach/coachMemoryRoutes.ts', posture: 'auth' },

  // recipe — `/api/recipes` mounted with authenticateToken
  { file: 'src/modules/recipe/recipeRoutes.ts', posture: 'auth' },

  // mealPlan — `/api/meal-plan` mounted with authenticateToken
  { file: 'src/modules/mealPlan/mealPlanRoutes.ts', posture: 'auth' },

  // search — `/api/search` mounted with authenticateToken
  { file: 'src/modules/search/searchRoutes.ts', posture: 'auth' },

  // shoppingList — `/api/shopping-lists` mounted with authenticateToken
  { file: 'src/modules/shoppingList/shoppingListRoutes.ts', posture: 'auth' },
  // shoppingApps — `/api/shopping-apps` mounted with authenticateToken
  { file: 'src/modules/shoppingList/shoppingAppRoutes.ts', posture: 'auth' },

  // shoppingListShare — mounted WITHOUT auth: GET /import/:token is public,
  // POST /:id/share is auth'd inline. Strict limiter on the public path.
  {
    file: 'src/modules/shoppingListShare/shoppingListShareRoutes.ts',
    posture: 'mixed',
  },

  // waitlist — pre-launch landing page signup, public
  { file: 'src/modules/waitlist/waitlistRoutes.ts', posture: 'public' },
];

const ANY_LIMITER_RE = /\b(?:apiLimiter|authLimiter|aiLimiter|coachMessageLimiter|userActionLimiter|strictPublicLimiter)\b/;
const STRICT_TIER_RE = /\b(?:authLimiter|strictPublicLimiter)\b/;

function read(rel: string): string {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) {
    throw new Error(
      `Manifest references missing file: ${rel}. Update __tests__/quality/rateLimiterCoverage.test.ts MANIFEST.`,
    );
  }
  return readFileSync(abs, 'utf8');
}

describe('U6: rate limiter coverage', () => {
  it('every manifest file imports + applies a limiter', () => {
    const offenders: string[] = [];
    for (const { file } of MANIFEST) {
      const src = read(file);
      if (!ANY_LIMITER_RE.test(src)) offenders.push(file);
    }
    if (offenders.length > 0) {
      throw new Error(
        'Route files without any rate limiter:\n  ' +
          offenders.join('\n  ') +
          '\nApply userActionLimiter (auth\'d) or strictPublicLimiter (public).',
      );
    }
    expect(offenders.length).toBe(0);
  });

  it('public + mixed route files use a strict tier', () => {
    const offenders: string[] = [];
    for (const { file, posture } of MANIFEST) {
      if (posture === 'auth') continue;
      const src = read(file);
      if (!STRICT_TIER_RE.test(src)) offenders.push(`${file} (${posture})`);
    }
    if (offenders.length > 0) {
      throw new Error(
        'Public / mixed route files without strict limiter:\n  ' +
          offenders.join('\n  ') +
          '\nApply authLimiter (auth endpoints) or strictPublicLimiter.',
      );
    }
    expect(offenders.length).toBe(0);
  });

  it('manifest sanity — covers the 8 modules called out in the U6 audit', () => {
    const modules = new Set(
      MANIFEST.map((m) => m.file.split('/')[2]), // src/modules/<m>/...
    );
    for (const m of [
      'auth',
      'coach',
      'recipe',
      'mealPlan',
      'search',
      'shoppingList',
      'shoppingListShare',
      'waitlist',
    ]) {
      expect(modules.has(m)).toBe(true);
    }
  });
});
