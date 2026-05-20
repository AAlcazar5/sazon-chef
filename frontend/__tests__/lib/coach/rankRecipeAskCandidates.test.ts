// Tier Y live-wiring (founder ask 2026-05-19): ambiguous recipe asks
// like "grilled chicken" must resolve to ONE card picked using N=1
// signals (pantry / recent cuisine / adjacency), with a "Show me another"
// swap chip for the next-best. The ranker is pure — no API calls, no
// React. RED-first.

import {
  rankRecipeAskCandidates,
  type RankerSignals,
} from '../../../lib/coach/rankRecipeAskCandidates';
import type { RecipeCardPayload } from '../../../lib/coach/findOrGenerateRecipe';

const EMPTY_SIGNALS: RankerSignals = {
  pantryNames: [],
  lastCookCuisine: null,
  topAdjacentCuisine: null,
};

function rec(
  title: string,
  overrides: Partial<RecipeCardPayload> = {},
): RecipeCardPayload {
  return {
    title,
    description: '',
    baseServings: 4,
    ingredients: [{ name: 'salt', amount: 1, unit: 'tsp' }],
    steps: ['Step 1'],
    ...overrides,
  };
}

describe('rankRecipeAskCandidates — empty signals (cold start)', () => {
  it('falls back to Dice-only ranking when no N=1 signals available', () => {
    const a = rec('Grilled Chicken Bowl'); // close to "grilled chicken"
    const b = rec('Grilled Salmon Bowl'); // less close
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], EMPTY_SIGNALS);
    expect(out[0].recipe.title).toBe('Grilled Chicken Bowl');
    expect(out[1].recipe.title).toBe('Grilled Salmon Bowl');
    expect(out[0].diceScore).toBeGreaterThan(out[1].diceScore);
  });

  it('returns empty array when candidates is empty', () => {
    expect(rankRecipeAskCandidates('anything', [], EMPTY_SIGNALS)).toEqual([]);
  });

  it('cold-start rationale is undefined (nothing to explain)', () => {
    const a = rec('Grilled Chicken Bowl');
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], EMPTY_SIGNALS);
    expect(top.rationale).toBeUndefined();
  });
});

describe('rankRecipeAskCandidates — pantry overlap signal', () => {
  it('prefers the candidate whose ingredients overlap the pantry', () => {
    const a = rec('Grilled Chicken A', {
      ingredients: [
        { name: 'chicken', amount: 1, unit: 'lb' },
        { name: 'salt', amount: 1, unit: 'tsp' },
      ],
    });
    const b = rec('Grilled Chicken B', {
      ingredients: [
        { name: 'chicken', amount: 1, unit: 'lb' },
        { name: 'paprika', amount: 1, unit: 'tsp' },
        { name: 'chimichurri', amount: 2, unit: 'tbsp' },
      ],
    });
    // Dice should be effectively tied (both "Grilled Chicken X"); pantry
    // overlap breaks the tie in favor of B.
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], {
      ...EMPTY_SIGNALS,
      pantryNames: ['paprika', 'chimichurri'],
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken B');
    expect(out[0].pantryOverlap).toBeGreaterThan(out[1].pantryOverlap);
  });

  it('rationale names the matched pantry items', () => {
    const a = rec('Grilled Chicken Bowl', {
      ingredients: [
        { name: 'chicken thighs', amount: 1, unit: 'lb' },
        { name: 'onion', amount: 1, unit: 'whole' },
        { name: 'garlic', amount: 3, unit: 'clove' },
      ],
    });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      pantryNames: ['onion', 'garlic'],
    });
    expect(top.rationale).toMatch(/onion/i);
    expect(top.rationale).toMatch(/garlic/i);
  });

  it('pantry matches by ingredient-name token (substring on lowercased name)', () => {
    // pantry has "chicken"; recipe ingredient is "chicken thighs" → matches.
    const a = rec('Grilled Chicken Bowl', {
      ingredients: [{ name: 'chicken thighs', amount: 1, unit: 'lb' }],
    });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      pantryNames: ['chicken'],
    });
    expect(top.pantryOverlap).toBeGreaterThan(0);
  });
});

describe('rankRecipeAskCandidates — cuisine bonus', () => {
  it('boosts candidates whose cuisine matches the user’s last cook', () => {
    const a = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const b = rec('Grilled Chicken Japanese', { cuisine: 'Japanese' });
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], {
      ...EMPTY_SIGNALS,
      lastCookCuisine: 'Japanese',
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Japanese');
    expect(out[0].cuisineBonus).toBeGreaterThan(out[1].cuisineBonus);
  });

  it('falls back to topAdjacentCuisine when no lastCookCuisine', () => {
    const a = rec('Grilled Chicken Mexican', { cuisine: 'Mexican' });
    const b = rec('Grilled Chicken Thai', { cuisine: 'Thai' });
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], {
      ...EMPTY_SIGNALS,
      topAdjacentCuisine: 'Thai',
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Thai');
  });

  it('cuisine match is case-insensitive', () => {
    const a = rec('Grilled Chicken', { cuisine: 'italian' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      lastCookCuisine: 'Italian',
    });
    expect(top.cuisineBonus).toBeGreaterThan(0);
  });

  it('rationale mentions cuisine when that’s the dominant signal', () => {
    const a = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      lastCookCuisine: 'Italian',
    });
    expect(top.rationale).toMatch(/italian/i);
  });
});

