// Tier TB6.2 — diversity invariant guard for the rolled-out finalization sites.
//
// Static check that every recommendation surface in recipeController.ts has a
// `diversifyForSurface(...)` call after its sort step. Drift on any handler
// removing the call (consciously or accidentally) trips this test.
//
// Per-handler end-to-end "no two ≥0.92 cosine within 3-recipe window" tests
// are deferred until catalog Recipe.embedding is ≥95% populated (TB6.3 gate)
// — supertest fixtures with seeded near-twin embeddings depend on the
// scoring stack being exercisable end-to-end, which is heavy.

import * as fs from 'fs';
import * as path from 'path';

const CONTROLLER_PATH = path.resolve(
  __dirname,
  '../../../src/modules/recipe/recipeController.ts',
);

function readSource(): string {
  return fs.readFileSync(CONTROLLER_PATH, 'utf-8');
}

function findHandlerBody(src: string, handlerName: string): string {
  // Match `async <handlerName>(req: Request, res: Response) {` and capture
  // until the next top-level handler or the closing of the controller object.
  const opener = new RegExp(`async\\s+${handlerName}\\s*\\(`);
  const start = src.search(opener);
  if (start === -1) return '';
  // Walk forward to balanced braces.
  const fnStart = src.indexOf('{', start);
  if (fnStart === -1) return '';
  let depth = 0;
  for (let i = fnStart; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(fnStart, i + 1);
    }
  }
  return src.slice(fnStart);
}

describe('TB6.2 — diversifier rolled out at every recommendation finalization site', () => {
  it('imports diversifyForSurface', () => {
    const src = readSource();
    expect(src).toMatch(/import\s+\{\s*diversifyForSurface\s*\}\s+from\s+['"]@\/services\/recommender\/diversifyForSurface['"]/);
  });

  describe('recommendation surfaces wrap their finalization in diversifyForSurface', () => {
    const RECOMMENDATION_SURFACES = ['getRecipes', 'getSuggestedRecipes', 'getHomeFeed', 'pantryMatch'];

    for (const handler of RECOMMENDATION_SURFACES) {
      it(`${handler} calls diversifyForSurface`, () => {
        const src = readSource();
        const body = findHandlerBody(src, handler);
        expect(body).not.toEqual('');
        expect(body).toMatch(/diversifyForSurface\(/);
      });
    }
  });

  describe('user-curated lists do NOT diversify (matchPercentage is metadata, not a ranking)', () => {
    // These handlers compute matchPercentage as a display badge but order by
    // savedDate / createdAt / disliked timestamp — diversifying would re-
    // order a user's curated list, which is unwanted.
    const CURATED_LISTS = ['getSavedRecipes', 'getLikedRecipes', 'getDislikedRecipes'];

    for (const handler of CURATED_LISTS) {
      it(`${handler} does NOT call diversifyForSurface`, () => {
        const src = readSource();
        const body = findHandlerBody(src, handler);
        expect(body).not.toEqual('');
        expect(body).not.toMatch(/diversifyForSurface\(/);
      });
    }
  });
});
