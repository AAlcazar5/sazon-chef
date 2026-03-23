// frontend/__tests__/constants/PastelTokens.test.ts
// Tests for the 9K Pastel Color System tokens

import { Pastel, Accent, PastelDark, MACRO_COLORS } from '../../constants/Colors';

describe('Pastel tokens', () => {
  const pastelKeys = ['sage', 'golden', 'lavender', 'peach', 'sky', 'blush', 'orange', 'red'] as const;

  it('exports all 8 light pastel tints', () => {
    pastelKeys.forEach((key) => {
      expect(Pastel[key]).toBeDefined();
      expect(typeof Pastel[key]).toBe('string');
      expect(Pastel[key]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('exports all 6 vivid accents', () => {
    const accentKeys = ['sage', 'golden', 'lavender', 'peach', 'sky', 'blush'] as const;
    accentKeys.forEach((key) => {
      expect(Accent[key]).toBeDefined();
      expect(typeof Accent[key]).toBe('string');
      expect(Accent[key]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('exports all 8 dark mode pastel tints as rgba', () => {
    pastelKeys.forEach((key) => {
      expect(PastelDark[key]).toBeDefined();
      expect(typeof PastelDark[key]).toBe('string');
      expect(PastelDark[key]).toMatch(/^rgba\(/);
    });
  });

  it('dark mode pastels use 12% opacity', () => {
    Object.values(PastelDark).forEach((value) => {
      expect(value).toContain('0.12)');
    });
  });
});

describe('MACRO_COLORS', () => {
  const macros = ['protein', 'carbs', 'fat', 'calories'] as const;

  it('maps all 4 macros', () => {
    macros.forEach((macro) => {
      expect(MACRO_COLORS[macro]).toBeDefined();
    });
  });

  it('each macro has bg, bgDark, and accent', () => {
    macros.forEach((macro) => {
      const entry = MACRO_COLORS[macro];
      expect(entry.bg).toBeTruthy();
      expect(entry.bgDark).toBeTruthy();
      expect(entry.accent).toBeTruthy();
    });
  });

  it('protein maps to sage pastel', () => {
    expect(MACRO_COLORS.protein.bg).toBe(Pastel.sage);
    expect(MACRO_COLORS.protein.accent).toBe(Accent.sage);
  });

  it('carbs maps to golden pastel', () => {
    expect(MACRO_COLORS.carbs.bg).toBe(Pastel.golden);
    expect(MACRO_COLORS.carbs.accent).toBe(Accent.golden);
  });

  it('fat maps to lavender pastel', () => {
    expect(MACRO_COLORS.fat.bg).toBe(Pastel.lavender);
    expect(MACRO_COLORS.fat.accent).toBe(Accent.lavender);
  });

  it('calories maps to peach pastel', () => {
    expect(MACRO_COLORS.calories.bg).toBe(Pastel.peach);
    expect(MACRO_COLORS.calories.accent).toBe(Accent.peach);
  });

  it('dark mode bg uses rgba overlays', () => {
    macros.forEach((macro) => {
      expect(MACRO_COLORS[macro].bgDark).toMatch(/^rgba\(/);
    });
  });
});