// Founder Telegram 2026-05-20: deepen N=1 ranker with explicit-save
// signal. Saves are the strongest cuisine signal (intentional user
// action) — top-saved cuisine beats adjacency; non-top saved still
// outranks adjacency.
describe('rankRecipeAskCandidates — savedCollectionCuisines signal', () => {
  it('boosts the candidate matching the user\'s top-saved cuisine', () => {
    const a = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const b = rec('Grilled Chicken Japanese', { cuisine: 'Japanese' });
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: ['Japanese', 'Italian'],
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Japanese');
    expect(out[0].cuisineBonus).toBeGreaterThan(out[1].cuisineBonus);
  });

  it('top-saved cuisine outranks adjacency on the same candidate', () => {
    // Cuisines chosen with identical letter-count so Dice scores tie
    // (both titles same length): the cuisine bonus is what breaks the
    // tie. Italian = top-saved (0.8) > Mexican = adjacent (0.5).
    const italian = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const mexican = rec('Grilled Chicken Mexican', { cuisine: 'Mexican' });
    const out = rankRecipeAskCandidates('grilled chicken', [mexican, italian], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: ['Italian'],
      topAdjacentCuisine: 'Mexican',
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Italian');
  });

  it('non-top saved cuisine still beats adjacency', () => {
    // Persian = saved[2] (weight 0.6); Spanish = adjacent (weight 0.5).
    // Same-length cuisines → Dice ties, cuisine bonus decides.
    const persian = rec('Grilled Chicken Persian', { cuisine: 'Persian' });
    const spanish = rec('Grilled Chicken Spanish', { cuisine: 'Spanish' });
    const out = rankRecipeAskCandidates('grilled chicken', [spanish, persian], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: ['Italian', 'Mexican', 'Persian'],
      topAdjacentCuisine: 'Spanish',
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Persian');
  });

  it('last-cook cuisine still wins over top-saved (recency beats frequency)', () => {
    const italian = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const thai = rec('Grilled Chicken Thai', { cuisine: 'Thai' });
    // Thai = last (weight 1.0); Italian = top-saved (weight 0.8).
    const out = rankRecipeAskCandidates('grilled chicken', [italian, thai], {
      ...EMPTY_SIGNALS,
      lastCookCuisine: 'Thai',
      savedCollectionCuisines: ['Italian'],
    });
    expect(out[0].recipe.title).toBe('Grilled Chicken Thai');
  });

  it('rationale names the saved cuisine when saved-top dominates', () => {
    const a = rec('Grilled Chicken Italian', { cuisine: 'Italian' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: ['Italian'],
    });
    expect(top.rationale).toMatch(/save a lot of italian/i);
  });

  it('rationale differs for top-saved vs non-top-saved', () => {
    const a = rec('Grilled Chicken Persian', { cuisine: 'Persian' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: ['Italian', 'Japanese', 'Persian'],
    });
    expect(top.rationale).toMatch(/saved persian recipes before/i);
    expect(top.rationale).not.toMatch(/save a lot of/i);
  });

  it('empty savedCollectionCuisines is harmless (no bonus, no rationale change)', () => {
    const a = rec('Grilled Chicken', { cuisine: 'Italian' });
    const out1 = rankRecipeAskCandidates('grilled chicken', [a], EMPTY_SIGNALS);
    const out2 = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      savedCollectionCuisines: [],
    });
    expect(out1[0].cuisineBonus).toBe(out2[0].cuisineBonus);
    expect(out1[0].rationale).toBe(out2[0].rationale);
  });
});

describe('rankRecipeAskCandidates — determinism (same inputs → same order)', () => {
  it('returns identical ranking for identical signals', () => {
    const candidates = [
      rec('Grilled Chicken A', { cuisine: 'Italian' }),
      rec('Grilled Chicken B', { cuisine: 'Mexican' }),
      rec('Grilled Chicken C', { cuisine: 'Thai' }),
    ];
    const signals: RankerSignals = {
      pantryNames: ['paprika'],
      lastCookCuisine: 'Italian',
      topAdjacentCuisine: null,
    };
    const r1 = rankRecipeAskCandidates('grilled chicken', candidates, signals);
    const r2 = rankRecipeAskCandidates('grilled chicken', candidates, signals);
    expect(r1.map((r) => r.recipe.title)).toEqual(r2.map((r) => r.recipe.title));
  });

  it('preserves stable order on tie (input order)', () => {
    const a = rec('Grilled Chicken A');
    const b = rec('Grilled Chicken B');
    // Identical title-length, identical signals → identical scores.
    const out = rankRecipeAskCandidates('grilled chicken', [a, b], EMPTY_SIGNALS);
    expect(out[0].recipe.title).toBe('Grilled Chicken A');
  });
});
