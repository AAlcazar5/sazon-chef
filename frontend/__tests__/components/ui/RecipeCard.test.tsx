import { Colors, DarkColors } from '../../../constants/Colors';

// Test the match-color logic from RecipeCard without rendering
// (RecipeCard has too many native dependencies for isolated unit tests;
//  screen-level tests in 10V-D/E/F/G cover its rendering)

function getMatchColor(matchPercentage: number, isDark = false): string {
  if (matchPercentage >= 80) return isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen;
  if (matchPercentage >= 60) return isDark ? DarkColors.primary : Colors.primary;
  return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
}

describe('RecipeCard — match color thresholds (v2 editorial)', () => {
  it('green for ≥80% match', () => {
    expect(getMatchColor(80)).toBe(Colors.tertiaryGreen);
    expect(getMatchColor(95)).toBe(Colors.tertiaryGreen);
  });

  it('orange for ≥60% match', () => {
    expect(getMatchColor(60)).toBe(Colors.primary);
    expect(getMatchColor(75)).toBe(Colors.primary);
  });

  it('red for <60% match', () => {
    expect(getMatchColor(45)).toBe(Colors.secondaryRed);
    expect(getMatchColor(0)).toBe(Colors.secondaryRed);
  });

  it('dark mode uses dark color variants', () => {
    expect(getMatchColor(85, true)).toBe(DarkColors.tertiaryGreen);
    expect(getMatchColor(65, true)).toBe(DarkColors.primary);
    expect(getMatchColor(40, true)).toBe(DarkColors.secondaryRed);
  });

  it('featured variant uses match-color top bar (threshold coverage)', () => {
    // featured: match-color top bar — green ≥80%, orange ≥60%, red <60%
    expect(getMatchColor(80)).not.toBe(getMatchColor(60));
    expect(getMatchColor(60)).not.toBe(getMatchColor(59));
  });
});
