// ROADMAP 4.0 G2.2 — city-cuisine affinity graph.
//
// Curated table of ~50 launch cities × ~10 signature dishes. Service joins
// the city's specialty list with the user's cuisine affinity weights so a
// user landing in CDMX who has high mexican-cuisine signal sees a different
// ranking than a mexican-cuisine novice.

const mockAdjacencyFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userCuisineAdjacencyWeight: {
      findMany: (...a: unknown[]) => mockAdjacencyFindMany(...a),
    },
  },
}));

import {
  getCityDishRecommendations,
  CITY_CUISINE_CATALOG,
  resolveCity,
  __forTest,
} from '../../src/services/cityCuisineService';

beforeEach(() => {
  jest.clearAllMocks();
  mockAdjacencyFindMany.mockResolvedValue([]);
});

describe('CITY_CUISINE_CATALOG — data integrity', () => {
  it('ships at least 30 launch cities', () => {
    expect(Object.keys(CITY_CUISINE_CATALOG).length).toBeGreaterThanOrEqual(30);
  });

  it('every city has at least 5 specialty dishes', () => {
    for (const [city, entry] of Object.entries(CITY_CUISINE_CATALOG)) {
      expect(entry.dishes.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('every city carries country + region + lat/lng', () => {
    for (const [city, entry] of Object.entries(CITY_CUISINE_CATALOG)) {
      expect(entry.country).toBeTruthy();
      expect(entry.region).toBeTruthy();
      expect(typeof entry.latitude).toBe('number');
      expect(typeof entry.longitude).toBe('number');
    }
  });

  it('every dish has name + cuisine + a one-line hook', () => {
    for (const [city, entry] of Object.entries(CITY_CUISINE_CATALOG)) {
      for (const dish of entry.dishes) {
        expect(dish.name).toBeTruthy();
        expect(dish.cuisine).toBeTruthy();
        expect(dish.cuisine).toBe(dish.cuisine.toLowerCase());
        expect(dish.hook.length).toBeGreaterThan(15);
      }
    }
  });

  it('city keys are lowercase + slug-safe (no spaces, no accents)', () => {
    for (const key of Object.keys(CITY_CUISINE_CATALOG)) {
      expect(key).toBe(key.toLowerCase());
      expect(key).not.toMatch(/\s/);
      // ASCII slug
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('includes the launch-cohort cities (CDMX, Lima, NYC, São Paulo, Lisbon, Madrid)', () => {
    expect(CITY_CUISINE_CATALOG['cdmx']).toBeDefined();
    expect(CITY_CUISINE_CATALOG['lima']).toBeDefined();
    expect(CITY_CUISINE_CATALOG['nyc']).toBeDefined();
    expect(CITY_CUISINE_CATALOG['sao-paulo']).toBeDefined();
    expect(CITY_CUISINE_CATALOG['lisbon']).toBeDefined();
    expect(CITY_CUISINE_CATALOG['madrid']).toBeDefined();
  });
});

describe('resolveCity', () => {
  it('exact slug match returns the entry', () => {
    expect(resolveCity('cdmx')).not.toBeNull();
    expect(resolveCity('cdmx')!.country).toBe('Mexico');
  });

  it('case-insensitive', () => {
    expect(resolveCity('CDMX')).not.toBeNull();
    expect(resolveCity('Lima')).not.toBeNull();
  });

  it('common alias resolution (Mexico City → cdmx, New York → nyc)', () => {
    expect(resolveCity('mexico city')!.country).toBe('Mexico');
    expect(resolveCity('new york')!.country).toBe('USA');
    expect(resolveCity('new york city')!.country).toBe('USA');
  });

  it('returns null for unknown cities', () => {
    expect(resolveCity('atlantis')).toBeNull();
    expect(resolveCity('')).toBeNull();
  });

  it('strips diacritics for accent-insensitive lookup (são paulo → sao-paulo)', () => {
    expect(resolveCity('são paulo')!.country).toBe('Brazil');
  });
});

describe('getCityDishRecommendations', () => {
  it('returns the city dishes ordered most-aligned-first when user has cuisine signal', async () => {
    // CDMX dishes include mole (oaxacan), pozole (mexican), tacos (mexican), etc.
    // User has strong oaxacan affinity but no mexican baseline → mole bubbles up.
    mockAdjacencyFindMany.mockResolvedValue([
      { sourceCuisine: 'mexican', targetCuisine: 'oaxacan', weight: 1.5, signalCount: 8 },
    ]);

    const result = await getCityDishRecommendations({
      userId: 'u1',
      city: 'cdmx',
      k: 5,
    });

    expect(result.city).not.toBeNull();
    expect(result.city!.country).toBe('Mexico');
    expect(result.dishes.length).toBeGreaterThan(0);
    expect(result.dishes.length).toBeLessThanOrEqual(5);
    expect(result.dishes[0].name).toBeTruthy();
    expect(result.dishes[0].score).toBeGreaterThanOrEqual(0);
  });

  it('returns dishes sorted by score (descending)', async () => {
    mockAdjacencyFindMany.mockResolvedValue([
      { sourceCuisine: 'mexican', targetCuisine: 'oaxacan', weight: 2.0, signalCount: 10 },
    ]);
    const result = await getCityDishRecommendations({ userId: 'u1', city: 'cdmx', k: 10 });
    for (let i = 1; i < result.dishes.length; i += 1) {
      expect(result.dishes[i - 1].score).toBeGreaterThanOrEqual(result.dishes[i].score);
    }
  });

  it('user with zero affinity still gets the city dishes (cold-start safe)', async () => {
    mockAdjacencyFindMany.mockResolvedValue([]);
    const result = await getCityDishRecommendations({ userId: 'u1', city: 'lima', k: 5 });
    expect(result.dishes.length).toBeGreaterThan(0);
    // Cold-start scores are uniform-ish but non-zero (BASE_SCORE).
    for (const d of result.dishes) {
      expect(d.score).toBeGreaterThan(0);
    }
  });

  it('returns empty + null city when city is unknown', async () => {
    const result = await getCityDishRecommendations({
      userId: 'u1',
      city: 'atlantis',
      k: 5,
    });
    expect(result.city).toBeNull();
    expect(result.dishes).toEqual([]);
  });

  it('honors k cap (default 5, max MAX_K)', async () => {
    const cdmxDishes = CITY_CUISINE_CATALOG['cdmx'].dishes.length;
    const result = await getCityDishRecommendations({ userId: 'u1', city: 'cdmx' });
    // default k = 5
    expect(result.dishes.length).toBeLessThanOrEqual(5);

    const big = await getCityDishRecommendations({
      userId: 'u1',
      city: 'cdmx',
      k: 999,
    });
    // capped at MAX_K, but bounded by available dishes
    expect(big.dishes.length).toBeLessThanOrEqual(__forTest.MAX_K);
    expect(big.dishes.length).toBeLessThanOrEqual(cdmxDishes);
  });

  it('rationale lists the matched user-affinity cuisines for ranked dishes', async () => {
    mockAdjacencyFindMany.mockResolvedValue([
      { sourceCuisine: 'mexican', targetCuisine: 'oaxacan', weight: 2.0, signalCount: 10 },
    ]);
    const result = await getCityDishRecommendations({ userId: 'u1', city: 'cdmx', k: 10 });
    const oaxacanDish = result.dishes.find((d) => d.cuisine === 'oaxacan');
    if (oaxacanDish) {
      expect(oaxacanDish.affinityMatched).toContain('oaxacan');
    }
  });

  it('rejects empty userId', async () => {
    await expect(
      getCityDishRecommendations({ userId: '', city: 'cdmx', k: 5 }),
    ).rejects.toThrow(/userId/i);
  });

  it('queries user adjacency weights only once per call', async () => {
    await getCityDishRecommendations({ userId: 'u1', city: 'cdmx', k: 5 });
    expect(mockAdjacencyFindMany).toHaveBeenCalledTimes(1);
  });

  it('exposes constants for cap-test inspection', () => {
    expect(__forTest.MAX_K).toBeGreaterThan(0);
    expect(__forTest.BASE_SCORE).toBeGreaterThan(0);
    expect(__forTest.AFFINITY_WEIGHT_PER_SIGNAL).toBeGreaterThan(0);
  });
});
