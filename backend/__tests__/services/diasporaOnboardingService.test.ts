// ROADMAP 4.0 G1.1 — diaspora onboarding service.
//
// Step ~3 of onboarding asks "Do you cook food from a heritage cuisine?"
// Multi-select (Mexican, Salvadoran, Peruvian, Brazilian, Caribbean, etc.)
// Selection seeds initial cuisine-affinity weights, soft-sets user.locale
// if device locale is en-US and the heritage suggests a non-English locale.

const mockUpsert = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userCuisineAdjacencyWeight: {
      upsert: jest.fn((arg) => mockUpsert(arg)),
    },
    user: {
      findUnique: jest.fn((arg) => mockUserFindUnique(arg)),
      update: jest.fn((arg) => mockUserUpdate(arg)),
    },
  },
}));

import {
  HERITAGE_CUISINES,
  applyDiasporaOnboarding,
  __forTest,
} from '../../src/services/diasporaOnboardingService';

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({});
  mockUserUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id: where.id, locale: data.locale ?? null }),
  );
});

describe('HERITAGE_CUISINES catalog', () => {
  it('ships at least 10 heritage options covering LATAM + Brazil + Caribbean', () => {
    expect(HERITAGE_CUISINES.length).toBeGreaterThanOrEqual(10);
    const cuisines = HERITAGE_CUISINES.map((h) => h.cuisine);
    expect(cuisines).toContain('mexican');
    expect(cuisines).toContain('salvadoran');
    expect(cuisines).toContain('peruvian');
    expect(cuisines).toContain('brazilian');
    expect(cuisines).toContain('cuban');
  });

  it('every heritage has cuisine + label + suggestedLocale (or null) + emoji', () => {
    for (const h of HERITAGE_CUISINES) {
      expect(h.cuisine).toBeTruthy();
      expect(h.cuisine).toBe(h.cuisine.toLowerCase());
      expect(h.label).toBeTruthy();
      expect(h.label.length).toBeGreaterThan(2);
      // suggestedLocale is null OR a valid BCP 47 tag
      if (h.suggestedLocale != null) {
        expect(h.suggestedLocale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      }
      expect(h.emoji).toBeTruthy();
    }
  });

  it('cuisine values are unique', () => {
    const set = new Set(HERITAGE_CUISINES.map((h) => h.cuisine));
    expect(set.size).toBe(HERITAGE_CUISINES.length);
  });
});

describe('applyDiasporaOnboarding', () => {
  it('seeds positive cuisine-affinity weights for each selected heritage', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican', 'peruvian'],
      deviceLocale: 'en-US',
    });

    expect(result.seededWeights).toBeGreaterThan(0);
    // self-edge per heritage seeded
    expect(mockUpsert).toHaveBeenCalled();
    const seedCalls = mockUpsert.mock.calls;
    // Every upsert has positive weight + signalCount >=1
    for (const [arg] of seedCalls) {
      expect(arg.create.weight).toBeGreaterThan(0);
      expect(arg.create.signalCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('seeds adjacent-cuisine edges in addition to direct heritage', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican'],
      deviceLocale: 'en-US',
    });
    // Mexican heritage seeds direct + at least one adjacent (e.g. yucatecan, oaxacan)
    expect(mockUpsert.mock.calls.length).toBeGreaterThan(0);
    const targets = mockUpsert.mock.calls.map((c) => c[0].create.targetCuisine);
    // The direct edge should be present
    expect(targets).toContain('mexican');
    // At least one adjacent should appear
    const uniqueTargets = new Set(targets);
    expect(uniqueTargets.size).toBeGreaterThan(1);
  });

  it('soft-sets locale when device is en-US and a non-en heritage selected', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican'],
      deviceLocale: 'en-US',
    });
    // Should suggest es-MX
    expect(result.localeApplied).toBe('es-MX');
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ locale: 'es-MX' }),
      }),
    );
  });

  it('does NOT soft-set locale when device locale is non-en (user already chose)', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'es-AR' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican'],
      deviceLocale: 'es-AR',
    });
    expect(result.localeApplied).toBeNull();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('does NOT overwrite locale when user already has a non-en locale persisted', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'pt-BR' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican'],
      deviceLocale: 'en-US',
    });
    expect(result.localeApplied).toBeNull();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('skips unknown heritage strings without throwing', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['atlantis-cuisine', 'mexican'],
      deviceLocale: 'en-US',
    });
    // Mexican still seeds; atlantis is silently dropped.
    expect(result.heritagesApplied).toContain('mexican');
    expect(result.heritagesApplied).not.toContain('atlantis-cuisine');
  });

  it('rejects empty userId', async () => {
    await expect(
      applyDiasporaOnboarding({ userId: '', heritages: ['mexican'], deviceLocale: 'en-US' }),
    ).rejects.toThrow(/userId/i);
  });

  it('returns no-op result when heritages is empty', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: [],
      deviceLocale: 'en-US',
    });
    expect(result.heritagesApplied).toEqual([]);
    expect(result.seededWeights).toBe(0);
    expect(result.localeApplied).toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('Brazilian heritage suggests pt-BR locale on en-US device', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['brazilian'],
      deviceLocale: 'en-US',
    });
    expect(result.localeApplied).toBe('pt-BR');
  });

  it('multiple Spanish-speaking heritages → pt loses to es when first selected', async () => {
    // Both selected; first-wins among those that suggest a locale.
    mockUserFindUnique.mockResolvedValue({ id: 'u1', locale: 'en' });
    const result = await applyDiasporaOnboarding({
      userId: 'u1',
      heritages: ['mexican', 'brazilian'],
      deviceLocale: 'en-US',
    });
    // First in the input drives the locale suggestion
    expect(result.localeApplied).toBe('es-MX');
  });

  it('exposes constants for cap-test inspection', () => {
    expect(__forTest.DIRECT_WEIGHT).toBeGreaterThan(0);
    expect(__forTest.ADJACENT_WEIGHT).toBeGreaterThan(0);
    expect(__forTest.DIRECT_WEIGHT).toBeGreaterThan(__forTest.ADJACENT_WEIGHT);
  });
});
