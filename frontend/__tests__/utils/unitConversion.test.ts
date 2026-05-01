// frontend/__tests__/utils/unitConversion.test.ts
// TDD: Task 4 — client-side unit conversion (display-only)

import { convertForDisplay, NON_CONVERTIBLE_UNITS } from '../../utils/unitConversion';

describe('convertForDisplay', () => {
  describe('imperial → metric', () => {
    it('converts 2 cups to approximately 473 ml', () => {
      const result = convertForDisplay(2, 'cups', 'metric');
      expect(result.amount).toBeCloseTo(473.18, 0);
      expect(result.unit).toBe('ml');
    });

    it('converts 1 cup to approximately 237 ml', () => {
      const result = convertForDisplay(1, 'cup', 'metric');
      expect(result.amount).toBeCloseTo(236.59, 0);
      expect(result.unit).toBe('ml');
    });

    it('converts 1 oz to approximately 28 g', () => {
      const result = convertForDisplay(1, 'oz', 'metric');
      expect(result.amount).toBeCloseTo(28.35, 0);
      expect(result.unit).toBe('g');
    });

    it('converts 1 lb to approximately 454 g', () => {
      const result = convertForDisplay(1, 'lb', 'metric');
      expect(result.amount).toBeCloseTo(453.59, 0);
      expect(result.unit).toBe('g');
    });

    it('converts 1 tsp to approximately 4.93 ml', () => {
      const result = convertForDisplay(1, 'tsp', 'metric');
      expect(result.amount).toBeCloseTo(4.93, 1);
      expect(result.unit).toBe('ml');
    });

    it('converts 1 tbsp to approximately 14.79 ml', () => {
      const result = convertForDisplay(1, 'tbsp', 'metric');
      expect(result.amount).toBeCloseTo(14.79, 1);
      expect(result.unit).toBe('ml');
    });
  });

  describe('metric → imperial', () => {
    it('converts 473 ml to approximately 2 cups', () => {
      const result = convertForDisplay(473.18, 'ml', 'imperial');
      expect(result.amount).toBeCloseTo(2, 1);
      expect(result.unit).toBe('cups');
    });

    it('converts 100 g to approximately 3.53 oz', () => {
      const result = convertForDisplay(100, 'g', 'imperial');
      expect(result.amount).toBeCloseTo(3.53, 1);
      expect(result.unit).toBe('oz');
    });
  });

  describe('non-convertible units', () => {
    NON_CONVERTIBLE_UNITS.forEach((unit) => {
      it(`returns ${unit} unchanged in metric mode`, () => {
        const result = convertForDisplay(2, unit, 'metric');
        expect(result.unit).toBe(unit);
        expect(result.amount).toBe(2);
      });

      it(`returns ${unit} unchanged in imperial mode`, () => {
        const result = convertForDisplay(1, unit, 'imperial');
        expect(result.unit).toBe(unit);
        expect(result.amount).toBe(1);
      });
    });
  });

  describe('same-system passthrough', () => {
    it('returns cups unchanged when already imperial', () => {
      const result = convertForDisplay(2, 'cups', 'imperial');
      expect(result.amount).toBe(2);
      expect(result.unit).toBe('cups');
    });

    it('returns ml unchanged when already metric', () => {
      const result = convertForDisplay(250, 'ml', 'metric');
      expect(result.amount).toBe(250);
      expect(result.unit).toBe('ml');
    });
  });

  describe('edge cases', () => {
    it('handles zero amount', () => {
      const result = convertForDisplay(0, 'cups', 'metric');
      expect(result.amount).toBe(0);
    });

    it('handles unknown unit by returning unchanged', () => {
      const result = convertForDisplay(3, 'foobar', 'metric');
      expect(result.amount).toBe(3);
      expect(result.unit).toBe('foobar');
    });
  });
});
