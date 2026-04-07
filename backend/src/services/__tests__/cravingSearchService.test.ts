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
