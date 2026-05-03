// Group 10S Surface 2 — pure ranker tests for the Kitchen IQ browse screen.

import { rankCardsByUserState } from '../../../lib/kitchenIQ/ranker';
import type { KitchenIQCard } from '../../../lib/kitchenIQ/cards';
import type { UserState } from '../../../lib/foodIntelMatcher';

function makeCard(over: Partial<KitchenIQCard> & Pick<KitchenIQCard, 'id'>): KitchenIQCard {
  return {
    type: 'nutrient',
    title: over.title ?? `Card ${over.id}`,
    subtitle: 'sub',
    heroEmoji: '🥦',
    sections: [{ heading: 'h', body: 'b' }],
    topFoods: [{ name: 'food', amount: '1', dvPercent: 1 }],
    recipes: [],
    tags: [],
    personalizationKeys: {
      cuisine: [],
      nutrient: [],
      ingredient: [],
      skillTier: ['beginner', 'cook', 'chef'],
    },
    unlockCondition: { type: 'none' },
    ...over,
  };
}

const EMPTY_STATE: UserState = {
  userId: 'u1',
  cookHistory: { cuisines: [] },
  topAffinityIngredients: [],
  rolling7dNutrientGaps: [],
  skillTier: 'cook',
  goalPhase: 'maintain',
};

describe('rankCardsByUserState', () => {
  it('returns deterministic order (by id) when user state is empty', () => {
    const a = makeCard({ id: 'a' });
    const b = makeCard({ id: 'b' });
    const c = makeCard({ id: 'c' });
    const ranked = rankCardsByUserState([c, a, b], EMPTY_STATE, () => true);
    expect(ranked.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('promotes a card whose nutrient matches the user gap above non-matches', () => {
    const iron = makeCard({
      id: 'iron',
      personalizationKeys: {
        cuisine: [],
        nutrient: ['iron'],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const magnesium = makeCard({
      id: 'magnesium',
      personalizationKeys: {
        cuisine: [],
        nutrient: ['magnesium'],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const state: UserState = { ...EMPTY_STATE, rolling7dNutrientGaps: ['iron'] };
    const ranked = rankCardsByUserState([magnesium, iron], state, () => true);
    expect(ranked.map((x) => x.id)).toEqual(['iron', 'magnesium']);
  });

  it('cuisine cook count multiplier ranks heavily-cooked cuisines higher', () => {
    const heavy = makeCard({
      id: 'heavy',
      personalizationKeys: {
        cuisine: ['japanese'],
        nutrient: [],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const light = makeCard({
      id: 'light',
      personalizationKeys: {
        cuisine: ['italian'],
        nutrient: [],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const state: UserState = {
      ...EMPTY_STATE,
      cookHistory: {
        cuisines: ['japanese', 'japanese', 'japanese', 'japanese', 'japanese', 'italian'],
      },
    };
    const ranked = rankCardsByUserState([light, heavy], state, () => true);
    expect(ranked.map((x) => x.id)).toEqual(['heavy', 'light']);
  });

  it('unlocked cards always rank above locked cards regardless of relevance', () => {
    const lockedHighScore = makeCard({
      id: 'locked',
      personalizationKeys: {
        cuisine: [],
        nutrient: ['iron'],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const unlockedZeroScore = makeCard({
      id: 'unlocked',
      personalizationKeys: {
        cuisine: [],
        nutrient: [],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const state: UserState = { ...EMPTY_STATE, rolling7dNutrientGaps: ['iron'] };
    const ranked = rankCardsByUserState(
      [lockedHighScore, unlockedZeroScore],
      state,
      (id) => id === 'unlocked',
    );
    expect(ranked.map((x) => x.id)).toEqual(['unlocked', 'locked']);
  });

  it('skillTier match adds a small relevance boost', () => {
    const tierMatch = makeCard({
      id: 'match',
      personalizationKeys: {
        cuisine: [],
        nutrient: [],
        ingredient: [],
        skillTier: ['cook'],
      },
    });
    const tierMiss = makeCard({
      id: 'miss',
      personalizationKeys: {
        cuisine: [],
        nutrient: [],
        ingredient: [],
        skillTier: ['chef'],
      },
    });
    const state: UserState = { ...EMPTY_STATE, skillTier: 'cook' };
    const ranked = rankCardsByUserState([tierMiss, tierMatch], state, () => true);
    expect(ranked.map((x) => x.id)).toEqual(['match', 'miss']);
  });

  it('ingredient affinity match adds boost', () => {
    const ingMatch = makeCard({
      id: 'match',
      personalizationKeys: {
        cuisine: [],
        nutrient: [],
        ingredient: ['turmeric'],
        skillTier: ['cook'],
      },
    });
    const ingMiss = makeCard({
      id: 'miss',
      personalizationKeys: {
        cuisine: [],
        nutrient: [],
        ingredient: ['saffron'],
        skillTier: ['cook'],
      },
    });
    const state: UserState = { ...EMPTY_STATE, topAffinityIngredients: ['turmeric'] };
    const ranked = rankCardsByUserState([ingMiss, ingMatch], state, () => true);
    expect(ranked.map((x) => x.id)).toEqual(['match', 'miss']);
  });
});
