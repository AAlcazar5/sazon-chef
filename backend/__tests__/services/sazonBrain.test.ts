// ROADMAP 4.0 N0.1 — sazonBrain coordinator test (stub form).

import { prisma } from '../../src/lib/prisma';
import {
  recommend,
  __helpers,
} from '../../src/services/recommender/sazonBrain';
import { clearPersonalizationContextCache } from '../../src/services/personalizationContext';

const userFindUnique = jest.fn();
const pantryFindMany = jest.fn();
const cookingLogFindMany = jest.fn();
const cookingLogCount = jest.fn();
const recipeFindMany = jest.fn();
const recipeFindUnique = jest.fn();
const leftoverFindMany = jest.fn();
const mealPrepFindMany = jest.fn();

(prisma as any).user = {
  ...((prisma as any).user ?? {}),
  findUnique: userFindUnique,
};
(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany: pantryFindMany,
};
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
  count: cookingLogCount,
};
(prisma as any).recipe = {
  ...((prisma as any).recipe ?? {}),
  findMany: recipeFindMany,
  findUnique: recipeFindUnique,
};
(prisma as any).leftoverInventory = {
  ...((prisma as any).leftoverInventory ?? {}),
  findMany: leftoverFindMany,
};
(prisma as any).mealPrepPortion = {
  ...((prisma as any).mealPrepPortion ?? {}),
  findMany: mealPrepFindMany,
};

const NOW = new Date('2026-05-06T12:00:00Z');

beforeEach(() => {
  userFindUnique.mockReset();
  pantryFindMany.mockReset();
  cookingLogFindMany.mockReset();
  cookingLogCount.mockReset();
  recipeFindMany.mockReset();
  recipeFindUnique.mockReset();
  leftoverFindMany.mockReset();
  mealPrepFindMany.mockReset();
  userFindUnique.mockResolvedValue({
    createdAt: new Date('2026-04-01T00:00:00Z'),
    preferences: {
      cookingSkillLevel: null,
      goalPhase: null,
      cookTimePreference: null,
    },
  });
  pantryFindMany.mockResolvedValue([]);
  cookingLogFindMany.mockResolvedValue([]);
  cookingLogCount.mockResolvedValue(0);
  recipeFindMany.mockResolvedValue([]);
  recipeFindUnique.mockResolvedValue(null);
  leftoverFindMany.mockResolvedValue([]);
  mealPrepFindMany.mockResolvedValue([]);
  clearPersonalizationContextCache();
});

describe('N0.1 — input validation', () => {
  it('throws when userId is empty', async () => {
    await expect(
      recommend({ surface: 'today_hero', userId: '' }),
    ).rejects.toThrow(/userId/);
  });

  it('throws when item-anchored surface lacks anchor', async () => {
    await expect(
      recommend({ surface: 'recipe_detail_similar', userId: 'u1' }),
    ).rejects.toThrow(/anchor/);
    await expect(
      recommend({ surface: 'recipe_detail_insight', userId: 'u1' }),
    ).rejects.toThrow(/anchor/);
  });

  it('does not throw when user-anchored surface omits anchor', async () => {
    await expect(
      recommend({ surface: 'today_hero', userId: 'u1', now: NOW }),
    ).resolves.toBeTruthy();
  });
});

