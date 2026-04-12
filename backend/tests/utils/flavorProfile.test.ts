// backend/tests/utils/flavorProfile.test.ts
import { detectFlavorProfile, FlavorProfile } from '../../src/utils/flavorProfile';

describe('Flavor Profile Rules Engine', () => {
  function ingredients(...texts: string[]) {
    return texts.map(text => ({ text }));
  }

  describe('spicy detection', () => {
    test('Thai cuisine triggers spicy', () => {
      const result = detectFlavorProfile(ingredients('rice', 'chicken'), 'Thai');
      expect(result.icons).toContain('🌶️');
      expect(result.tags).toContain('spicy');
    });

    test('jalapeño ingredient triggers spicy', () => {
      const result = detectFlavorProfile(ingredients('jalapeño', 'tomato', 'onion'), 'American');
      expect(result.icons).toContain('🌶️');
    });

    test('non-spicy recipe has no spicy icon', () => {
      const result = detectFlavorProfile(ingredients('pasta', 'olive oil', 'garlic'), 'Italian');
      expect(result.icons).not.toContain('🌶️');
    });
  });

  describe('cheesy / rich detection', () => {
    test('mac and cheese → cheesy', () => {
      const result = detectFlavorProfile(ingredients('macaroni', 'cheddar cheese', 'milk'), 'American');
      expect(result.icons).toContain('🧀');
      expect(result.tags).toContain('cheesy');
    });

    test('heavy cream → rich (not cheesy)', () => {
      const result = detectFlavorProfile(ingredients('chicken', 'heavy cream', 'mushrooms'), 'French');
      expect(result.icons).toContain('🧀');
      expect(result.tags).toContain('rich');
    });

    test('neither cheese nor rich ingredients → no 🧀', () => {
      const result = detectFlavorProfile(ingredients('rice', 'soy sauce', 'tofu'), 'Japanese');
      expect(result.icons).not.toContain('🧀');
    });
  });

  describe('fresh / light detection', () => {
    test('Greek salad → fresh', () => {
      const result = detectFlavorProfile(ingredients('cucumber', 'lettuce', 'feta cheese', 'olive oil'), 'Greek');
      expect(result.icons).toContain('🥗');
      expect(result.tags).toContain('fresh');
    });
  });

  describe('sweet detection', () => {
    test('honey and banana → sweet', () => {
      const result = detectFlavorProfile(ingredients('oats', 'honey', 'banana', 'milk'), 'American');
      expect(result.icons).toContain('🍯');
      expect(result.tags).toContain('sweet');
    });
  });

  describe('smoky detection', () => {
    test('smoked paprika → smoky', () => {
      const result = detectFlavorProfile(ingredients('chicken', 'smoked paprika', 'onion'), 'Spanish');
      expect(result.icons).toContain('🔥');
      expect(result.tags).toContain('smoky');
    });

    test('bbq → smoky', () => {
      const result = detectFlavorProfile(ingredients('pork ribs', 'bbq sauce', 'coleslaw'), 'American');
      expect(result.icons).toContain('🔥');
    });
  });

  describe('cold / refreshing detection', () => {
    test('gazpacho → refreshing', () => {
      const result = detectFlavorProfile(ingredients('tomato', 'cucumber', 'bell pepper'), 'Spanish', 'Gazpacho');
      expect(result.icons).toContain('❄️');
      expect(result.tags).toContain('refreshing');
    });

    test('smoothie → refreshing', () => {
      const result = detectFlavorProfile(ingredients('banana', 'spinach', 'protein powder'), 'American', 'Green Smoothie');
      expect(result.icons).toContain('❄️');
    });
  });

  describe('multiple flavors', () => {
    test('spicy cheesy recipe returns both icons', () => {
      const result = detectFlavorProfile(ingredients('jalapeño', 'cheddar cheese', 'tortilla'), 'Mexican');
      expect(result.icons).toContain('🌶️');
      expect(result.icons).toContain('🧀');
    });

    test('max 3 icons returned', () => {
      // A recipe that hits spicy, cheesy, sweet, smoky
      const result = detectFlavorProfile(
        ingredients('jalapeño', 'cheddar cheese', 'honey', 'smoked paprika', 'lettuce'),
        'Mexican'
      );
      expect(result.icons.length).toBeLessThanOrEqual(3);
      expect(result.tags.length).toBeLessThanOrEqual(3);
    });
  });

  describe('string[] ingredient format', () => {
    test('accepts plain string arrays', () => {
      const result = detectFlavorProfile(['chicken', 'gochujang', 'rice'], 'Korean');
      expect(result.icons).toContain('🌶️');
    });
  });

  describe('edge cases', () => {
    test('empty ingredients and unknown cuisine', () => {
      const result = detectFlavorProfile([], '');
      expect(result.icons).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    test('null-ish cuisine handled', () => {
      const result = detectFlavorProfile(ingredients('pasta'), (null as any));
      expect(result.icons).toBeDefined();
    });
  });
});
