// backend/__tests__/utils/superfoodDetection.global.test.ts
// Group 11 Phase 3 — global cuisine superfood expansion.
// Each test maps to one of the explicit Phase 3 acceptance bullets in
// `plans/plan-archives/ROADMAP_3.0.md` (closed completion record; "Plantain detected in Nigerian jollof rice", etc.).

import {
  detectSuperfoods,
  detectRecipeSuperfoods,
  getAllSuperfoodCategories,
  SUPERFOODS,
} from '../../src/utils/superfoodDetection';

describe('superfoodDetection — global cuisine expansion', () => {
  describe('plantain', () => {
    it('detects plantain in a Nigerian jollof rice ingredient line', () => {
      const detected = detectSuperfoods('1 ripe plantain, sliced');
      expect(detected).toContain('plantain');
    });

    it('detects plantain in a Salvadorean tajadas ingredient line', () => {
      const detected = detectSuperfoods('2 green plantains for tajadas');
      expect(detected).toContain('plantain');
    });

    it('does not match the substring "plant" alone (false positive guard)', () => {
      const detected = detectSuperfoods('1 cup plant-based milk');
      expect(detected).not.toContain('plantain');
    });
  });

  describe('fenugreek', () => {
    it('detects fenugreek in a Yemeni saltah ingredient line', () => {
      const detected = detectSuperfoods('1 tsp ground fenugreek');
      expect(detected).toContain('fenugreek');
    });

    it('detects fenugreek in an Ethiopian berbere blend', () => {
      const detected = detectSuperfoods('2 tbsp berbere (fenugreek-rich blend)');
      expect(detected).toContain('fenugreek');
    });
  });

  describe('teff', () => {
    it('detects teff in an Ethiopian injera ingredient line', () => {
      const detected = detectSuperfoods('2 cups teff flour for injera');
      expect(detected).toContain('teff');
    });

    it('detects teff grain', () => {
      const detected = detectSuperfoods('1 cup whole teff grain, cooked');
      expect(detected).toContain('teff');
    });
  });

  describe('bitter melon', () => {
    it('detects bitter melon in an Okinawan goya champuru ingredient line', () => {
      const detected = detectSuperfoods('1 small bitter melon, sliced');
      expect(detected).toContain('bitterMelon');
    });

    it('detects goya as a synonym for bitter melon', () => {
      const detected = detectSuperfoods('1 goya (Okinawan bitter melon)');
      expect(detected).toContain('bitterMelon');
    });
  });

  describe('exposure via getAllSuperfoodCategories', () => {
    it('all four new categories appear in the UI list', () => {
      const ids = getAllSuperfoodCategories().map((c) => c.id);
      expect(ids).toEqual(expect.arrayContaining(['plantain', 'fenugreek', 'teff', 'bitterMelon']));
    });

    it('each new category has a non-empty name + description', () => {
      const list = getAllSuperfoodCategories();
      for (const id of ['plantain', 'fenugreek', 'teff', 'bitterMelon']) {
        const entry = list.find((c) => c.id === id);
        expect(entry?.name?.length).toBeGreaterThan(0);
        expect(entry?.description?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectRecipeSuperfoods aggregation', () => {
    it('detects plantain + fenugreek + teff + bitter melon across a fusion recipe', () => {
      const ingredients = [
        '1 ripe plantain',
        '1 tsp fenugreek seeds',
        '1 cup teff flour',
        '1 small bitter melon',
      ];
      const detected = detectRecipeSuperfoods(ingredients);
      expect(detected.has('plantain')).toBe(true);
      expect(detected.has('fenugreek')).toBe(true);
      expect(detected.has('teff')).toBe(true);
      expect(detected.has('bitterMelon')).toBe(true);
    });
  });

  describe('SUPERFOODS shape — guard against accidental removal', () => {
    it('preserves the four global expansion entries', () => {
      expect(SUPERFOODS).toHaveProperty('plantain');
      expect(SUPERFOODS).toHaveProperty('fenugreek');
      expect(SUPERFOODS).toHaveProperty('teff');
      expect(SUPERFOODS).toHaveProperty('bitterMelon');
    });
  });
});
