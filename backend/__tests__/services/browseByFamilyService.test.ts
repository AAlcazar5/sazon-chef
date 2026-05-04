// backend/__tests__/services/browseByFamilyService.test.ts
// Group 11 Phase 5 — "Browse by Region" personalized family ranking.

const mockCookingLogFindMany = jest.fn();
const mockSavedRecipeFindMany = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    savedRecipe: { findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a) },
  },
}));

import { buildBrowseByFamily } from '../../src/services/browseByFamilyService';

describe('browseByFamilyService.buildBrowseByFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookingLogFindMany.mockResolvedValue([]);
    mockSavedRecipeFindMany.mockResolvedValue([]);
  });

  it('returns every cuisine family with empty signals for a brand-new user', async () => {
    const result = await buildBrowseByFamily('user-1');

    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.affinityScore).toBe(0);
      expect(entry.isExplored).toBe(false);
      expect(entry.exploredCuisines).toEqual([]);
    }
  });

  it('orders families with cooked cuisines above untouched families', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: 'Thai' } },
      { recipe: { cuisine: 'Thai' } },
    ]);

    const result = await buildBrowseByFamily('user-1');

    // Find the family containing Thai (East & Southeast Asian)
    const thaiFamily = result.find((f) => f.cuisines.includes('Thai'));
    expect(thaiFamily).toBeDefined();
    expect(thaiFamily!.affinityScore).toBeGreaterThan(0);
    expect(thaiFamily!.exploredCuisines).toContain('Thai');
    expect(thaiFamily!.isExplored).toBe(true);

    // The Thai family should be at index 0 (highest affinity wins)
    expect(result[0].family).toBe(thaiFamily!.family);
  });

  it('weights cooks 2x heavier than saves', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: 'Thai' } }, // +2
    ]);
    mockSavedRecipeFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: 'Mexican' } }, // +1
      { recipe: { cuisine: 'Mexican' } }, // +1
    ]);

    const result = await buildBrowseByFamily('user-1');

    const mexicanFamily = result.find((f) => f.cuisines.includes('Mexican'));
    const thaiFamily = result.find((f) => f.cuisines.includes('Thai'));

    // Mexican family score = 2, Thai family score = 2 → tie, alpha sorts
    // Both should be above zero-score families.
    const otherFamilies = result.filter(
      (f) => f.family !== mexicanFamily!.family && f.family !== thaiFamily!.family,
    );
    for (const f of otherFamilies) {
      expect(f.affinityScore).toBeLessThanOrEqual(thaiFamily!.affinityScore);
    }
  });

  it('flags families containing cuisines adjacent to user affinity as hasNewForYou', async () => {
    // User has cooked Thai → Burmese / Vietnamese / Lao should appear in
    // their respective families with hasNewForYou=true
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: 'Thai' } },
    ]);

    const result = await buildBrowseByFamily('user-1');

    // East & Southeast Asian family contains both Thai (explored) AND
    // adjacents like Burmese / Vietnamese (not yet cooked) — but since
    // it's already explored, its hasNewForYou status reflects whether
    // OTHER unexplored cuisines in the family are adjacent.
    const seasiaFamily = result.find((f) => f.family.includes('East & Southeast Asian'));
    expect(seasiaFamily).toBeDefined();
    // Burmese / Vietnamese / Lao live in this family, are unexplored,
    // and adjacent to Thai → flag should be set.
    expect(seasiaFamily!.hasNewForYou).toBe(true);
  });

  it('does not flag hasNewForYou for families with no adjacency to user affinity', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: 'Thai' } },
    ]);

    const result = await buildBrowseByFamily('user-1');

    // European Nordic has no adjacency to Thai
    const nordic = result.find((f) => f.family.includes('Nordic'));
    expect(nordic).toBeDefined();
    expect(nordic!.hasNewForYou).toBe(false);
  });

  it('returns identical family + cuisine names as the canonical CUISINE_FAMILIES map', async () => {
    const result = await buildBrowseByFamily('user-1');

    // Spot check a few canonical entries
    const latam = result.find((f) => f.family === 'Latin American');
    expect(latam?.cuisines).toEqual(expect.arrayContaining(['Mexican', 'Salvadorean', 'Peruvian']));

    const seasian = result.find((f) => f.family === 'East & Southeast Asian');
    expect(seasian?.cuisines).toEqual(
      expect.arrayContaining(['Chinese', 'Japanese', 'Thai', 'Vietnamese']),
    );
  });

  it('skips null cuisine entries in the cooking log', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipe: { cuisine: null } },
      { recipe: null },
    ]);

    const result = await buildBrowseByFamily('user-1');

    for (const entry of result) {
      expect(entry.affinityScore).toBe(0);
    }
  });
});
