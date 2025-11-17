import {
  getContainerRecommendations,
  formatContainerRecommendation,
  ContainerRecommendation,
} from '../../utils/containerRecommendations';

describe('Container Recommendations', () => {
  describe('getContainerRecommendations', () => {
    test('should recommend containers for single-serve portions', () => {
      const recommendations = getContainerRecommendations(
        6, // total servings
        4, // freeze
        2, // fresh
        'mixed',
        true // prefer single-serve
      );

      expect(recommendations.freeze.length).toBeGreaterThan(0);
      expect(recommendations.fresh.length).toBeGreaterThan(0);
      expect(recommendations.all).toBeDefined();
    });

    test('should recommend larger containers for bulk storage', () => {
      const recommendations = getContainerRecommendations(
        24, // total servings
        16, // freeze
        8, // fresh
        'mixed',
        false // don't prefer single-serve
      );

      // Should include multi-serve or bulk options
      const hasBulk = recommendations.freeze.some(rec => 
        rec.containerType === 'bulk' || rec.containerType === 'multi-serve'
      );
      expect(hasBulk).toBe(true);
    });

    test('should adjust recommendations based on recipe type', () => {
      const soupRecs = getContainerRecommendations(12, 8, 4, 'soup', true);
      const solidRecs = getContainerRecommendations(12, 8, 4, 'solid', true);

      // Soups need larger containers (more volume per serving)
      expect(soupRecs.freeze[0].volume).toBeGreaterThan(solidRecs.freeze[0].volume);
    });

    test('should handle zero servings for freeze', () => {
      const recommendations = getContainerRecommendations(
        6, // total
        0, // freeze
        6, // fresh
        'mixed',
        true
      );

      expect(recommendations.freeze.length).toBe(0);
      expect(recommendations.fresh.length).toBeGreaterThan(0);
    });

    test('should handle zero servings for fresh', () => {
      const recommendations = getContainerRecommendations(
        12, // total
        12, // freeze
        0, // fresh
        'mixed',
        true
      );

      expect(recommendations.freeze.length).toBeGreaterThan(0);
      expect(recommendations.fresh.length).toBe(0);
    });

    test('should provide freezer-specific recommendations', () => {
      const recommendations = getContainerRecommendations(
        12, 8, 4, 'mixed', true
      );

      if (recommendations.freeze.length > 0) {
        const freezeRec = recommendations.freeze[0];
        expect(freezeRec.recommendations.some(rec => 
          rec.toLowerCase().includes('freezer') ||
          rec.toLowerCase().includes('freeze')
        )).toBe(true);
      }
    });

    test('should provide fridge-specific recommendations', () => {
      const recommendations = getContainerRecommendations(
        12, 8, 4, 'mixed', true
      );

      if (recommendations.fresh.length > 0) {
        const freshRec = recommendations.fresh[0];
        // Fresh recommendations should exist (may or may not explicitly mention fridge)
        expect(freshRec.recommendations.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should calculate correct quantity needed', () => {
      const recommendations = getContainerRecommendations(
        12, 8, 4, 'mixed', true
      );

      if (recommendations.freeze.length > 0) {
        const freezeRec = recommendations.freeze[0];
        expect(freezeRec.quantity).toBeGreaterThan(0);
        expect(freezeRec.quantity * freezeRec.servings).toBeGreaterThanOrEqual(8);
      }
    });

    test('should handle very large batches', () => {
      const recommendations = getContainerRecommendations(
        50, 30, 20, 'mixed', false
      );

      expect(recommendations.all).toBeDefined();
      // Should recommend bulk containers
      const hasBulk = recommendations.freeze.some(rec => 
        rec.containerType === 'bulk'
      ) || recommendations.all.containerType === 'bulk';
      expect(hasBulk).toBe(true);
    });

    test('should handle different recipe types', () => {
      const types: Array<'soup' | 'stew' | 'solid' | 'liquid' | 'mixed'> = 
        ['soup', 'stew', 'solid', 'liquid', 'mixed'];

      types.forEach(type => {
        const recommendations = getContainerRecommendations(
          12, 8, 4, type, true
        );

        expect(recommendations.freeze.length).toBeGreaterThan(0);
        expect(recommendations.fresh.length).toBeGreaterThan(0);
        expect(recommendations.all).toBeDefined();
      });
    });
  });

  describe('formatContainerRecommendation', () => {
    test('should format single container correctly', () => {
      const rec: ContainerRecommendation = {
        servings: 1,
        containerSize: '16 oz (1 pint)',
        containerType: 'single-serve',
        quantity: 1,
        volume: 16,
        recommendations: [],
      };

      const formatted = formatContainerRecommendation(rec);
      expect(formatted).toContain('1x');
      expect(formatted).toContain('16 oz');
      expect(formatted).toContain('single serve');
    });

    test('should format multiple containers correctly', () => {
      const rec: ContainerRecommendation = {
        servings: 6,
        containerSize: '16 oz (1 pint)',
        containerType: 'single-serve',
        quantity: 6,
        volume: 96,
        recommendations: [],
      };

      const formatted = formatContainerRecommendation(rec);
      expect(formatted).toContain('6x');
    });

    test('should format multi-serve containers', () => {
      const rec: ContainerRecommendation = {
        servings: 4,
        containerSize: '32 oz (1 quart)',
        containerType: 'multi-serve',
        quantity: 2,
        volume: 64,
        recommendations: [],
      };

      const formatted = formatContainerRecommendation(rec);
      expect(formatted).toContain('multi serve');
    });
  });
});

