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
});
