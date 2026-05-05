// backend/__tests__/services/cohortSocialProofService.test.ts

const mockCookingLogFindMany = jest.fn();
const mockRecipeViewFindMany = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: (...args: unknown[]) => mockCookingLogFindMany(...args) },
    recipeView: { findMany: (...args: unknown[]) => mockRecipeViewFindMany(...args) },
  },
}));

import {
  computeCohortSocialProof,
  SOCIAL_PROOF_CONSTANTS,
} from '../../src/services/cohortSocialProofService';

const ASOF = new Date('2026-05-04T00:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
});

function makeView(userId: string, cuisine: string) {
  return { userId, recipe: { cuisine } };
}

function makeCook(cuisine: string) {
  return { recipe: { cuisine } };
}

describe('computeCohortSocialProof', () => {
  it('returns null when no cuisine clears the MIN_VIEWS_FOR_TRENDING threshold', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    // Persian has 4 viewers — under the floor of 5.
    mockRecipeViewFindMany.mockResolvedValue([
      makeView('u1', 'Persian'),
      makeView('u2', 'Persian'),
      makeView('u3', 'Persian'),
      makeView('u4', 'Persian'),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result).toBeNull();
  });

  it('returns the cuisine with the most unique cohort viewers', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockRecipeViewFindMany.mockResolvedValue([
      // Persian: 6 unique viewers
      makeView('u1', 'Persian'),
      makeView('u2', 'Persian'),
      makeView('u3', 'Persian'),
      makeView('u4', 'Persian'),
      makeView('u5', 'Persian'),
      makeView('u6', 'Persian'),
      // Thai: 5 unique viewers
      makeView('u1', 'Thai'),
      makeView('u2', 'Thai'),
      makeView('u3', 'Thai'),
      makeView('u4', 'Thai'),
      makeView('u5', 'Thai'),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result?.cuisine).toBe('persian');
    expect(result?.uniqueUsers).toBe(6);
    expect(result?.copy).toMatch(/Persian is trending/);
  });

  it('counts each user once per cuisine even with multiple views', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    // u1 viewed Persian 3 times — should count as 1 unique viewer.
    mockRecipeViewFindMany.mockResolvedValue([
      makeView('u1', 'Persian'),
      makeView('u1', 'Persian'),
      makeView('u1', 'Persian'),
      makeView('u2', 'Persian'),
      makeView('u3', 'Persian'),
      makeView('u4', 'Persian'),
      makeView('u5', 'Persian'),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result?.uniqueUsers).toBe(5);
  });

  it('excludes cuisines the target user has cooked recently', async () => {
    // User cooked Persian in the last 30 days — exclude from suggestions.
    mockCookingLogFindMany.mockResolvedValue([makeCook('Persian')]);
    mockRecipeViewFindMany.mockResolvedValue([
      // Persian: 10 viewers (would lead but is excluded)
      ...Array.from({ length: 10 }, (_, i) => makeView(`u${i}`, 'Persian')),
      // Thai: 5 viewers
      ...Array.from({ length: 5 }, (_, i) => makeView(`v${i}`, 'Thai')),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result?.cuisine).toBe('thai');
  });

  it('returns null when all leaders are excluded', async () => {
    mockCookingLogFindMany.mockResolvedValue([
      makeCook('Persian'),
      makeCook('Thai'),
    ]);
    mockRecipeViewFindMany.mockResolvedValue([
      ...Array.from({ length: 10 }, (_, i) => makeView(`u${i}`, 'Persian')),
      ...Array.from({ length: 8 }, (_, i) => makeView(`v${i}`, 'Thai')),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result).toBeNull();
  });

  it('skips views with no cuisine label', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockRecipeViewFindMany.mockResolvedValue([
      ...Array.from({ length: 6 }, (_, i) => makeView(`u${i}`, '')),
      ...Array.from({ length: 5 }, (_, i) => makeView(`v${i}`, 'Thai')),
    ]);
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result?.cuisine).toBe('thai');
  });

  it('lifestyle copy is short and capitalized', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockRecipeViewFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => makeView(`u${i}`, 'salvadorean')),
    );
    const result = await computeCohortSocialProof({ userId: 'me', asOfDate: ASOF });
    expect(result?.copy).toBe('Salvadorean is trending in your taste cluster.');
    expect(result?.copy.length).toBeLessThan(80);
  });

  it('exposes the tunable constants', () => {
    expect(SOCIAL_PROOF_CONSTANTS.LOOKBACK_DAYS).toBe(7);
    expect(SOCIAL_PROOF_CONSTANTS.MIN_VIEWS_FOR_TRENDING).toBe(5);
    expect(SOCIAL_PROOF_CONSTANTS.PERSONAL_RECENT_COOK_LOOKBACK_DAYS).toBe(30);
  });
});
