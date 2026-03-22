// frontend/__tests__/constants/IngredientEmoji.test.ts
import { getIngredientEmoji, INGREDIENT_EMOJI_MAP, FALLBACK_EMOJI } from '../../constants/IngredientEmoji';

describe('IngredientEmoji', () => {
  it('returns correct emoji for exact match', () => {
    expect(getIngredientEmoji('chicken')).toBe('🍗');
    expect(getIngredientEmoji('tomato')).toBe('🍅');
    expect(getIngredientEmoji('rice')).toBe('🍚');
    expect(getIngredientEmoji('cheese')).toBe('🧀');
    expect(getIngredientEmoji('egg')).toBe('🥚');
  });

  it('handles case insensitive matching', () => {
    expect(getIngredientEmoji('Chicken')).toBe('🍗');
    expect(getIngredientEmoji('TOMATO')).toBe('🍅');
  });

  it('matches ingredients contained within longer strings', () => {
    expect(getIngredientEmoji('2 cups of chicken broth')).toBe('🍗');
    expect(getIngredientEmoji('diced tomatoes')).toBe('🍅');
    expect(getIngredientEmoji('fresh garlic cloves')).toBe('🧄');
  });

  it('returns fallback emoji for unknown ingredients', () => {
    expect(getIngredientEmoji('xanthan gum')).toBe(FALLBACK_EMOJI);
    expect(getIngredientEmoji('agar-agar')).toBe(FALLBACK_EMOJI);
  });

  it('trims whitespace', () => {
    expect(getIngredientEmoji('  chicken  ')).toBe('🍗');
  });

  it('has no duplicate emojis for different singular/plural forms', () => {
    // Singular and plural should return same emoji
    expect(getIngredientEmoji('egg')).toBe(getIngredientEmoji('eggs'));
    expect(getIngredientEmoji('tomato')).toBe(getIngredientEmoji('tomatoes'));
    expect(getIngredientEmoji('onion')).toBe(getIngredientEmoji('onions'));
  });

  it('has at least 40 entries in the map', () => {
    expect(Object.keys(INGREDIENT_EMOJI_MAP).length).toBeGreaterThanOrEqual(40);
  });

  it('all emojis render correctly (are non-empty strings)', () => {
    Object.values(INGREDIENT_EMOJI_MAP).forEach((emoji) => {
      expect(typeof emoji).toBe('string');
      expect(emoji.length).toBeGreaterThan(0);
    });
  });
});
