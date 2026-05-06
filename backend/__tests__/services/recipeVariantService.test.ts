// backend/__tests__/services/recipeVariantService.test.ts
// ROADMAP 4.0 Tier J18.1 — Recipe variants as siblings (TDD).
//
// The variant service exposes 1–2 sibling versions of a recipe ("same dish,
// different technique"). Tag taxonomy is locked at:
//   weeknight | sunday | campfire | lighter
// Anything else is rejected. Banned vocab regression on titles + technique
// lines.

import {
  getVariantsFor,
  isValidVariantTag,
  RECIPE_VARIANT_TAGS,
  attachVariantsToRecipe,
} from '../../src/services/recipeVariantService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.recipeVariant = mockPrisma.recipeVariant ?? { findMany: jest.fn() };
  mockPrisma.recipeVariant.findMany = jest.fn();
});

describe('isValidVariantTag', () => {
  it('accepts the four canonical tags', () => {
    for (const tag of RECIPE_VARIANT_TAGS) {
      expect(isValidVariantTag(tag)).toBe(true);
    }
  });

  it('rejects unknown tags', () => {
    expect(isValidVariantTag('healthy')).toBe(false);
    expect(isValidVariantTag('low-fat')).toBe(false);
    expect(isValidVariantTag('skinny')).toBe(false);
    expect(isValidVariantTag('')).toBe(false);
    expect(isValidVariantTag(null as unknown as string)).toBe(false);
  });
});

describe('getVariantsFor', () => {
  it('returns sibling recipes with their tags', async () => {
    mockPrisma.recipeVariant.findMany.mockResolvedValue([
      {
        tag: 'lighter',
        techniqueLine: 'oven-finished — same melt, less oil',
        sibling: {
          id: 'sib-1',
          title: 'Enchiladas, oven-finished',
          imageUrl: null,
          cuisine: 'Mexican',
          cookTime: 35,
        },
      },
    ]);

    const result = await getVariantsFor('parent-1');
    expect(result.length).toBe(1);
    expect(result[0].tag).toBe('lighter');
    expect(result[0].siblingRecipe.id).toBe('sib-1');
    expect(result[0].techniqueLine).toMatch(/oven-finished/);
  });

  it('filters out variants with invalid tags (defense in depth)', async () => {
    mockPrisma.recipeVariant.findMany.mockResolvedValue([
      {
        tag: 'lighter',
        techniqueLine: null,
        sibling: { id: 'a', title: 'A', imageUrl: null, cuisine: 'X', cookTime: 10 },
      },
      {
        tag: 'low-fat', // unknown — must be filtered
        techniqueLine: null,
        sibling: { id: 'b', title: 'B', imageUrl: null, cuisine: 'X', cookTime: 10 },
      },
    ]);

    const result = await getVariantsFor('parent-1');
    expect(result.length).toBe(1);
    expect(result[0].tag).toBe('lighter');
  });

  it('returns an empty list when no variants exist', async () => {
    mockPrisma.recipeVariant.findMany.mockResolvedValue([]);
    const result = await getVariantsFor('parent-1');
    expect(result).toEqual([]);
  });

  it('returns empty list for empty/null recipeId', async () => {
    expect(await getVariantsFor('')).toEqual([]);
    expect(await getVariantsFor(undefined as unknown as string)).toEqual([]);
  });
});

describe('attachVariantsToRecipe', () => {
  it('returns the recipe with a `variants` array attached', async () => {
    mockPrisma.recipeVariant.findMany.mockResolvedValue([
      {
        tag: 'lighter',
        techniqueLine: 'oven-finished — same melt, less oil',
        sibling: { id: 'sib-1', title: 'Enchiladas, oven-finished', imageUrl: null, cuisine: 'Mexican', cookTime: 30 },
      },
    ]);
    const recipe = { id: 'p1', title: 'Enchiladas', cuisine: 'Mexican' } as any;
    const out = await attachVariantsToRecipe(recipe);
    expect(out.variants).toBeDefined();
    expect(out.variants.length).toBe(1);
    expect(out.variants[0].tag).toBe('lighter');
  });
});

describe('recipeVariantService — banned-vocab regression', () => {
  // Persona discipline: variant titles + technique lines must never use
  // health-prescriptive framing. This test scans any variants returned
  // through getVariantsFor — defense against bad seeds leaking into the
  // recipe-detail surface.
  const BANNED = [
    'healthy alternative',
    'guilt-free',
    'skinny',
    'macro-friendly',
    'instead of',
    'low-fat',
    'diet',
    'lose',
    'weight',
    'less than',
    'optimize',
  ];

  it('returned variants emit no banned vocab in titles or technique lines', async () => {
    // Seed a deliberately-clean fixture.
    mockPrisma.recipeVariant.findMany.mockResolvedValue([
      {
        tag: 'lighter',
        techniqueLine: 'oven-finished — same melt, less oil',
        sibling: {
          id: 'sib-1',
          title: 'Enchiladas, oven-finished',
          imageUrl: null,
          cuisine: 'Mexican',
          cookTime: 30,
        },
      },
      {
        tag: 'weeknight',
        techniqueLine: 'sheet-pan version, ready in 25 minutes',
        sibling: {
          id: 'sib-2',
          title: 'Tacos with charred corn',
          imageUrl: null,
          cuisine: 'Mexican',
          cookTime: 25,
        },
      },
    ]);

    const result = await getVariantsFor('parent-1');
    const allText = result
      .flatMap((v) => [v.siblingRecipe.title ?? '', v.techniqueLine ?? ''])
      .join(' ')
      .toLowerCase();
    for (const term of BANNED) {
      expect(allText).not.toContain(term.toLowerCase());
    }
  });
});
