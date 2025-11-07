// backend/tests/utils/nutritional-analysis.test.ts
import {
  analyzeMicronutrients,
  analyzeOmega3,
  analyzeAntioxidants,
  calculateAdvancedNutritionalDensity,
  getKeyNutrients,
  identifyNutrientGaps,
  performNutritionalAnalysis,
} from '../../src/utils/nutritionalAnalysis';

describe('Nutritional Analysis', () => {
  describe('analyzeMicronutrients', () => {
    it('should detect vitamin C from citrus fruits', () => {
      const recipe = {
        title: 'Orange Chicken',
        description: 'Chicken with orange',
        ingredients: [
          { text: '2 oranges' },
          { text: 'chicken breast' },
        ],
      };

      const result = analyzeMicronutrients(recipe);
      expect(result.vitamins.vitaminC).toBeGreaterThan(0);
    });

    it('should detect calcium from dairy', () => {
      const recipe = {
        title: 'Cheese Pasta',
        ingredients: [
          { text: 'milk' },
          { text: 'cheese' },
        ],
      };

      const result = analyzeMicronutrients(recipe);
      expect(result.minerals.calcium).toBeGreaterThan(0);
    });

    it('should detect iron from meat', () => {
      const recipe = {
        title: 'Beef Steak',
        ingredients: [
          { text: 'beef' },
        ],
      };

      const result = analyzeMicronutrients(recipe);
      expect(result.minerals.iron).toBeGreaterThan(0);
    });

    it('should detect B vitamins from whole grains', () => {
      const recipe = {
        title: 'Quinoa Bowl',
        ingredients: [
          { text: 'quinoa' },
          { text: 'chicken' },
        ],
      };

      const result = analyzeMicronutrients(recipe);
      expect(result.vitamins.thiamine).toBeGreaterThan(0);
      expect(result.vitamins.riboflavin).toBeGreaterThan(0);
    });
  });

  describe('analyzeOmega3', () => {
    it('should detect EPA/DHA from fatty fish', () => {
      const recipe = {
        title: 'Salmon Bowl',
        ingredients: [
          { text: 'salmon' },
        ],
      };

      const result = analyzeOmega3(recipe);
      expect(result.totalOmega3).toBeGreaterThan(0);
      expect(result.epa).toBeGreaterThan(0);
      expect(result.dha).toBeGreaterThan(0);
      expect(result.omega3Score).toBeGreaterThan(0);
    });

    it('should detect ALA from plant sources', () => {
      const recipe = {
        title: 'Walnut Salad',
        ingredients: [
          { text: 'walnut' },
          { text: 'flaxseed' },
        ],
      };

      const result = analyzeOmega3(recipe);
      expect(result.totalOmega3).toBeGreaterThan(0);
      expect(result.ala).toBeGreaterThan(0);
    });

    it('should return zero for recipes without omega-3 sources', () => {
      const recipe = {
        title: 'Chicken Rice',
        ingredients: [
          { text: 'chicken' },
          { text: 'rice' },
        ],
      };

      const result = analyzeOmega3(recipe);
      expect(result.totalOmega3).toBe(0);
      expect(result.omega3Score).toBe(0);
    });
  });

  describe('analyzeAntioxidants', () => {
    it('should detect high ORAC from berries', () => {
      const recipe = {
        title: 'Berry Smoothie',
        ingredients: [
          { text: 'blueberry' },
          { text: 'strawberry' },
        ],
      };

      const result = analyzeAntioxidants(recipe);
      expect(result.oracValue).toBeGreaterThan(0);
      expect(result.antioxidantScore).toBeGreaterThan(0);
      expect(result.polyphenols).toBeGreaterThan(0);
    });

    it('should detect antioxidants from spices', () => {
      const recipe = {
        title: 'Curry',
        ingredients: [
          { text: 'turmeric' },
          { text: 'ginger' },
          { text: 'cinnamon' },
        ],
      };

      const result = analyzeAntioxidants(recipe);
      expect(result.oracValue).toBeGreaterThan(0);
      expect(result.antioxidantScore).toBeGreaterThan(0);
    });

    it('should detect carotenoids from orange vegetables', () => {
      const recipe = {
        title: 'Carrot Soup',
        ingredients: [
          { text: 'carrot' },
          { text: 'sweet potato' },
        ],
      };

      const result = analyzeAntioxidants(recipe);
      expect(result.carotenoids).toBeGreaterThan(0);
    });
  });

  describe('calculateAdvancedNutritionalDensity', () => {
    it('should calculate high score for nutrient-rich recipe', () => {
      const recipe = {
        calories: 500,
        protein: 30,
        fiber: 5,
      };

      const micronutrients = {
        vitamins: { vitaminA: 500, vitaminC: 30, vitaminD: 0, vitaminE: 0, vitaminK: 0, thiamine: 0.2, riboflavin: 0.3, niacin: 2, vitaminB6: 0.3, folate: 40, vitaminB12: 2 },
        minerals: { calcium: 100, iron: 2, magnesium: 50, phosphorus: 100, potassium: 300, zinc: 1.5, copper: 0, manganese: 0, selenium: 0 },
      };

      const omega3 = {
        totalOmega3: 1.0,
        epa: 0.4,
        dha: 0.6,
        ala: 0,
        omega3Score: 50,
      };

      const antioxidants = {
        totalAntioxidants: 2000,
        oracValue: 2000,
        polyphenols: 50,
        flavonoids: 30,
        carotenoids: 5,
        vitaminC: 30,
        vitaminE: 2,
        antioxidantScore: 75,
      };

      const score = calculateAdvancedNutritionalDensity(recipe, micronutrients, omega3, antioxidants);
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('getKeyNutrients', () => {
    it('should identify key nutrients', () => {
      const micronutrients = {
        vitamins: { vitaminA: 600, vitaminC: 35, vitaminD: 0, vitaminE: 0, vitaminK: 0, thiamine: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, folate: 0, vitaminB12: 0 },
        minerals: { calcium: 120, iron: 2.5, magnesium: 0, phosphorus: 0, potassium: 350, zinc: 0, copper: 0, manganese: 0, selenium: 0 },
      };

      const omega3 = {
        totalOmega3: 0.8,
        epa: 0.3,
        dha: 0.5,
        ala: 0,
        omega3Score: 40,
      };

      const antioxidants = {
        totalAntioxidants: 1500,
        oracValue: 1500,
        polyphenols: 0,
        flavonoids: 0,
        carotenoids: 0,
        vitaminC: 0,
        vitaminE: 0,
        antioxidantScore: 50,
      };

      const keyNutrients = getKeyNutrients(micronutrients, omega3, antioxidants);
      expect(keyNutrients.length).toBeGreaterThan(0);
      expect(keyNutrients).toContain('Vitamin C');
      expect(keyNutrients).toContain('Vitamin A');
      expect(keyNutrients).toContain('Calcium');
      expect(keyNutrients).toContain('Iron');
      expect(keyNutrients).toContain('Potassium');
      expect(keyNutrients).toContain('Omega-3 Fatty Acids');
    });
  });

  describe('identifyNutrientGaps', () => {
    it('should identify missing nutrients', () => {
      const micronutrients = {
        vitamins: { vitaminA: 100, vitaminC: 5, vitaminD: 0, vitaminE: 0, vitaminK: 0, thiamine: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, folate: 10, vitaminB12: 0.5 },
        minerals: { calcium: 20, iron: 0.5, magnesium: 0, phosphorus: 0, potassium: 100, zinc: 0, copper: 0, manganese: 0, selenium: 0 },
      };

      const omega3 = {
        totalOmega3: 0.05,
        epa: 0,
        dha: 0,
        ala: 0.05,
        omega3Score: 0,
      };

      const antioxidants = {
        totalAntioxidants: 200,
        oracValue: 200,
        polyphenols: 0,
        flavonoids: 0,
        carotenoids: 0,
        vitaminC: 0,
        vitaminE: 0,
        antioxidantScore: 0,
      };

      const gaps = identifyNutrientGaps(micronutrients, omega3, antioxidants);
      expect(gaps.length).toBeGreaterThan(0);
    });
  });

  describe('performNutritionalAnalysis', () => {
    it('should perform complete nutritional analysis', () => {
      const recipe = {
        title: 'Salmon with Quinoa and Vegetables',
        description: 'Healthy meal',
        calories: 500,
        protein: 35,
        carbs: 45,
        fat: 15,
        fiber: 6,
        ingredients: [
          { text: 'salmon' },
          { text: 'quinoa' },
          { text: 'broccoli' },
          { text: 'carrot' },
          { text: 'blueberry' },
        ],
      };

      const result = performNutritionalAnalysis(recipe);
      
      expect(result.micronutrients).toBeDefined();
      expect(result.omega3).toBeDefined();
      expect(result.antioxidants).toBeDefined();
      expect(result.nutritionalDensityScore).toBeGreaterThanOrEqual(0);
      expect(result.nutritionalDensityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.keyNutrients)).toBe(true);
      expect(Array.isArray(result.nutrientGaps)).toBe(true);
    });
  });
});

