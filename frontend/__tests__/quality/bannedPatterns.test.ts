// frontend/__tests__/quality/bannedPatterns.test.ts
// ROADMAP 4.0 R6 — fail CI if banned design patterns drift back into the
// codebase. The test grep-counts each pattern. Three are at zero (the
// R6 sweep cleared them). `Animated` from react-native is documented as
// deferred and capped at the current baseline.

import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

function countMatches(pattern: string, includeFlag = '--include="*.tsx"'): number {
  try {
    const out = execSync(
      `grep -rE ${JSON.stringify(pattern)} ${REPO_ROOT}/components ${REPO_ROOT}/app ${includeFlag} 2>/dev/null || true`,
      { encoding: 'utf-8' },
    );
    if (!out.trim()) return 0;
    return out.trim().split('\n').length;
  } catch {
    return 0;
  }
}

describe('Banned design patterns (R6)', () => {
  it('has zero `border border-gray-*` violations', () => {
    expect(countMatches('border border-gray-')).toBe(0);
  });

  it('has zero `borderRadius: 8` violations on content cards', () => {
    expect(countMatches('borderRadius: 8([^0-9]|$)')).toBe(0);
  });

  it('has zero raw `<ActivityIndicator` usages (use AnimatedActivityIndicator)', () => {
    expect(countMatches('<ActivityIndicator')).toBe(0);
  });

  it('caps raw `Animated` from react-native at the documented baseline (R6 deferred)', () => {
    // ~85 sites at the R6 audit (production + tests). Cap to keep a ceiling;
    // migration to react-native-reanimated is per-site work.
    const count = countMatches('Animated[,}]');
    expect(count).toBeLessThanOrEqual(95);
  });

  it('has zero raw `<TouchableOpacity` JSX usages (K24 — use HapticTouchableOpacity)', () => {
    // K24 cleared the 7 sites in cooking/recipe components. New sites must
    // wrap with HapticTouchableOpacity for the spring + haptic feedback.
    expect(countMatches('<TouchableOpacity')).toBe(0);
  });

  it('caps `rounded-lg` NativeWind class at the K22 baseline (per-site migration deferred)', () => {
    // ~192 sites at the K22 audit. Per-site review needed (content cards
    // → 20px BorderRadius.card; buttons/modals may want different radii).
    // Cap to ratchet down over time; bulk sed-replace would over-shoot.
    const count = countMatches('rounded-lg');
    expect(count).toBeLessThanOrEqual(195);
  });

  // H11: every HapticTouchableOpacity in the 5 worst-offender screens has an
  // accessibilityLabel after the H11 sweep. Cap test asserts label-coverage
  // parity inside each file. New interactive surfaces must ship with a label
  // or this test fails — see CLAUDE.md DS1.5 banned-pattern rule.
  describe('H11 accessibility coverage — every HapticTouchableOpacity needs accessibilityLabel', () => {
    const SWEPT_FILES = [
      'app/recipe-form.tsx',
      'app/modal.tsx',
      'app/scanner.tsx',
      'app/cooking.tsx',
      'app/edit-preferences.tsx',
    ];

    function countInFile(file: string, pattern: string): number {
      try {
        const out = execSync(
          `grep -cE ${JSON.stringify(pattern)} ${REPO_ROOT}/${file} 2>/dev/null || true`,
          { encoding: 'utf-8' },
        );
        const n = parseInt(out.trim(), 10);
        return Number.isFinite(n) ? n : 0;
      } catch {
        return 0;
      }
    }

    it.each(SWEPT_FILES)('%s — accessibilityLabel count ≥ HapticTouchableOpacity count', (file) => {
      const interactive = countInFile(file, '<HapticTouchableOpacity');
      const labels = countInFile(file, 'accessibilityLabel');
      expect(labels).toBeGreaterThanOrEqual(interactive);
    });
  });
});
