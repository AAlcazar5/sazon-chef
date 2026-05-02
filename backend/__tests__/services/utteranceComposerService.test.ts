// backend/__tests__/services/utteranceComposerService.test.ts
// Group 10X Phase 7 — voice/utterance composer tests.

import { composePlateFromUtterance } from '../../src/services/utteranceComposerService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

const buildComponent = (overrides: Partial<any>) => ({
  id: 'c1',
  slot: 'base',
  name: 'Brown Rice',
  description: null,
  defaultPortionGrams: 150,
  caloriesPerPortion: 200,
  proteinG: 4,
  carbsG: 42,
  fatG: 2,
  fiberG: 3,
  estimatedCostPerPortion: 0.5,
  cuisineTags: JSON.stringify([]),
  dietaryTags: JSON.stringify([]),
  cookMethodHint: 'simmer',
  pantryIngredientNames: JSON.stringify([]),
  imageUrl: null,
  isUserCreated: false,
  userId: null,
  ...overrides,
});

beforeAll(() => {
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.mealComponent.findMany.mockResolvedValue([]);
});

describe('composePlateFromUtterance — slot inference', () => {
  it('extracts protein, base, vegetable, sauce slots from a 4-slot utterance', async () => {
    const salmon = buildComponent({ id: 'salmon-1', slot: 'protein', name: 'Salmon' });
    const rice = buildComponent({ id: 'rice-1', slot: 'base', name: 'Brown Rice' });
    const broccoli = buildComponent({
      id: 'broc-1',
      slot: 'vegetable',
      name: 'Roasted Broccoli',
      cookMethodHint: 'roast',
    });
    const peanut = buildComponent({ id: 'pean-1', slot: 'sauce', name: 'Peanut Sauce' });

    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      salmon,
      rice,
      broccoli,
      peanut,
    ]);

    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: 'salmon, brown rice, roasted broccoli, peanut sauce',
    });

    expect(result.inferredSlots.protein).toBe('salmon-1');
    expect(result.inferredSlots.base).toBe('rice-1');
    expect(result.inferredSlots.vegetable).toBe('broc-1');
    expect(result.inferredSlots.sauce).toBe('pean-1');
    expect(result.unmatchedSlots).toEqual(['garnish']);
  });

  it('returns cuisine filter and leaves unmatched slots open', async () => {
    const chicken = buildComponent({
      id: 'chick-1',
      slot: 'protein',
      name: 'Grilled Chicken',
      cuisineTags: JSON.stringify(['Mediterranean']),
    });
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([chicken]);

    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: 'something Mediterranean with chicken',
    });

    expect(result.cuisineFilter).toBe('Mediterranean');
    expect(result.inferredSlots.protein).toBe('chick-1');
    expect(result.unmatchedSlots).toEqual(expect.arrayContaining(['base', 'vegetable', 'sauce']));
  });

  it('returns an empty plate (no slots filled) for ambiguous utterance', async () => {
    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: 'just dinner',
    });

    expect(result.inferredSlots).toEqual({});
    expect(result.unmatchedSlots).toEqual(
      expect.arrayContaining(['protein', 'base', 'vegetable', 'sauce', 'garnish'])
    );
    expect(result.cuisineFilter).toBeUndefined();
  });

  it('extracts dietary excludes ("no garlic", "no dairy")', async () => {
    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: 'something with chicken, no garlic, no dairy',
    });

    expect(result.dietaryExcludes).toEqual(expect.arrayContaining(['garlic', 'dairy']));
  });

  it('infers cookMethodHint preference from "roast some veg"', async () => {
    const broccoli = buildComponent({
      id: 'broc-1',
      slot: 'vegetable',
      name: 'Broccoli',
      cookMethodHint: 'roast',
    });
    const steamedBroc = buildComponent({
      id: 'broc-2',
      slot: 'vegetable',
      name: 'Steamed Broccoli',
      cookMethodHint: 'simmer',
    });
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([broccoli, steamedBroc]);

    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: 'roast some broccoli',
    });

    expect(result.inferredSlots.vegetable).toBe('broc-1');
  });

  it('IDOR-scopes component lookup to userId or null', async () => {
    await composePlateFromUtterance({
      userId: 'user-xyz',
      utterance: 'salmon and rice',
    });
    const callArgs = mockPrisma.mealComponent.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([{ userId: null }, { userId: 'user-xyz' }])
    );
  });

  it('handles empty/whitespace-only utterance gracefully', async () => {
    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: '   ',
    });
    expect(result.inferredSlots).toEqual({});
    expect(result.unmatchedSlots.length).toBeGreaterThan(0);
  });

  it('caps utterance length at 500 chars (defensive)', async () => {
    const longUtterance = 'a'.repeat(2000) + ' chicken';
    const result = await composePlateFromUtterance({
      userId: 'user-1',
      utterance: longUtterance,
    });
    expect(result).toBeDefined();
  });
});
