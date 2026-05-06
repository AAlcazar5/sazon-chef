// backend/__tests__/services/structureScorer.test.ts
// ROADMAP 4.0 Tier D2.2 — Structural completeness scorer.

import { scoreStructure } from '../../src/services/structureScorer';

const wellFormed = {
  ingredients: [
    { name: 'chicken thigh', quantity: '2', unit: 'pieces' },
    { name: 'lemon', quantity: '1', unit: 'whole' },
    { name: 'olive oil', quantity: '2', unit: 'tbsp' },
    { name: 'garlic', quantity: '3', unit: 'cloves' },
  ],
  instructions: [
    'Heat the olive oil in a heavy skillet over medium heat. Add the garlic and cook just until fragrant, about thirty seconds. Be careful not to brown it — bitter garlic ruins the dish.',
    'Pat the chicken thigh dry with paper towels, season generously with salt and freshly ground pepper, and lay it skin-side down in the skillet. Cook undisturbed until the skin is deeply golden and releases easily from the pan, about ten minutes.',
    'Squeeze the lemon over the chicken, flip the pieces carefully, cover the skillet, and cook through, about eight minutes more. Let the chicken rest off the heat for a few minutes before slicing against the grain so the juices redistribute properly.',
  ],
  prepTimeMin: 10,
  cookTimeMin: 25,
  totalTimeMin: 35,
};

describe('scoreStructure', () => {
  it('returns 5 for a well-formed recipe', () => {
    const r = scoreStructure(wellFormed);
    expect(r.score).toBe(5);
    expect(r.reasons).toEqual([]);
  });

  it('penalizes missing ingredient quantity', () => {
    const r = scoreStructure({
      ...wellFormed,
      ingredients: [
        { name: 'chicken thigh', quantity: '', unit: 'pieces' },
        ...wellFormed.ingredients.slice(1),
      ],
    });
    expect(r.reasons.some((x) => x.code === 'ingredient_missing_quantity')).toBe(true);
    expect(r.score).toBeLessThan(5);
  });

  it('penalizes missing ingredient unit', () => {
    const r = scoreStructure({
      ...wellFormed,
      ingredients: [
        { name: 'salt', quantity: 'some', unit: '' },
        ...wellFormed.ingredients,
      ],
    });
    expect(r.reasons.some((x) => x.code === 'ingredient_missing_unit')).toBe(true);
  });

  it('penalizes instruction body under 80 words', () => {
    const r = scoreStructure({
      ...wellFormed,
      instructions: ['Cook it.', 'Serve it.', 'Enjoy.'],
    });
    expect(r.reasons.some((x) => x.code === 'instructions_too_short')).toBe(true);
  });

  it('penalizes instruction body over 600 words', () => {
    const filler = 'word '.repeat(700).trim();
    const r = scoreStructure({
      ...wellFormed,
      instructions: [filler],
    });
    expect(r.reasons.some((x) => x.code === 'instructions_too_long')).toBe(true);
  });

  it('penalizes step count outside [3, 12]', () => {
    const tooFew = scoreStructure({ ...wellFormed, instructions: ['x', 'y'] });
    expect(tooFew.reasons.some((x) => x.code === 'step_count_out_of_range')).toBe(true);

    const tooMany = scoreStructure({
      ...wellFormed,
      instructions: Array.from({ length: 15 }, (_, i) => `Step ${i + 1}: do this thing carefully.`),
    });
    expect(tooMany.reasons.some((x) => x.code === 'step_count_out_of_range')).toBe(true);
  });

  it('penalizes ingredient never referenced in instructions', () => {
    const r = scoreStructure({
      ...wellFormed,
      ingredients: [
        ...wellFormed.ingredients,
        { name: 'saffron', quantity: '1', unit: 'pinch' },
      ],
    });
    expect(r.reasons.some((x) => x.code === 'ingredient_unreferenced' && x.detail === 'saffron')).toBe(true);
  });

  it('penalizes time fields missing', () => {
    const r = scoreStructure({
      ...wellFormed,
      cookTimeMin: 0,
      totalTimeMin: 0,
      prepTimeMin: 0,
    });
    expect(r.reasons.some((x) => x.code === 'time_missing')).toBe(true);
  });

  it('penalizes inconsistent times (prep+cook >> total)', () => {
    const r = scoreStructure({
      ...wellFormed,
      prepTimeMin: 30,
      cookTimeMin: 60,
      totalTimeMin: 20, // 20 ≠ 90
    });
    expect(r.reasons.some((x) => x.code === 'time_inconsistent')).toBe(true);
  });

  it('penalizes empty ingredient list', () => {
    const r = scoreStructure({ ...wellFormed, ingredients: [] });
    expect(r.reasons.some((x) => x.code === 'ingredients_empty')).toBe(true);
    expect(r.score).toBeLessThan(5);
  });
});
