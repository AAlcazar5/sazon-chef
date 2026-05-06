// ROADMAP 4.0 HX0.1 — Recipe of the Day selection.

import { selectRecipeOfTheDay } from '../../src/services/recipeOfTheDayService';

const cand = (id: string) => ({ id, title: `Recipe ${id}` });

describe('selectRecipeOfTheDay (HX0.1)', () => {
  it('returns null when there are no candidates', () => {
    const result = selectRecipeOfTheDay({ candidates: [], dateSeed: 20260506 });
    expect(result.recipe).toBeNull();
    expect(result.source).toBe('fallback');
  });

  it('falls back to date-modulo when no ranked ids are provided', () => {
    const candidates = [cand('a'), cand('b'), cand('c'), cand('d')];
    const result = selectRecipeOfTheDay({ candidates, dateSeed: 6 }); // 6 % 4 = 2
    expect(result.source).toBe('fallback');
    expect(result.recipe?.id).toBe('c');
    expect(result.index).toBe(2);
  });

  it('picks the top-ranked candidate that is in the filtered pool (ranker path)', () => {
    const candidates = [cand('a'), cand('b'), cand('c'), cand('d')];
    // Ranker says 'c' is most relevant.
    const rankedRecipeIds = ['c', 'a', 'b', 'd', 'e'];
    const result = selectRecipeOfTheDay({ candidates, rankedRecipeIds, dateSeed: 6 });
    expect(result.source).toBe('ranker');
    expect(result.recipe?.id).toBe('c');
    expect(result.index).toBe(2);
  });

  it('walks past ranker ids that are not in the filtered pool', () => {
    const candidates = [cand('a'), cand('b'), cand('c'), cand('d')];
    // 'x' and 'y' got filtered out (no image / wrong cuisine); 'b' is the
    // first survivor.
    const rankedRecipeIds = ['x', 'y', 'b', 'a'];
    const result = selectRecipeOfTheDay({ candidates, rankedRecipeIds, dateSeed: 0 });
    expect(result.source).toBe('ranker');
    expect(result.recipe?.id).toBe('b');
  });

  it('falls back when the ranker returned fewer than the cold-start floor', () => {
    const candidates = [cand('a'), cand('b'), cand('c'), cand('d')];
    // Only 2 ranked ids — below COLD_START_FLOOR = 3.
    const rankedRecipeIds = ['c', 'a'];
    const result = selectRecipeOfTheDay({ candidates, rankedRecipeIds, dateSeed: 1 });
    expect(result.source).toBe('fallback');
    expect(result.recipe?.id).toBe('b'); // 1 % 4 = 1
  });

  it('falls back when the ranker has no overlap with the filtered pool', () => {
    const candidates = [cand('a'), cand('b'), cand('c')];
    const rankedRecipeIds = ['x', 'y', 'z', 'w']; // none of these in candidates
    const result = selectRecipeOfTheDay({ candidates, rankedRecipeIds, dateSeed: 4 });
    expect(result.source).toBe('fallback');
    expect(result.recipe?.id).toBe('b'); // 4 % 3 = 1
  });

  it('handles negative dateSeed defensively', () => {
    const candidates = [cand('a'), cand('b'), cand('c')];
    const result = selectRecipeOfTheDay({ candidates, dateSeed: -1 });
    expect(result.recipe).not.toBeNull();
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThan(candidates.length);
  });
});
