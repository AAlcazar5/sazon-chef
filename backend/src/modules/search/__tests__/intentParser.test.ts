import { parseSearchIntent } from '../intentParser';

describe('parseSearchIntent', () => {
  it('returns empty search for empty input', () => {
    expect(parseSearchIntent('')).toEqual({ search: '' });
    expect(parseSearchIntent('  ')).toEqual({ search: '' });
    expect(parseSearchIntent(null as any)).toEqual({ search: '' });
  });

  // Time extraction
  it('extracts "under X minutes"', () => {
    const result = parseSearchIntent('chicken under 30 minutes');
    expect(result.maxCookTime).toBe(30);
    expect(result.search).toContain('chicken');
  });

  it('extracts "less than X min"', () => {
    const result = parseSearchIntent('pasta less than 20 min');
    expect(result.maxCookTime).toBe(20);
    expect(result.search).toContain('pasta');
  });

  it('extracts "X minute meals"', () => {
    const result = parseSearchIntent('15 minute meals');
    expect(result.maxCookTime).toBe(15);
  });

  it('extracts "quick" as 20 min + easy', () => {
    const result = parseSearchIntent('quick chicken');
    expect(result.maxCookTime).toBe(20);
    expect(result.difficulty).toBe('easy');
    expect(result.search).toContain('chicken');
  });

  // Difficulty
  it('extracts easy difficulty', () => {
    const result = parseSearchIntent('easy pasta bake');
    expect(result.difficulty).toBe('easy');
  });

  it('extracts hard difficulty', () => {
    const result = parseSearchIntent('gourmet steak');
    expect(result.difficulty).toBe('hard');
  });

  // Meal type
  it('extracts meal type', () => {
    expect(parseSearchIntent('chicken dinner').mealType).toBe('dinner');
    expect(parseSearchIntent('healthy breakfast').mealType).toBe('breakfast');
    expect(parseSearchIntent('quick lunch').mealType).toBe('lunch');
    expect(parseSearchIntent('chocolate dessert').mealType).toBe('dessert');
  });

  it('maps brunch to breakfast', () => {
    expect(parseSearchIntent('brunch ideas').mealType).toBe('breakfast');
  });

  // Cuisine
  it('extracts cuisine', () => {
    expect(parseSearchIntent('italian pasta').cuisine).toBe('Italian');
    expect(parseSearchIntent('mexican tacos').cuisine).toBe('Mexican');
    expect(parseSearchIntent('thai curry').cuisine).toBe('Thai');
    expect(parseSearchIntent('japanese ramen').cuisine).toBe('Japanese');
  });

  // Dietary restrictions
  it('extracts single dietary restriction', () => {
    const result = parseSearchIntent('vegan stir fry');
    expect(result.dietaryRestrictions).toEqual(['vegan']);
  });

  it('extracts multiple dietary restrictions', () => {
    const result = parseSearchIntent('gluten-free vegan brownies');
    expect(result.dietaryRestrictions).toContain('gluten-free');
    expect(result.dietaryRestrictions).toContain('vegan');
  });

  it('handles hyphenated dietary terms', () => {
    expect(parseSearchIntent('dairy-free smoothie').dietaryRestrictions).toEqual(['dairy-free']);
    expect(parseSearchIntent('dairy free smoothie').dietaryRestrictions).toEqual(['dairy-free']);
  });

  // Calories
  it('extracts "under X calories"', () => {
    const result = parseSearchIntent('meals under 500 calories');
    expect(result.maxCalories).toBe(500);
  });

  it('extracts "low calorie"', () => {
    const result = parseSearchIntent('low calorie snack');
    expect(result.maxCalories).toBe(400);
  });

  // Protein
  it('extracts "high protein"', () => {
    const result = parseSearchIntent('high protein lunch');
    expect(result.minProtein).toBe(30);
  });

  it('extracts "at least Xg protein"', () => {
    const result = parseSearchIntent('meals with at least 40g protein');
    expect(result.minProtein).toBe(40);
  });

  // Mood
  it('extracts mood keywords', () => {
    expect(parseSearchIntent('comfort food chicken').mood).toBe('comfort');
    expect(parseSearchIntent('healthy salad').mood).toBe('healthy');
  });

  // Complex queries
  it('parses the full roadmap example', () => {
    const result = parseSearchIntent('quick chicken dinner under 30 minutes');
    expect(result.search).toContain('chicken');
    expect(result.maxCookTime).toBe(30);
    expect(result.mealType).toBe('dinner');
  });

  it('handles complex multi-filter query', () => {
    const result = parseSearchIntent('easy vegan mexican dinner under 500 calories');
    expect(result.difficulty).toBe('easy');
    expect(result.dietaryRestrictions).toEqual(['vegan']);
    expect(result.cuisine).toBe('Mexican');
    expect(result.mealType).toBe('dinner');
    expect(result.maxCalories).toBe(500);
  });

  it('handles high protein keto query', () => {
    const result = parseSearchIntent('high protein keto breakfast');
    expect(result.minProtein).toBe(30);
    expect(result.dietaryRestrictions).toEqual(['keto']);
    expect(result.mealType).toBe('breakfast');
  });

  // Search term cleaning
  it('strips filler words from search term', () => {
    const result = parseSearchIntent('find me a good chicken recipe');
    expect(result.search).toBe('chicken');
  });

  it('preserves meaningful search terms', () => {
    const result = parseSearchIntent('salmon teriyaki');
    expect(result.search).toBe('salmon teriyaki');
  });

  // Edge cases
  it('handles query with only filters and no search term', () => {
    const result = parseSearchIntent('quick easy dinner');
    expect(result.maxCookTime).toBe(20);
    expect(result.difficulty).toBe('easy');
    expect(result.mealType).toBe('dinner');
  });

  it('handles plain ingredient search', () => {
    const result = parseSearchIntent('chicken');
    expect(result.search).toBe('chicken');
    expect(result.maxCookTime).toBeUndefined();
    expect(result.cuisine).toBeUndefined();
  });
});
