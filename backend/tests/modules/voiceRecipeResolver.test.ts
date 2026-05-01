// backend/tests/modules/voiceRecipeResolver.test.ts
// TDD: Voice utterance → recipe fuzzy match

import { resolveVoiceUtterance } from '../../src/services/voiceRecipeResolver';

// ── Prisma mock ───────────────────────────────────────────────────────────────

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
    },
  },
}));

function getPrismaMock() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require('../../src/lib/prisma');
  return prisma;
}

// ── Recipe fixtures ───────────────────────────────────────────────────────────

const RECIPES = [
  { id: 'r1', title: 'Spaghetti Carbonara' },
  { id: 'r2', title: 'Chicken Tikka Masala' },
  { id: 'r3', title: 'Avocado Toast' },
  { id: 'r4', title: 'Greek Salad' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resolveVoiceUtterance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── exact match ───────────────────────────────────────────────────────────

  it('exact title match returns confidence ≥ 0.95 and matchType recipe', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', 'Spaghetti Carbonara');

    expect(result.matchType).toBe('recipe');
    expect(result.recipeId).toBe('r1');
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.name).toBe('Spaghetti Carbonara');
  });

  it('exact title match (case-insensitive) returns confidence ≥ 0.95', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', 'spaghetti carbonara');

    expect(result.matchType).toBe('recipe');
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  // ── one-typo match ────────────────────────────────────────────────────────

  it('one-typo match returns confidence ≥ 0.7 and matchType recipe', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    // "Avacado Toast" has one typo (Avacado vs Avocado)
    const result = await resolveVoiceUtterance('user-1', 'Avacado Toast');

    expect(result.matchType).toBe('recipe');
    expect(result.recipeId).toBe('r3');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  // ── no match / literal ────────────────────────────────────────────────────

  it('"buy chicken" falls below 0.7 → matchType literal', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', 'buy chicken');

    expect(result.matchType).toBe('literal');
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.name).toBe('buy chicken');
    expect(result.recipeId).toBeUndefined();
  });

  it('completely unrelated utterance → matchType literal', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', 'xyz123 random stuff');

    expect(result.matchType).toBe('literal');
  });

  // ── empty cookbook ────────────────────────────────────────────────────────

  it('empty cookbook always returns matchType literal', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue([]);

    const result = await resolveVoiceUtterance('user-1', 'Spaghetti Carbonara');

    expect(result.matchType).toBe('literal');
    expect(result.name).toBe('Spaghetti Carbonara');
  });

  // ── confidence bounds ─────────────────────────────────────────────────────

  it('confidence is always in [0, 1] for any utterance', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const utterances = [
      'Spaghetti Carbonara',
      'buy milk',
      '',
      'a',
      'Greek Salad with extra feta cheese please',
    ];

    for (const utterance of utterances) {
      const result = await resolveVoiceUtterance('user-1', utterance);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  // ── empty utterance ───────────────────────────────────────────────────────

  it('empty utterance returns matchType literal with confidence 0', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', '');

    expect(result.matchType).toBe('literal');
    expect(result.confidence).toBe(0);
  });

  // ── return shape ──────────────────────────────────────────────────────────

  it('always returns the required fields', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue(RECIPES);

    const result = await resolveVoiceUtterance('user-1', 'Chicken Tikka Masala');

    expect(result).toHaveProperty('matchType');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('name');
    // recipeId only present on recipe match
    expect(['recipe', 'literal']).toContain(result.matchType);
  });

  // ── queries only the given userId ─────────────────────────────────────────

  it('queries prisma with the provided userId', async () => {
    getPrismaMock().recipe.findMany.mockResolvedValue([]);
    const prisma = getPrismaMock();

    await resolveVoiceUtterance('user-xyz', 'something');

    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-xyz' }) })
    );
  });
});
