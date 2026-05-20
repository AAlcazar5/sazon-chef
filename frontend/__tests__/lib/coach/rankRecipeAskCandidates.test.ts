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

// Founder Telegram 2026-05-20 PR-2: skill-tier match nudges in-skill
// candidates over too-hard ones. Bonus-only (never penalty) — joy
// obsession > gating; the user can still see harder recipes if they
// ask explicitly. Skill is the lowest-priority rationale (only fires
// when pantry + cuisine signals are silent AND naming it is informative
// — chef-tier matches everything so the rationale stays mute).
describe('rankRecipeAskCandidates — userSkillTier signal', () => {
  it('beginner prefers easy over hard on tied Dice', () => {
    const easy = rec('Grilled Chicken Plain', { difficulty: 'easy' });
    const hard = rec('Grilled Chicken Plain', { difficulty: 'hard' });
    // Identical titles → identical Dice. Skill-fit breaks the tie.
    const out = rankRecipeAskCandidates(
      'grilled chicken',
      [hard, easy],
      { ...EMPTY_SIGNALS, userSkillTier: 'beginner' },
    );
    expect(out[0].recipe.difficulty).toBe('easy');
    expect(out[0].skillFit).toBe(1);
    expect(out[1].skillFit).toBe(0);
  });

  it('cook tier matches easy and medium', () => {
    const e = rec('A', { difficulty: 'easy' });
    const m = rec('B', { difficulty: 'medium' });
    const h = rec('C', { difficulty: 'hard' });
    const out = rankRecipeAskCandidates('grilled chicken', [e, m, h], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'cook',
    });
    const fitByTitle = Object.fromEntries(
      out.map((o) => [o.recipe.title, o.skillFit]),
    );
    expect(fitByTitle.A).toBe(1);
    expect(fitByTitle.B).toBe(1);
    expect(fitByTitle.C).toBe(0);
  });

  it('chef tier matches every difficulty', () => {
    const e = rec('A', { difficulty: 'easy' });
    const h = rec('C', { difficulty: 'hard' });
    const out = rankRecipeAskCandidates('grilled chicken', [e, h], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'chef',
    });
    expect(out.every((o) => o.skillFit === 1)).toBe(true);
  });

  it('unknown-difficulty is neutral (treated as a fit, never penalized)', () => {
    const known = rec('A', { difficulty: 'hard' });
    const unknown = rec('B');
    const out = rankRecipeAskCandidates('grilled chicken', [known, unknown], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'beginner',
    });
    // Unknown fits; known-hard does not.
    const fitByTitle = Object.fromEntries(
      out.map((o) => [o.recipe.title, o.skillFit]),
    );
    expect(fitByTitle.A).toBe(0);
    expect(fitByTitle.B).toBe(1);
  });

  it('no userSkillTier signal → skillFit is 0 for everyone (neutral)', () => {
    const e = rec('A', { difficulty: 'easy' });
    const h = rec('B', { difficulty: 'hard' });
    const out = rankRecipeAskCandidates('grilled chicken', [e, h], EMPTY_SIGNALS);
    expect(out.every((o) => o.skillFit === 0)).toBe(true);
  });

  it('beginner rationale fires when no stronger signal speaks', () => {
    const easy = rec('Grilled Chicken Plain', { difficulty: 'easy' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [easy], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'beginner',
    });
    expect(top.rationale).toMatch(/beginner-friendly/i);
  });

  it('chef-tier match never produces a rationale (uninformative — chef fits everything)', () => {
    const hard = rec('Grilled Chicken Plain', { difficulty: 'hard' });
    const [top] = rankRecipeAskCandidates('grilled chicken', [hard], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'chef',
    });
    expect(top.rationale).toBeUndefined();
  });

  it('skill rationale is suppressed when a cuisine signal already explains the pick', () => {
    const easy = rec('Grilled Chicken Italian', {
      difficulty: 'easy',
      cuisine: 'Italian',
    });
    const [top] = rankRecipeAskCandidates('grilled chicken', [easy], {
      ...EMPTY_SIGNALS,
      userSkillTier: 'beginner',
      lastCookCuisine: 'Italian',
    });
    expect(top.rationale).toMatch(/italian/i);
    expect(top.rationale).not.toMatch(/beginner-friendly/i);
  });

  it('skill match cannot overwhelm a Dice gap (small bonus only)', () => {
    // Tandoori title is longer (less Dice) and easy; Plain is shorter
    // (higher Dice) and hard. Dice gap > skill bonus → Plain wins.
    const easyButLessRelevant = rec('Grilled Chicken Tandoori Style', {
      difficulty: 'easy',
    });
    const hardButMoreRelevant = rec('Grilled Chicken', { difficulty: 'hard' });
    const out = rankRecipeAskCandidates(
      'grilled chicken',
      [easyButLessRelevant, hardButMoreRelevant],
      { ...EMPTY_SIGNALS, userSkillTier: 'beginner' },
    );
    expect(out[0].recipe.title).toBe('Grilled Chicken');
  });
});

