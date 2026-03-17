// frontend/__tests__/constants/darkModeElevation.test.ts
// Phase 6: Dark mode depth — verifies DarkElevation tokens are exported,
// form a proper elevation ladder (each level is lighter than the one below),
// and cover the full range needed by the component system.

import { DarkElevation } from '../../constants/Colors';

/** Convert a 6-digit hex colour to [r, g, b] luminance-weighted brightness (0–255) */
function brightness(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance weights (sRGB)
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe('DarkElevation tokens', () => {
  it('exports all required elevation levels', () => {
    expect(DarkElevation).toBeDefined();
    expect(typeof DarkElevation.dp0).toBe('string');
    expect(typeof DarkElevation.dp1).toBe('string');
    expect(typeof DarkElevation.dp2).toBe('string');
    expect(typeof DarkElevation.dp4).toBe('string');
    expect(typeof DarkElevation.dp8).toBe('string');
    expect(typeof DarkElevation.dp16).toBe('string');
    expect(typeof DarkElevation.dp24).toBe('string');
  });

  it('all values are valid 6-digit hex strings', () => {
    Object.entries(DarkElevation).forEach(([key, value]) => {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/, `${key} should be a 6-digit hex colour`);
    });
  });

  it('elevation levels get progressively lighter (higher dp = higher brightness)', () => {
    const levels = [
      DarkElevation.dp0,
      DarkElevation.dp1,
      DarkElevation.dp2,
      DarkElevation.dp4,
      DarkElevation.dp8,
      DarkElevation.dp16,
      DarkElevation.dp24,
    ];
    for (let i = 1; i < levels.length; i++) {
      expect(brightness(levels[i])).toBeGreaterThan(brightness(levels[i - 1]));
    }
  });

  it('dp0 is dark enough to serve as a page background (brightness < 30)', () => {
    expect(brightness(DarkElevation.dp0)).toBeLessThan(30);
  });

  it('dp4 is visually distinct from dp0 (brightness diff > 10)', () => {
    expect(brightness(DarkElevation.dp4) - brightness(DarkElevation.dp0)).toBeGreaterThan(10);
  });

  it('dp24 is not so bright it breaks the dark theme (brightness < 90)', () => {
    // Still clearly a dark-mode colour, not approaching white (255)
    expect(brightness(DarkElevation.dp24)).toBeLessThan(90);
  });
});
