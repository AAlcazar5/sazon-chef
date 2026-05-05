// backend/__tests__/services/ingredientNutrientService.test.ts
// ROADMAP 4.0 D12 — ingredient → nutrient profile resolver.

const mockMappingFindUnique = jest.fn();
const mockMappingCreate = jest.fn();
const mockNutrientUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ingredientFDCMapping: {
      findUnique: (...a: unknown[]) => mockMappingFindUnique(...a),
      create: (...a: unknown[]) => mockMappingCreate(...a),
    },
    ingredientNutrient: {
      upsert: (...a: unknown[]) => mockNutrientUpsert(...a),
    },
  },
}));

const mockSearch = jest.fn();
const mockGetById = jest.fn();

jest.mock('../../src/services/usdaFdcService', () => {
  const actual = jest.requireActual('../../src/services/usdaFdcService');
  return {
    ...actual,
    searchByName: (...a: unknown[]) => mockSearch(...a),
    getByFdcId: (...a: unknown[]) => mockGetById(...a),
  };
});

import {
  getOrFetchByName,
  normalizeIngredientName,
} from '../../src/services/ingredientNutrientService';
import { normalizeFdcFood } from '../../src/services/usdaFdcService';

// Real spinach response, trimmed to a representative subset of nutrients.
// FDC ID 168462 = "Spinach, raw" (SR Legacy).
const SPINACH_FDC = {
  fdcId: 168462,
  description: 'Spinach, raw',
  foodCategory: { description: 'Vegetables and Vegetable Products' },
  foodNutrients: [
    { nutrientId: 1008, amount: 23 },     // calories
    { nutrientId: 1003, amount: 2.86 },   // protein
    { nutrientId: 1005, amount: 3.63 },   // carbs
    { nutrientId: 1004, amount: 0.39 },   // fat
    { nutrientId: 1079, amount: 2.2 },    // fiber
    { nutrientId: 2000, amount: 0.42 },   // sugar
    { nutrientId: 1089, amount: 2.71 },   // iron (mg)
    { nutrientId: 1090, amount: 79 },     // magnesium (mg)
    { nutrientId: 1177, amount: 194 },    // folate (mcg)
    { nutrientId: 1185, amount: 482.9 },  // vitamin K (mcg)
    { nutrientId: 1162, amount: 28.1 },   // vitamin C (mg)
    // Long-tail nutrient — should land in extras
    { nutrientId: 9999, nutrientName: 'Phytic acid', unitName: 'mg', amount: 12 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FDC_API_KEY = 'test_key';
});

describe('normalizeIngredientName', () => {
  it('lowercases and strips trailing notes after the first comma', () => {
    expect(normalizeIngredientName('Spinach, chopped')).toBe('spinach');
    expect(normalizeIngredientName('Olive Oil (extra virgin)')).toBe('olive oil');
    expect(normalizeIngredientName('  WILD-CAUGHT  SALMON ')).toBe('wild-caught salmon');
    expect(normalizeIngredientName('')).toBe('');
  });
});

describe('normalizeFdcFood — column mapping', () => {
  it('maps canonical FDC nutrient IDs to columned fields and parks the rest in extras', () => {
    const got = normalizeFdcFood(SPINACH_FDC);
    expect(got.fdcId).toBe(168462);
    expect(got.description).toBe('Spinach, raw');
    expect(got.category).toBe('Vegetables and Vegetable Products');
    expect(got.columned.calories).toBe(23);
    expect(got.columned.iron).toBe(2.71);
    expect(got.columned.magnesium).toBe(79);
    expect(got.columned.folate).toBe(194);
    expect(got.columned.vitK).toBe(482.9);
    expect(got.extras['9999']).toEqual({ value: 12, unit: 'mg', name: 'Phytic acid' });
  });

  it('skips nutrients with non-finite or missing values', () => {
    const got = normalizeFdcFood({
      fdcId: 1,
      description: 'X',
      foodNutrients: [
        { nutrientId: 1008, amount: NaN },
        { nutrientId: 1003 }, // no amount
        { nutrientId: 1004, amount: 5 },
      ],
    });
    expect(got.columned.calories).toBeUndefined();
    expect(got.columned.protein).toBeUndefined();
    expect(got.columned.fat).toBe(5);
  });
});

describe('getOrFetchByName', () => {
  it('cache hit — returns mapped profile without hitting FDC', async () => {
    mockMappingFindUnique.mockResolvedValueOnce({
      fdcId: 168462,
      ingredient: {
        fdcId: 168462,
        description: 'Spinach, raw',
        category: 'Vegetables',
        servingSize: 100,
        servingUnit: 'g',
        calories: 23,
        iron: 2.71,
        magnesium: 79,
        folate: 194,
        extras: null,
      },
    });

    const profile = await getOrFetchByName('Spinach, chopped');
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockGetById).not.toHaveBeenCalled();
    expect(profile?.fdcId).toBe(168462);
    expect(profile?.iron).toBe(2.71);
  });

  it('cache miss — searches FDC, caches top result, and returns the profile', async () => {
    mockMappingFindUnique.mockResolvedValueOnce(null);
    mockSearch.mockResolvedValueOnce([{ fdcId: 168462, description: 'Spinach, raw', score: 0.95 }]);
    mockGetById.mockResolvedValueOnce(SPINACH_FDC);
    mockNutrientUpsert.mockResolvedValueOnce({
      fdcId: 168462,
      description: 'Spinach, raw',
      category: 'Vegetables and Vegetable Products',
      servingSize: 100,
      servingUnit: 'g',
      calories: 23,
      iron: 2.71,
      magnesium: 79,
      folate: 194,
      vitK: 482.9,
      extras: null,
    });

    const profile = await getOrFetchByName('Spinach');
    expect(mockSearch).toHaveBeenCalledWith('spinach', 5);
    expect(mockGetById).toHaveBeenCalledWith(168462);
    expect(mockNutrientUpsert).toHaveBeenCalledTimes(1);
    expect(mockMappingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        normalizedName: 'spinach',
        fdcId: 168462,
        confidence: 0.95,
      }),
    });
    expect(profile?.iron).toBe(2.71);
    expect(profile?.magnesium).toBe(79);
    expect(profile?.folate).toBe(194);
  });

  it('FDC has no results — returns null without writing to cache', async () => {
    mockMappingFindUnique.mockResolvedValueOnce(null);
    mockSearch.mockResolvedValueOnce([]);

    const profile = await getOrFetchByName('xytherium quark');
    expect(profile).toBeNull();
    expect(mockGetById).not.toHaveBeenCalled();
    expect(mockNutrientUpsert).not.toHaveBeenCalled();
    expect(mockMappingCreate).not.toHaveBeenCalled();
  });

  it('FDC fetch fails after search — returns null gracefully', async () => {
    mockMappingFindUnique.mockResolvedValueOnce(null);
    mockSearch.mockResolvedValueOnce([{ fdcId: 168462, description: 'Spinach, raw' }]);
    mockGetById.mockResolvedValueOnce(null);

    const profile = await getOrFetchByName('Spinach');
    expect(profile).toBeNull();
    expect(mockNutrientUpsert).not.toHaveBeenCalled();
  });

  it('empty input returns null without any DB / network call', async () => {
    const profile = await getOrFetchByName('   ');
    expect(profile).toBeNull();
    expect(mockMappingFindUnique).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('mapping create race (unique violation) is swallowed', async () => {
    mockMappingFindUnique.mockResolvedValueOnce(null);
    mockSearch.mockResolvedValueOnce([{ fdcId: 168462, description: 'Spinach, raw' }]);
    mockGetById.mockResolvedValueOnce(SPINACH_FDC);
    mockNutrientUpsert.mockResolvedValueOnce({
      fdcId: 168462,
      description: 'Spinach, raw',
      category: null,
      servingSize: 100,
      servingUnit: 'g',
      calories: 23,
      iron: 2.71,
    });
    mockMappingCreate.mockRejectedValueOnce(new Error('unique constraint failed'));

    const profile = await getOrFetchByName('Spinach');
    expect(profile?.iron).toBe(2.71);
  });
});
