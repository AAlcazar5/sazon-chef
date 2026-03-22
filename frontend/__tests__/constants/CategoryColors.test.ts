// frontend/__tests__/constants/CategoryColors.test.ts
import { CATEGORY_COLORS, getCategoryColor } from '../../constants/CategoryColors';

describe('CategoryColors', () => {
  it('has color configs for common cuisines', () => {
    const cuisines = ['Italian', 'Mexican', 'Japanese', 'Chinese', 'Indian', 'Thai', 'Korean'];
    cuisines.forEach((c) => {
      expect(CATEGORY_COLORS[c]).toBeDefined();
      expect(CATEGORY_COLORS[c].bg).toBeTruthy();
      expect(CATEGORY_COLORS[c].text).toBeTruthy();
      expect(CATEGORY_COLORS[c].emoji).toBeTruthy();
    });
  });

  it('has color configs for meal types', () => {
    const meals = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'];
    meals.forEach((m) => {
      expect(CATEGORY_COLORS[m]).toBeDefined();
    });
  });

  it('getCategoryColor returns matching category', () => {
    const italian = getCategoryColor('Italian');
    expect(italian.emoji).toBe('🍝');
    expect(italian.bg).toBeTruthy();
  });

  it('getCategoryColor returns neutral fallback for unknown category', () => {
    const unknown = getCategoryColor('Martian Cuisine');
    expect(unknown.emoji).toBe('🍴');
    expect(unknown.bg).toBeTruthy();
    expect(unknown.text).toBeTruthy();
  });

  it('no two adjacent categories should share the same bg', () => {
    const categories = Object.keys(CATEGORY_COLORS);
    for (let i = 0; i < categories.length - 1; i++) {
      const a = CATEGORY_COLORS[categories[i]];
      const b = CATEGORY_COLORS[categories[i + 1]];
      // Adjacent categories should have different backgrounds
      expect(a.bg).not.toBe(b.bg);
    }
  });

  it('each category has both light and dark mode properties', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      expect(color.bg).toBeTruthy();
      expect(color.bgDark).toBeTruthy();
      expect(color.text).toBeTruthy();
      expect(color.textDark).toBeTruthy();
      expect(color.tint).toBeTruthy();
      expect(color.tintDark).toBeTruthy();
    });
  });
});
