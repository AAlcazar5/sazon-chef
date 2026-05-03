// Group 10S: Kitchen IQ card library integrity test.

import {
  KITCHEN_IQ_CARDS,
  type KitchenIQCard,
  type KitchenIQCardType,
} from '../../../lib/kitchenIQ/cards';

const TYPES: KitchenIQCardType[] = ['nutrient', 'ingredient', 'concept', 'cuisine_health'];

describe('KitchenIQ card library', () => {
  it('ships at least 30 cards', () => {
    expect(KITCHEN_IQ_CARDS.length).toBeGreaterThanOrEqual(30);
  });

  it('every card has non-empty title and subtitle', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(card.title.trim().length).toBeGreaterThan(0);
      expect(card.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  it('every card has at least 1 section with non-empty heading + body', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(card.sections.length).toBeGreaterThanOrEqual(1);
      for (const section of card.sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0);
        expect(section.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every card has at least 3 topFoods with name + amount + dvPercent', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(card.topFoods.length).toBeGreaterThanOrEqual(3);
      for (const food of card.topFoods) {
        expect(food.name.trim().length).toBeGreaterThan(0);
        expect(food.amount.trim().length).toBeGreaterThan(0);
        expect(typeof food.dvPercent).toBe('number');
        expect(food.dvPercent).toBeGreaterThan(0);
      }
    }
  });

  it('every type has at least 4 cards', () => {
    for (const type of TYPES) {
      const count = KITCHEN_IQ_CARDS.filter((c) => c.type === type).length;
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = KITCHEN_IQ_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every card declares personalizationKeys with all four dimensions', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(card.personalizationKeys).toBeDefined();
      expect(Array.isArray(card.personalizationKeys.cuisine)).toBe(true);
      expect(Array.isArray(card.personalizationKeys.nutrient)).toBe(true);
      expect(Array.isArray(card.personalizationKeys.ingredient)).toBe(true);
      expect(Array.isArray(card.personalizationKeys.skillTier)).toBe(true);
    }
  });

  it('personalizationKeys values are normalized (lowercase, trimmed)', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      for (const c of card.personalizationKeys.cuisine) {
        expect(c).toBe(c.trim().toLowerCase());
      }
      for (const n of card.personalizationKeys.nutrient) {
        expect(n).toBe(n.trim().toLowerCase());
      }
      for (const i of card.personalizationKeys.ingredient) {
        expect(i).toBe(i.trim().toLowerCase());
      }
    }
  });

  it('every recipe reference is either a non-empty string or the array is empty', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(Array.isArray(card.recipes)).toBe(true);
      for (const r of card.recipes) {
        expect(typeof r).toBe('string');
        expect(r.length).toBeGreaterThan(0);
      }
    }
  });

  it('every card has a recognized type', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(TYPES).toContain(card.type);
    }
  });

  it('every card heroEmoji is a single visible character', () => {
    for (const card of KITCHEN_IQ_CARDS) {
      expect(card.heroEmoji.trim().length).toBeGreaterThan(0);
    }
  });

  it('starter cards (unlockCondition.type === "none") number at least 2', () => {
    const starters = KITCHEN_IQ_CARDS.filter(
      (c) => !c.unlockCondition || c.unlockCondition.type === 'none',
    );
    expect(starters.length).toBeGreaterThanOrEqual(2);
  });

  it('every unlockCondition references a known type', () => {
    const KNOWN = new Set(['cook_count', 'cuisine_count', 'ingredient_used', 'none']);
    for (const card of KITCHEN_IQ_CARDS) {
      if (card.unlockCondition) {
        expect(KNOWN.has(card.unlockCondition.type)).toBe(true);
      }
    }
  });
});