// Founder Telegram 2026-05-20 PR-3: recently-cooked demotion. Same
// recipe twice in a row reads as staleness, not personalization. The
// damper is multiplicative and small (×0.85) — enough to flip the
// primary pick when scores are close, not enough to bury a genuinely
// best match.
describe('rankRecipeAskCandidates — recentlyCookedRecipeIds damper', () => {
  function recWithId(
    id: string,
    title: string,
    overrides: Partial<typeof rec extends (...args: any) => infer R ? R : never> = {} as any,
  ) {
    return rec(title, { ...overrides, recipeId: id } as any);
  }

  it('demotes the recipe whose id is in recentlyCookedRecipeIds when scores otherwise tie', () => {
    const stale = recWithId('rcp_stale', 'Grilled Chicken Plain');
    const fresh = recWithId('rcp_fresh', 'Grilled Chicken Plain');
    const out = rankRecipeAskCandidates('grilled chicken', [stale, fresh], {
      ...EMPTY_SIGNALS,
      recentlyCookedRecipeIds: ['rcp_stale'],
    });
    expect(out[0].recipe.recipeId).toBe('rcp_fresh');
    expect(out[1].recipe.recipeId).toBe('rcp_stale');
    // Damper applied to stale's totalScore but not fresh.
    expect(out[1].totalScore).toBeLessThan(out[0].totalScore);
  });

  it('damper is multiplicative not additive — stale recipe still scores above 0', () => {
    const stale = recWithId('rcp_stale', 'Grilled Chicken Plain');
    const [top] = rankRecipeAskCandidates('grilled chicken', [stale], {
      ...EMPTY_SIGNALS,
      recentlyCookedRecipeIds: ['rcp_stale'],
    });
    expect(top.totalScore).toBeGreaterThan(0);
  });

  it('damper cannot bury a genuinely best match — strong Dice still wins', () => {
    // stale recipe has perfect title match; fresh has a much worse title.
    const stale = recWithId('rcp_stale', 'Grilled Chicken');
    const fresh = recWithId('rcp_fresh', 'Roasted Tomato Soup with Basil');
    const out = rankRecipeAskCandidates('grilled chicken', [fresh, stale], {
      ...EMPTY_SIGNALS,
      recentlyCookedRecipeIds: ['rcp_stale'],
    });
    expect(out[0].recipe.recipeId).toBe('rcp_stale');
  });

  it('recipes without a recipeId are unaffected (AI-gen path)', () => {
    const aiGen = rec('Grilled Chicken Plain'); // no recipeId
    const catalog = recWithId('rcp_a', 'Grilled Chicken Plain');
    const out = rankRecipeAskCandidates('grilled chicken', [catalog, aiGen], {
      ...EMPTY_SIGNALS,
      recentlyCookedRecipeIds: ['rcp_a'],
    });
    // AI-gen pulls ahead because catalog candidate was just cooked.
    expect(out[0].recipe.recipeId).toBeUndefined();
  });

  it('empty recentlyCookedRecipeIds (or missing signal) is harmless', () => {
    const a = recWithId('rcp_a', 'Grilled Chicken Plain');
    const out1 = rankRecipeAskCandidates('grilled chicken', [a], EMPTY_SIGNALS);
    const out2 = rankRecipeAskCandidates('grilled chicken', [a], {
      ...EMPTY_SIGNALS,
      recentlyCookedRecipeIds: [],
    });
    expect(out1[0].totalScore).toBe(out2[0].totalScore);
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
