// ROADMAP 4.0 FX3.5 — useInitialRecipeLoad + useHomeFeed retrieval parity.
//
// Both /api/recipes and /api/recipes/home-feed must call
// resolveRetrievalCandidates with the same userId + appliedFilters shape so
// the two paths produce the same retrieval narrowing for an identical
// filter set. This static test guards against drift by reading the
// controller source.

import * as fs from 'fs';
import * as path from 'path';

const controllerPath = path.join(
  __dirname,
  '../../../src/modules/recipe/recipeController.ts',
);
const source = fs.readFileSync(controllerPath, 'utf8');

// Carve a controller method body: starts at `async <name>(`, ends at the
// next top-level method definition (`  async ` at column 0 indent of "  ")
// or end of file. The methods are object properties indented with 2 spaces.
function methodBody(name: string): string {
  const start = source.indexOf(`async ${name}(`);
  if (start === -1) return '';
  // Look for the next top-level method header `\n  async ` after this one.
  const after = source.indexOf('\n  async ', start + 1);
  return source.slice(start, after === -1 ? undefined : after);
}

describe('retrieval parity (FX3.5)', () => {
  it('getRecipes calls resolveRetrievalCandidates with appliedFilters', () => {
    const block = methodBody('getRecipes');
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/resolveRetrievalCandidates/);
    expect(block).toMatch(/appliedFilters/);
  });

  it('getHomeFeed calls resolveRetrievalCandidates with appliedFilters (FX3.5 parity)', () => {
    const block = methodBody('getHomeFeed');
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/resolveRetrievalCandidates/);
    expect(block).toMatch(/appliedFilters/);
  });

  it('both paths surface softFilterMode + narrowedBy in their response', () => {
    const recipesBlock = methodBody('getRecipes');
    const homeFeedBlock = methodBody('getHomeFeed');
    expect(recipesBlock).toMatch(/softFilterMode/);
    expect(recipesBlock).toMatch(/narrowedBy/);
    expect(homeFeedBlock).toMatch(/softFilterMode/);
    expect(homeFeedBlock).toMatch(/narrowedBy/);
  });
});
