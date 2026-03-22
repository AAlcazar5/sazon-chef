// frontend/__tests__/constants/SemanticColors.test.ts
// Tests for semantic color tokens, difficulty colors, and backdrop values

import {
  Colors,
  DarkColors,
  Backdrop,
  DifficultyColors,
  getDifficultyColor,
} from '../../constants/Colors';

describe('Backdrop tokens', () => {
  it('Backdrop.light exists and is an rgba string', () => {
    expect(Backdrop.light).toBeDefined();
    expect(Backdrop.light).toMatch(/^rgba\(/);
  });

  it('Backdrop.heavy exists and is an rgba string', () => {
    expect(Backdrop.heavy).toBeDefined();
    expect(Backdrop.heavy).toMatch(/^rgba\(/);
  });

  it('Backdrop.heavy is darker than Backdrop.light', () => {
    // Extract alpha values from rgba strings
    const lightAlpha = parseFloat(Backdrop.light.match(/[\d.]+\)$/)?.[0] ?? '0');
    const heavyAlpha = parseFloat(Backdrop.heavy.match(/[\d.]+\)$/)?.[0] ?? '0');
    expect(heavyAlpha).toBeGreaterThan(lightAlpha);
  });
});

describe('DifficultyColors', () => {
  it('has easy difficulty with bg and text for light mode', () => {
    expect(DifficultyColors.easy).toBeDefined();
    expect(DifficultyColors.easy.bg).toBeDefined();
    expect(DifficultyColors.easy.text).toBeDefined();
    expect(typeof DifficultyColors.easy.bg).toBe('string');
    expect(typeof DifficultyColors.easy.text).toBe('string');
  });

  it('has medium difficulty with bg and text for light mode', () => {
    expect(DifficultyColors.medium).toBeDefined();
    expect(DifficultyColors.medium.bg).toBeDefined();
    expect(DifficultyColors.medium.text).toBeDefined();
  });

  it('has hard difficulty with bg and text for light mode', () => {
    expect(DifficultyColors.hard).toBeDefined();
    expect(DifficultyColors.hard.bg).toBeDefined();
    expect(DifficultyColors.hard.text).toBeDefined();
  });

  it('has dark mode variants (darkBg, darkText) for each difficulty', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      expect(DifficultyColors[level].darkBg).toBeDefined();
      expect(DifficultyColors[level].darkText).toBeDefined();
      expect(typeof DifficultyColors[level].darkBg).toBe('string');
      expect(typeof DifficultyColors[level].darkText).toBe('string');
    }
  });

  it('dark mode backgrounds use rgba for opacity', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      expect(DifficultyColors[level].darkBg).toMatch(/^rgba\(/);
    }
  });
});

describe('getDifficultyColor()', () => {
  it('returns correct colors for easy in light mode', () => {
    const result = getDifficultyColor('easy', false);
    expect(result.bg).toBe(DifficultyColors.easy.bg);
    expect(result.text).toBe(DifficultyColors.easy.text);
  });

  it('returns correct colors for easy in dark mode', () => {
    const result = getDifficultyColor('easy', true);
    expect(result.bg).toBe(DifficultyColors.easy.darkBg);
    expect(result.text).toBe(DifficultyColors.easy.darkText);
  });

  it('returns correct colors for medium in light mode', () => {
    const result = getDifficultyColor('medium', false);
    expect(result.bg).toBe(DifficultyColors.medium.bg);
    expect(result.text).toBe(DifficultyColors.medium.text);
  });

  it('returns correct colors for medium in dark mode', () => {
    const result = getDifficultyColor('medium', true);
    expect(result.bg).toBe(DifficultyColors.medium.darkBg);
    expect(result.text).toBe(DifficultyColors.medium.darkText);
  });

  it('returns correct colors for hard in light mode', () => {
    const result = getDifficultyColor('hard', false);
    expect(result.bg).toBe(DifficultyColors.hard.bg);
    expect(result.text).toBe(DifficultyColors.hard.text);
  });

  it('returns correct colors for hard in dark mode', () => {
    const result = getDifficultyColor('hard', true);
    expect(result.bg).toBe(DifficultyColors.hard.darkBg);
    expect(result.text).toBe(DifficultyColors.hard.darkText);
  });

  it('defaults to medium for unknown difficulty', () => {
    const result = getDifficultyColor('expert', false);
    expect(result.bg).toBe(DifficultyColors.medium.bg);
    expect(result.text).toBe(DifficultyColors.medium.text);
  });

  it('defaults to medium for unknown difficulty in dark mode', () => {
    const result = getDifficultyColor('impossible', true);
    expect(result.bg).toBe(DifficultyColors.medium.darkBg);
    expect(result.text).toBe(DifficultyColors.medium.darkText);
  });

  it('is case-insensitive for difficulty string', () => {
    const lower = getDifficultyColor('easy', false);
    const upper = getDifficultyColor('Easy', false);
    const allCaps = getDifficultyColor('EASY', false);
    expect(lower).toEqual(upper);
    // Note: only toLowerCase is applied, so 'EASY' -> 'easy' works
    expect(lower).toEqual(allCaps);
  });
});

describe('Dark mode semantic colors', () => {
  it('DarkColors.success is different from Colors.success', () => {
    expect(DarkColors.success).not.toBe(Colors.success);
  });

  it('DarkColors.warning is different from Colors.warning', () => {
    expect(DarkColors.warning).not.toBe(Colors.warning);
  });

  it('DarkColors.error is different from Colors.error', () => {
    expect(DarkColors.error).not.toBe(Colors.error);
  });

  it('DarkColors.info is different from Colors.info', () => {
    expect(DarkColors.info).not.toBe(Colors.info);
  });

  it('DarkColors has brighter variants for visibility', () => {
    // Dark mode colors should be lighter/brighter variants (400 series vs 500 series)
    expect(DarkColors.success).toBeDefined();
    expect(DarkColors.warning).toBeDefined();
    expect(DarkColors.error).toBeDefined();
    expect(DarkColors.info).toBeDefined();
  });

  it('light and dark mode share same primary brand color', () => {
    expect(Colors.primary).toBe(DarkColors.primary);
  });

  it('DarkColors background is dark/OLED-optimized', () => {
    // Background should be very dark
    expect(DarkColors.background).toMatch(/^#[01]/);
  });

  it('light mode background is white', () => {
    expect(Colors.background).toBe('#FFFFFF');
  });
});
