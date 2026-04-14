import {
  extractMainProteinFromText,
  calculateVarietyScore,
  findRepetitiveMealIds,
  type MealForVariety,
} from '../../src/utils/varietyScore';

const makeMeal = (
  overrides: Partial<MealForVariety> & Pick<MealForVariety, 'id' | 'date'>
): MealForVariety => ({
  mealType: 'lunch',
  title: 'Recipe',
  cuisine: 'American',
  ingredients: [],
  ...overrides,
});

describe('extractMainProteinFromText', () => {
  it('detects chicken from top ingredients', () => {
    expect(extractMainProteinFromText(['boneless chicken breast', 'rice', 'broccoli'])).toBe('chicken');
  });

  it('detects tofu for plant-based meals', () => {
    expect(extractMainProteinFromText(['firm tofu', 'soy sauce', 'scallion'])).toBe('tofu');
  });

  it('returns undefined when no protein keyword matches', () => {
    expect(extractMainProteinFromText(['olive oil', 'garlic', 'basil'])).toBeUndefined();
  });
});

describe('calculateVarietyScore', () => {
  const monday = '2026-04-13';
  const tuesday = '2026-04-14';
  const wednesday = '2026-04-15';
  const thursday = '2026-04-16';
  const friday = '2026-04-17';

  it('awards a high score to a varied week', () => {
    const meals: MealForVariety[] = [
      makeMeal({ id: '1', date: monday, cuisine: 'Italian', ingredients: ['chicken breast'] }),
      makeMeal({ id: '2', date: tuesday, cuisine: 'Mexican', ingredients: ['salmon fillet'] }),
      makeMeal({ id: '3', date: wednesday, cuisine: 'Thai', ingredients: ['tofu cubes'] }),
      makeMeal({ id: '4', date: thursday, cuisine: 'Mediterranean', ingredients: ['beef sirloin'] }),
      makeMeal({ id: '5', date: friday, cuisine: 'Indian', ingredients: ['lentils'] }),
    ];
    const result = calculateVarietyScore(meals);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.uniqueCuisines).toBe(5);
    expect(result.uniqueProteins).toBe(5);
    expect(result.consecutiveProteinRepeats).toBe(0);
  });

  it('penalizes consecutive repeated proteins on the same meal type', () => {
    const meals: MealForVariety[] = [
      makeMeal({ id: '1', date: monday, ingredients: ['chicken breast'] }),
      makeMeal({ id: '2', date: tuesday, ingredients: ['chicken thigh'] }),
      makeMeal({ id: '3', date: wednesday, ingredients: ['chicken wings'] }),
      makeMeal({ id: '4', date: thursday, ingredients: ['chicken nuggets'] }),
      makeMeal({ id: '5', date: friday, ingredients: ['chicken salad'] }),
    ];
    const result = calculateVarietyScore(meals);
    expect(result.score).toBeLessThan(40);
    expect(result.consecutiveProteinRepeats).toBeGreaterThanOrEqual(4);
    expect(result.isBoringWeek).toBe(true);
  });

  it('spans at least 3 cuisines for a good plan', () => {
    const meals: MealForVariety[] = [
      makeMeal({ id: '1', date: monday, cuisine: 'Italian', ingredients: ['pasta'] }),
      makeMeal({ id: '2', date: tuesday, cuisine: 'Mexican', ingredients: ['beans'] }),
      makeMeal({ id: '3', date: wednesday, cuisine: 'Thai', ingredients: ['shrimp'] }),
    ];
    const result = calculateVarietyScore(meals);
    expect(result.uniqueCuisines).toBeGreaterThanOrEqual(3);
  });

  it('handles empty meal list', () => {
    const result = calculateVarietyScore([]);
    expect(result.score).toBe(100);
    expect(result.isBoringWeek).toBe(false);
  });

  it('flags boring week when score < 40', () => {
    const meals: MealForVariety[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      date: `2026-04-${13 + i}`,
      mealType: 'lunch',
      title: 'Chicken Rice Broccoli',
      cuisine: 'American',
      ingredients: ['chicken breast', 'white rice', 'broccoli'],
    }));
    const result = calculateVarietyScore(meals);
    expect(result.isBoringWeek).toBe(true);
  });
});

describe('findRepetitiveMealIds', () => {
  it('returns ids of consecutive same-protein same-mealType meals', () => {
    const meals: MealForVariety[] = [
      makeMeal({ id: 'a', date: '2026-04-13', mealType: 'lunch', ingredients: ['chicken'] }),
      makeMeal({ id: 'b', date: '2026-04-14', mealType: 'lunch', ingredients: ['chicken thigh'] }),
      makeMeal({ id: 'c', date: '2026-04-15', mealType: 'lunch', ingredients: ['chicken wings'] }),
      makeMeal({ id: 'd', date: '2026-04-16', mealType: 'lunch', ingredients: ['salmon'] }),
    ];
    const ids = findRepetitiveMealIds(meals);
    expect(ids).toContain('b');
    expect(ids).toContain('c');
    expect(ids).not.toContain('a');
    expect(ids).not.toContain('d');
  });

  it('returns empty array for fully varied meals', () => {
    const meals: MealForVariety[] = [
      makeMeal({ id: '1', date: '2026-04-13', ingredients: ['chicken'] }),
      makeMeal({ id: '2', date: '2026-04-14', ingredients: ['salmon'] }),
      makeMeal({ id: '3', date: '2026-04-15', ingredients: ['tofu'] }),
    ];
    expect(findRepetitiveMealIds(meals)).toEqual([]);
  });
});
