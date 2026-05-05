// backend/__tests__/services/cuisineDessertService.test.ts
// ROADMAP 4.0 F2.

const mockCravingSearchEventCreate = jest.fn();
const mockCravingSearchEventFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cravingSearchEvent: {
      create: (...a: unknown[]) => mockCravingSearchEventCreate(...a),
      findMany: (...a: unknown[]) => mockCravingSearchEventFindMany(...a),
    },
  },
}));

import {
  normalizeCuisineKey,
  getCategoriesForCuisine,
  logCuisineSearchNoResults,
  getNoResultsRates,
  __forTest,
} from '../../src/services/cuisineDessertService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('normalizeCuisineKey', () => {
  it('lowercases, trims, and converts hyphens/spaces to underscore', () => {
    expect(normalizeCuisineKey('Middle Eastern')).toBe('middle_eastern');
    expect(normalizeCuisineKey('  italian  ')).toBe('italian');
    expect(normalizeCuisineKey('middle-eastern')).toBe('middle_eastern');
  });

  it('resolves cuisine aliases', () => {
    expect(normalizeCuisineKey('Lebanese')).toBe('middle_eastern');
    expect(normalizeCuisineKey('Turkish')).toBe('middle_eastern');
    expect(normalizeCuisineKey('Persian')).toBe('middle_eastern');
    expect(normalizeCuisineKey('Cantonese')).toBe('chinese');
    expect(normalizeCuisineKey('Sichuan')).toBe('chinese');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeCuisineKey('')).toBe('');
  });
});

describe('getCategoriesForCuisine', () => {
  it('returns the curated list for a known cuisine', () => {
    const result = getCategoriesForCuisine('italian');
    expect(result.matched).toBe(true);
    expect(result.cuisine).toBe('italian');
    expect(result.categories.length).toBeGreaterThanOrEqual(3);
    const ids = result.categories.map(c => c.id);
    expect(ids).toContain('tiramisu');
  });

  it('returns the curated list via an alias', () => {
    const result = getCategoriesForCuisine('Lebanese');
    expect(result.matched).toBe(true);
    expect(result.cuisine).toBe('middle_eastern');
    expect(result.categories.map(c => c.id)).toContain('baklava');
  });

  it('falls back to Lightened Global Desserts for an unknown cuisine', () => {
    const result = getCategoriesForCuisine('martian');
    expect(result.matched).toBe(false);
    expect(result.cuisine).toBe('martian');
    expect(result.categories).toEqual(__forTest.GLOBAL_FALLBACK);
  });

  it('every category has a stable id, label, description, and profile', () => {
    for (const [cuisine, list] of Object.entries(__forTest.DESSERTS_BY_CUISINE)) {
      for (const cat of list as { id: string; label: string; description: string; profile: string }[]) {
        expect(cat.id).toMatch(/^[a-z0-9-]+$/);
        expect(cat.label.length).toBeGreaterThan(0);
        expect(cat.description.length).toBeGreaterThan(0);
        expect([
          'fruit-forward', 'nutty', 'spiced', 'creamy', 'chocolate', 'citrus', 'floral',
        ]).toContain(cat.profile);
        void cuisine;
      }
    }
  });
});

describe('logCuisineSearchNoResults', () => {
  it('creates a CravingSearchEvent with action=no_results', async () => {
    mockCravingSearchEventCreate.mockResolvedValueOnce({});
    await logCuisineSearchNoResults('u1', 'Italian');
    expect(mockCravingSearchEventCreate).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        cravingQuery: 'italian',
        recipeId: '__none__',
        action: 'no_results',
      },
    });
  });

  it('does not throw when prisma rejects', async () => {
    mockCravingSearchEventCreate.mockRejectedValueOnce(new Error('boom'));
    await expect(logCuisineSearchNoResults('u1', 'italian')).resolves.toBeUndefined();
  });

  it('skips empty cuisine input', async () => {
    await logCuisineSearchNoResults('u1', '   ');
    expect(mockCravingSearchEventCreate).not.toHaveBeenCalled();
  });
});

describe('getNoResultsRates', () => {
  it('aggregates per-cuisine totals + no-results count + rate', async () => {
    mockCravingSearchEventFindMany.mockResolvedValueOnce([
      { cravingQuery: 'italian', action: 'tap' },
      { cravingQuery: 'italian', action: 'no_results' },
      { cravingQuery: 'italian', action: 'tap' },
      { cravingQuery: 'french', action: 'no_results' },
      { cravingQuery: 'french', action: 'no_results' },
    ]);

    const rates = await getNoResultsRates();
    const italian = rates.find(r => r.cuisine === 'italian');
    const french = rates.find(r => r.cuisine === 'french');
    expect(italian).toEqual({
      cuisine: 'italian',
      totalQueries: 3,
      noResults: 1,
      rate: 1 / 3,
    });
    expect(french).toEqual({
      cuisine: 'french',
      totalQueries: 2,
      noResults: 2,
      rate: 1,
    });
  });

  it('sorts results by rate descending — top offender surfaces first', async () => {
    mockCravingSearchEventFindMany.mockResolvedValueOnce([
      { cravingQuery: 'italian', action: 'tap' }, // 0% no-results
      { cravingQuery: 'french', action: 'no_results' },
      { cravingQuery: 'french', action: 'no_results' },
      { cravingQuery: 'french', action: 'no_results' }, // 100%
    ]);
    const rates = await getNoResultsRates();
    expect(rates[0].cuisine).toBe('french');
    expect(rates[0].rate).toBe(1);
  });

  it('returns empty array when no events in window', async () => {
    mockCravingSearchEventFindMany.mockResolvedValueOnce([]);
    expect(await getNoResultsRates()).toEqual([]);
  });

  it('queries with createdAt >= now - daysBack', async () => {
    mockCravingSearchEventFindMany.mockResolvedValueOnce([]);
    const before = Date.now();
    await getNoResultsRates(7);
    const call = mockCravingSearchEventFindMany.mock.calls[0][0];
    const since = call.where.createdAt.gte as Date;
    const expectedSince = before - 7 * 24 * 60 * 60 * 1000;
    expect(since.getTime()).toBeGreaterThanOrEqual(expectedSince - 1000);
    expect(since.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
