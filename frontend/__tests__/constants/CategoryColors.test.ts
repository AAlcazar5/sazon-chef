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

  it('has attribute tag categories (quick, healthy, budget)', () => {
    const tags = ['quick', 'healthy', 'budget'];
    tags.forEach((t) => {
      expect(CATEGORY_COLORS[t]).toBeDefined();
      expect(CATEGORY_COLORS[t].bg).toBeTruthy();
      expect(CATEGORY_COLORS[t].emoji).toBeTruthy();
    });
  });

  it('quick has sky-blue bg and lightning emoji', () => {
    expect(CATEGORY_COLORS['quick'].bg).toBe('#E3F2FD');
    expect(CATEGORY_COLORS['quick'].emoji).toBe('⚡');
  });

  it('has dietary categories (High Protein, Low Carb, Meal Prep)', () => {
    const dietary = ['High Protein', 'Low Carb', 'Meal Prep', 'Vegan'];
    dietary.forEach((d) => {
      expect(CATEGORY_COLORS[d]).toBeDefined();
      expect(CATEGORY_COLORS[d].bg).toBeTruthy();
    });
  });

  it('dark mode pastels use dark backgrounds not blown-out light colors', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      // bgDark should not be a light pastel (#E or #F prefix)
      expect(color.bgDark).not.toMatch(/^#[EF]/);
    });
  });

  it('emojis render as single grapheme clusters', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      expect(color.emoji.length).toBeGreaterThan(0);
      expect(color.emoji.length).toBeLessThanOrEqual(3); // emoji + potential variant selector
    });
  });

  it('light mode bg colors are pastel (start with #E or #F)', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      const bgFirstHex = Number.parseInt(color.bg.charAt(1), 16);
      expect(bgFirstHex).toBeGreaterThanOrEqual(14); // #E or #F prefix = light pastel
    });
  });

  it('text and bg colors are different for contrast', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      expect(color.text).not.toBe(color.bg);
      expect(color.textDark).not.toBe(color.bgDark);
    });
  });
});
