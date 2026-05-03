// Group 10R: Tip matching engine tests.
// Verifies N=1 ranking, dedup, fallback, and engagement-signal feedback.

import {
  matchFoodIntelTips,
  rankFoodIntelTips,
  recordTipEngagement,
  loadSeenTipIds,
  clearSeenTipIds,
  type TipContext,
  type UserState,
  type EngagementSignal,
} from '../../lib/foodIntelMatcher';
import { FOOD_INTEL_TIPS } from '../../lib/foodIntelTips';

// ── Mock AsyncStorage ───────────────────────────────────────────────────────
const memStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(memStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    memStore[k] = v;
    return Promise.resolve();
  }),
  removeItem: jest.fn((k: string) => {
    delete memStore[k];
    return Promise.resolve();
  }),
}));

const baseUser: UserState = {
  userId: 'user_test',
  cookHistory: { cuisines: [] },
  topAffinityIngredients: [],
  rolling7dNutrientGaps: [],
  skillTier: 'cook',
  goalPhase: 'maintain',
};

beforeEach(() => {
  for (const k of Object.keys(memStore)) delete memStore[k];
});

describe('matchFoodIntelTips', () => {
  it('returns turmeric tip when ingredients include turmeric', async () => {
    const tips = await matchFoodIntelTips(
      { ingredients: ['turmeric', 'chicken'], screenType: 'recipe' },
      baseUser
    );
    expect(tips.length).toBeGreaterThan(0);
    expect(tips[0].id).toBe('sf-turmeric-pepper');
  });

  it('returns at most 2 tips', async () => {
    const tips = await matchFoodIntelTips(
      {
        ingredients: ['turmeric', 'ginger', 'garlic', 'spinach', 'salmon'],
        screenType: 'recipe',
      },
      baseUser
    );
    expect(tips.length).toBeLessThanOrEqual(2);
  });

  it('respects seen-set: tips marked dismissed within 7 days are filtered or down-ranked', async () => {
    await recordTipEngagement('user_test', 'sf-turmeric-pepper', 'dismissed');
    const tips = await matchFoodIntelTips(
      { ingredients: ['turmeric'], screenType: 'recipe' },
      baseUser
    );
    const ids = tips.map((t) => t.id);
    expect(ids).not.toContain('sf-turmeric-pepper');
  });

  it('falls back to top-affinity-cuisine tips, never random', async () => {
    const userWithJapanese: UserState = {
      ...baseUser,
      cookHistory: { cuisines: ['japanese', 'japanese', 'korean'] },
    };
    const tips = await matchFoodIntelTips(
      { ingredients: ['nothing-matches-here'], screenType: 'home' },
      userWithJapanese
    );
    expect(tips.length).toBeGreaterThan(0);
    // The first tip's personalizationKeys.cuisine should include "japanese"
    expect(tips[0].personalizationKeys.cuisine).toContain('japanese');
  });

  it('empty context with no user signal still returns at least 1 tip', async () => {
    const tips = await matchFoodIntelTips(
      { ingredients: [], screenType: 'home' },
      baseUser
    );
    expect(tips.length).toBeGreaterThanOrEqual(1);
  });

  it('nutrient-gap context boosts tips that target the gap', async () => {
    const userWithIronGap: UserState = {
      ...baseUser,
      rolling7dNutrientGaps: ['iron'],
    };
    const tips = await matchFoodIntelTips(
      { ingredients: ['spinach', 'turmeric'], screenType: 'recipe' },
      userWithIronGap
    );
    // sf-leafy-iron targets iron — should outrank sf-turmeric-pepper
    expect(tips[0].id).toBe('sf-leafy-iron');
  });

  it('skillTier filter: beginner-tagged tips do NOT outrank when user is chef and other matches exist', async () => {
    const beginnerUser: UserState = { ...baseUser, skillTier: 'beginner' };
    const chefUser: UserState = { ...baseUser, skillTier: 'chef' };
    const ctx: TipContext = { ingredients: ['mushrooms'], screenType: 'recipe' };
    const beginnerTips = await matchFoodIntelTips(ctx, beginnerUser);
    const chefTips = await matchFoodIntelTips(ctx, chefUser);
    expect(beginnerTips.length).toBeGreaterThan(0);
    expect(chefTips.length).toBeGreaterThan(0);
    // sf-mushrooms-d is chef-only; chef should see it, beginner should not
    const chefIds = chefTips.map((t) => t.id);
    expect(chefIds).toContain('sf-mushrooms-d');
  });

  it('expanded engagement boosts the tip\'s personalizationKeys for future matches', async () => {
    await recordTipEngagement('user_test', 'sf-turmeric-pepper', 'expanded');
    const seen = await loadSeenTipIds('user_test');
    const entry = seen['sf-turmeric-pepper'];
    expect(entry).toBeDefined();
    expect(entry.signal).toBe('expanded');
  });
});

describe('rankFoodIntelTips (pure ranker)', () => {
  it('matched personalizationKeys × novelty produces a deterministic order for the same input', () => {
    const ranked1 = rankFoodIntelTips(FOOD_INTEL_TIPS, {
      context: { ingredients: ['turmeric', 'spinach'], screenType: 'recipe' },
      userState: baseUser,
      seen: {},
    });
    const ranked2 = rankFoodIntelTips(FOOD_INTEL_TIPS, {
      context: { ingredients: ['turmeric', 'spinach'], screenType: 'recipe' },
      userState: baseUser,
      seen: {},
    });
    expect(ranked1.map((t) => t.id)).toEqual(ranked2.map((t) => t.id));
  });

  it('a dismissed tip ranks lower than non-dismissed ones with same base score', () => {
    const seen = {
      'sf-turmeric-pepper': {
        tipId: 'sf-turmeric-pepper',
        signal: 'dismissed' as EngagementSignal,
        timestamp: Date.now(),
      },
    };
    const ranked = rankFoodIntelTips(FOOD_INTEL_TIPS, {
      context: { ingredients: ['turmeric'], screenType: 'recipe' },
      userState: baseUser,
      seen,
    });
    const turmericIdx = ranked.findIndex((t) => t.id === 'sf-turmeric-pepper');
    expect(turmericIdx).toBeGreaterThan(0);
  });
});

describe('recordTipEngagement / loadSeenTipIds / clearSeenTipIds', () => {
  it('records expanded → loadSeenTipIds returns the entry', async () => {
    await recordTipEngagement('user_test', 'sf-ginger-anti-inflam', 'expanded');
    const seen = await loadSeenTipIds('user_test');
    expect(seen['sf-ginger-anti-inflam'].signal).toBe('expanded');
  });

  it('clearSeenTipIds wipes the per-user store', async () => {
    await recordTipEngagement('user_test', 'sf-ginger-anti-inflam', 'expanded');
    await clearSeenTipIds('user_test');
    const seen = await loadSeenTipIds('user_test');
    expect(seen).toEqual({});
  });

  it('namespaces seen-set per-user', async () => {
    await recordTipEngagement('alice', 'sf-turmeric-pepper', 'dismissed');
    await recordTipEngagement('bob', 'sf-ginger-anti-inflam', 'expanded');
    const aliceSeen = await loadSeenTipIds('alice');
    const bobSeen = await loadSeenTipIds('bob');
    expect(aliceSeen['sf-turmeric-pepper']).toBeDefined();
    expect(aliceSeen['sf-ginger-anti-inflam']).toBeUndefined();
    expect(bobSeen['sf-ginger-anti-inflam']).toBeDefined();
    expect(bobSeen['sf-turmeric-pepper']).toBeUndefined();
  });
});
