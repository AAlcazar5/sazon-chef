// backend/src/services/__tests__/cravingSearchService.test.ts
import { scoreCravingMatch, mapCravingToSearchTerms } from '../cravingSearchService';

describe('scoreCravingMatch', () => {
  const makeRecipe = (overrides: Partial<{
    title: string;
    description: string;
    cuisine: string;
    ingredients: Array<{ text: string }>;
  }> = {}) => ({
    title: 'Test Recipe',
    description: '',
    cuisine: '',
    ingredients: [],
    ...overrides,
  });

  it('scores 0 for a recipe with no matching terms', () => {
    const score = scoreCravingMatch(
      makeRecipe({ title: 'Garden Salad', description: 'Fresh greens' }),
      { searchTerms: ['chocolate', 'cake'], flavorTags: ['sweet'], temperature: 'any', texturePrefs: [] },
    );
    expect(score).toBe(0);
  });

  it('gives highest score for title matches', () => {
    const titleMatch = scoreCravingMatch(
      makeRecipe({ title: 'Cheesy Mac and Cheese', description: 'pasta dish' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'hot', texturePrefs: [] },
    );
    const descMatch = scoreCravingMatch(
      makeRecipe({ title: 'Pasta Dish', description: 'cheesy and delicious' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'hot', texturePrefs: [] },
    );
    expect(titleMatch).toBeGreaterThan(descMatch);
  });

  it('accumulates score across multiple matching terms', () => {
    const recipe = makeRecipe({ title: 'Spicy Noodle Bowl', description: 'spicy dan dan noodles' });
    const mapping = { searchTerms: ['noodle', 'spicy', 'dan dan'], flavorTags: [], temperature: 'hot' as const, texturePrefs: [] };
    const score = scoreCravingMatch(recipe, mapping);
    expect(score).toBeGreaterThan(5);
  });

  it('adds bonus for flavor tag matches', () => {
    const withFlavor = scoreCravingMatch(
      makeRecipe({ title: 'Chicken Soup', description: 'warm comfort food' }),
      { searchTerms: ['chicken'], flavorTags: ['comfort'], temperature: 'any', texturePrefs: [] },
    );
    const withoutFlavor = scoreCravingMatch(
      makeRecipe({ title: 'Chicken Soup', description: 'classic broth' }),
      { searchTerms: ['chicken'], flavorTags: ['comfort'], temperature: 'any', texturePrefs: [] },
    );
    expect(withFlavor).toBeGreaterThan(withoutFlavor);
  });

  it('matches in ingredient text', () => {
    const score = scoreCravingMatch(
      makeRecipe({
        title: 'Pasta Primavera',
        ingredients: [{ text: '200g cheddar cheese' }, { text: '100g mozzarella' }],
      }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    expect(score).toBeGreaterThan(0);
  });
});

describe('scoreCravingMatch — diminishing returns', () => {
  const makeRecipe = (overrides: Partial<{
    title: string;
    description: string;
    cuisine: string;
    ingredients: Array<{ text: string }>;
    instructions: Array<{ text: string }>;
  }> = {}) => ({
    title: 'Test Recipe',
    description: '',
    cuisine: '',
    ingredients: [],
    instructions: [],
    ...overrides,
  });

  it('applies diminishing returns: 3 title hits score less than 3x a single title hit', () => {
    // Single term hits title once
    const singleHitScore = scoreCravingMatch(
      makeRecipe({ title: 'Cheese Bowl' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    // Three terms all hit the same title
    const tripleHitScore = scoreCravingMatch(
      makeRecipe({ title: 'Cheese Mac Bowl' }),
      { searchTerms: ['cheese', 'mac', 'bowl'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    // Three title hits should NOT be 3× a single hit (diminishing returns: +5, +3, +1)
    expect(tripleHitScore).toBeLessThan(singleHitScore * 3);
    // But triple still scores higher than single
    expect(tripleHitScore).toBeGreaterThan(singleHitScore);
  });

  it('hero ingredient: term in title + 3 ingredients scores >=2x vs term in 1 ingredient', () => {
    const heroScore = scoreCravingMatch(
      makeRecipe({
        title: 'Mac and Cheese',
        ingredients: [
          { text: '200g cheddar cheese' },
          { text: '100g mozzarella cheese' },
          { text: '50g parmesan cheese' },
        ],
      }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    const weakScore = scoreCravingMatch(
      makeRecipe({
        title: 'Greek Salad',
        ingredients: [{ text: '30g feta cheese' }],
      }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    expect(heroScore).toBeGreaterThanOrEqual(weakScore * 2);
  });

  it('instruction-only match applies 0.5x penalty', () => {
    const instructionOnlyScore = scoreCravingMatch(
      makeRecipe({
        title: 'Grilled Chicken',
        ingredients: [{ text: 'chicken breast' }],
        instructions: [{ text: 'add a pinch of cayenne at the end' }],
      }),
      { searchTerms: ['cayenne'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    const titleMatchScore = scoreCravingMatch(
      makeRecipe({ title: 'Spicy Cayenne Chicken' }),
      { searchTerms: ['cayenne'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    expect(instructionOnlyScore).toBeLessThan(titleMatchScore);
  });

  it('filter-aware boost: matching cuisine adds +3 to score', () => {
    // "Cheese Quesadillas" — title contains "cheese" so score > 0
    const withCuisineBoost = scoreCravingMatch(
      makeRecipe({ title: 'Cheese Quesadillas', cuisine: 'Mexican' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
      { cuisines: ['Mexican'] },
    );
    const withoutCuisineBoost = scoreCravingMatch(
      makeRecipe({ title: 'Cheese Quesadillas', cuisine: 'Mexican' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
    );
    expect(withCuisineBoost).toBe(withoutCuisineBoost + 3);
  });

  it('filter-aware: cheesy + Mexican beats cheesy + American when Mexican filter active', () => {
    const cheesyMexican = scoreCravingMatch(
      makeRecipe({ title: 'Cheese Quesadillas', cuisine: 'Mexican' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
      { cuisines: ['Mexican'] },
    );
    const cheesyAmerican = scoreCravingMatch(
      makeRecipe({ title: 'Mac and Cheese', cuisine: 'American' }),
      { searchTerms: ['cheese'], flavorTags: [], temperature: 'any', texturePrefs: [] },
      { cuisines: ['Mexican'] },
    );
    expect(cheesyMexican).toBeGreaterThan(cheesyAmerican);
  });
});

describe('mapCravingToSearchTerms — fallback (no API key)', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalEnv) process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('returns non-empty searchTerms for a cheesy craving', async () => {
    const result = await mapCravingToSearchTerms('something cheesy');
    expect(result.searchTerms.length).toBeGreaterThan(0);
    expect(result.searchTerms.some(t => t.toLowerCase().includes('chees'))).toBe(true);
  });

  it('returns non-empty searchTerms for a spicy craving', async () => {
    const result = await mapCravingToSearchTerms('spicy noodles');
    expect(result.searchTerms.length).toBeGreaterThan(0);
  });

  it('falls back to raw words when nothing matches', async () => {
    const result = await mapCravingToSearchTerms('zaatar flatbread with labneh');
    expect(result.searchTerms.length).toBeGreaterThan(0);
  });

  it('always returns valid shape', async () => {
    const result = await mapCravingToSearchTerms('cold and refreshing');
    expect(Array.isArray(result.searchTerms)).toBe(true);
    expect(Array.isArray(result.flavorTags)).toBe(true);
    expect(Array.isArray(result.texturePrefs)).toBe(true);
    expect(['hot', 'cold', 'any']).toContain(result.temperature);
  });
});
