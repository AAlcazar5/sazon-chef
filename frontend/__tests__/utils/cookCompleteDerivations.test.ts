// frontend/__tests__/utils/cookCompleteDerivations.test.ts
// ROADMAP 4.0 Tier J15 caller-wiring helpers (TDD).

import {
  deriveIngredientCount,
  deriveTopMinerals,
} from '../../utils/cookCompleteDerivations';

describe('deriveIngredientCount', () => {
  it('returns 0 for null/undefined recipe', () => {
    expect(deriveIngredientCount(null)).toBe(0);
    expect(deriveIngredientCount(undefined)).toBe(0);
  });

  it('returns 0 when ingredients is absent', () => {
    expect(deriveIngredientCount({})).toBe(0);
  });

  it('returns 0 when ingredients is not an array', () => {
    expect(deriveIngredientCount({ ingredients: 'spaghetti, eggs' as unknown as unknown[] })).toBe(0);
  });

  it('returns the array length when ingredients is a populated array', () => {
    expect(
      deriveIngredientCount({ ingredients: [{}, {}, {}, {}] }),
    ).toBe(4);
  });

  it('returns 0 for an empty ingredients array', () => {
    expect(deriveIngredientCount({ ingredients: [] })).toBe(0);
  });
});

describe('deriveTopMinerals', () => {
  it('returns empty list when minerals block is missing', () => {
    expect(deriveTopMinerals(null)).toEqual([]);
    expect(deriveTopMinerals({})).toEqual([]);
    expect(
      deriveTopMinerals({ nutritionalAnalysis: { micronutrients: {} } }),
    ).toEqual([]);
  });

  it('returns top 3 mineral names sorted by value descending', () => {
    const result = deriveTopMinerals({
      nutritionalAnalysis: {
        micronutrients: {
          minerals: {
            calcium: 100,
            iron: 8,
            magnesium: 250,
            zinc: 4,
            potassium: 800,
          },
        },
      },
    });
    expect(result).toEqual(['potassium', 'magnesium', 'calcium']);
  });

  it('skips minerals with zero or non-numeric values', () => {
    const result = deriveTopMinerals({
      nutritionalAnalysis: {
        micronutrients: {
          minerals: {
            calcium: 0,
            iron: 5,
            magnesium: 200,
          },
        },
      },
    });
    expect(result).toEqual(['magnesium', 'iron']);
  });

  it('honors the limit parameter', () => {
    const result = deriveTopMinerals(
      {
        nutritionalAnalysis: {
          micronutrients: {
            minerals: { calcium: 100, iron: 8, magnesium: 250 },
          },
        },
      },
      1,
    );
    expect(result).toEqual(['magnesium']);
  });

  it('returns empty list when all minerals are zero', () => {
    expect(
      deriveTopMinerals({
        nutritionalAnalysis: {
          micronutrients: {
            minerals: { calcium: 0, iron: 0, magnesium: 0 },
          },
        },
      }),
    ).toEqual([]);
  });
});