describe('N0.1 — surface dispatch', () => {
  it('today_hero returns source: ranker_t_bis (shipped surface)', async () => {
    const r = await recommend({ surface: 'today_hero', userId: 'u1', now: NOW });
    expect(r.surface).toBe('today_hero');
    expect(r.source).toBe('ranker_t_bis');
    expect(r.fallbackUsed).toBe(false);
  });

  it('week_slot returns source: ranker_unavailable (host-tier WK pending)', async () => {
    const r = await recommend({ surface: 'week_slot', userId: 'u1', now: NOW });
    expect(r.source).toBe('ranker_unavailable');
    expect(r.fallbackUsed).toBe(true);
    expect(r.candidates).toEqual([]);
  });

  it('build_a_plate_slot, sazon_chat, pantry_iq, activation all return ranker_unavailable until host tiers ship', async () => {
    const surfaces = [
      'build_a_plate_slot',
      'sazon_chat',
      'pantry_iq',
      'activation',
    ] as const;
    for (const surface of surfaces) {
      const r = await recommend({ surface, userId: 'u1', now: NOW });
      expect(r.source).toBe('ranker_unavailable');
      expect(r.fallbackUsed).toBe(true);
    }
  });

  it('recipe_detail_similar dispatches to retrieveSimilar with the anchor', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r-anchor',
      title: 'Anchor',
      cuisine: 'Italian',
      cookTime: 30,
      imageUrl: null,
      embedding: Buffer.from(Float32Array.from([1, 0, 0]).buffer),
      ingredients: [{ text: 'pasta' }],
      tagsString: '',
    });
    recipeFindMany.mockResolvedValue([
      {
        id: 'r-other',
        title: 'Other',
        cuisine: 'Italian',
        cookTime: 25,
        imageUrl: null,
        embedding: Buffer.from(Float32Array.from([0.9, 0.1, 0]).buffer),
        ingredients: [{ text: 'pasta' }],
        tagsString: '',
      },
    ]);
    const r = await recommend({
      surface: 'recipe_detail_similar',
      userId: 'u1',
      anchor: { type: 'recipe', id: 'r-anchor' },
      now: NOW,
    });
    expect(r.source).toBe('ranker_rd2_similar');
    expect(r.fallbackUsed).toBe(false);
    expect(r.candidates.length).toBeGreaterThanOrEqual(0);
    // Anchor self should be excluded by retrieveSimilar
    expect(r.candidates.find((c) => c.recipeId === 'r-anchor')).toBeUndefined();
  });

  it('recipe_detail_insight dispatches to recipeDiscoveryInsightService', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r-anchor',
      cuisine: 'Persian',
      iron: 10,
      ingredients: [{ text: 'sumac' }],
    });
    cookingLogFindMany.mockImplementation((arg: any) => {
      // userCookedIngredients call
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([
          { recipe: { ingredients: [{ text: 'olive oil' }] } },
        ]);
      }
      return Promise.resolve([]);
    });
    const r = await recommend({
      surface: 'recipe_detail_insight',
      userId: 'u1',
      anchor: { type: 'recipe', id: 'r-anchor' },
      now: NOW,
    });
    expect(r.source).toBe('ranker_rd6_insight');
    // Sumac is new for the user → first-with-ingredient rule fires
    expect(r.rationale.toLowerCase()).toContain('sumac');
  });
});

describe('N0.1 — context propagation', () => {
  it('every result carries the personalizationContext snapshot', async () => {
    pantryFindMany.mockResolvedValue([{ name: 'rice' }]);
    const r = await recommend({ surface: 'today_hero', userId: 'u1', now: NOW });
    expect(r.context.userId).toBe('u1');
    expect(r.context.pantry).toContain('rice');
    expect(r.context.signalCoverage).toBe('cold');
  });

  it('accepts a pre-built context (skips rebuild)', async () => {
    const preBuilt = {
      userId: 'u-pre',
      recentCookCount: 9,
      lifetimeCookCount: 30,
      daysSinceSignup: 45,
      signalCoverage: 'high' as const,
      pantry: ['saffron'],
      expiringItems: [],
      cuisineLean: [{ cuisine: 'Persian', cookCount: 4 }],
      preferences: {
        cookingSkillLevel: 'confident',
        goalPhase: null,
        nutritionUIDensity: null,
        cookTimePreference: 30,
      },
      asOf: NOW,
    };
    const r = await recommend({
      surface: 'today_hero',
      userId: 'u-pre',
      context: preBuilt,
      now: NOW,
    });
    expect(r.context).toBe(preBuilt);
    // userFindUnique should NOT have been called (context skipped rebuild)
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});

describe('N0.1 — shipped-surface registry (cap test)', () => {
  it('SHIPPED_SURFACES contains exactly the surfaces with live rankers today', () => {
    expect([...__helpers.SHIPPED_SURFACES].sort()).toEqual([
      'recipe_detail_insight',
      'recipe_detail_similar',
      'today_grid',
      'today_hero',
    ]);
  });

  it('ITEM_ANCHORED contains the recipe_detail_* family', () => {
    expect([...__helpers.ITEM_ANCHORED].sort()).toEqual([
      'recipe_detail_insight',
      'recipe_detail_similar',
    ]);
  });
});
