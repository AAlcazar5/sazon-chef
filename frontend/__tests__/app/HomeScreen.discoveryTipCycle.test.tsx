// HomeScreen: discovery / pairing tip rotates on pull-to-refresh.
//
// Pre-fix: `dailyDiscoveryTip` was a `useMemo([])` indexed by day-of-year
// — so within a session it never changed. The same pairing tip stuck
// across every pull-to-refresh.
//
// Post-fix: tip index is state-tracked, seeded from day-of-year on
// cold-start, and `cycleDiscoveryTip()` advances to a new random index
// (avoiding immediate repeat) on each pull-to-refresh.
//
// This contract test pins the source-level wiring so a future refactor
// can't quietly revert to the static `useMemo([])` form.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

describe('HomeScreen: discovery tip cycle on refresh', () => {
  const src = readFileSync(FILE, 'utf8');

  it('discoveryTipIndex is state-tracked (not a static useMemo)', () => {
    expect(src).toMatch(/const\s+\[discoveryTipIndex,\s*setDiscoveryTipIndex\]\s*=\s*useState/);
  });

  it('seeds the initial index from day-of-year (consistent first-visit per day)', () => {
    expect(src).toMatch(/dayOfYear\s*%\s*FOOD_INTEL_TIPS\.length/);
  });

  it('exposes a cycleDiscoveryTip callback that avoids immediate repeat', () => {
    expect(src).toMatch(/const\s+cycleDiscoveryTip\s*=\s*useCallback/);
    // Strict "avoid prev → bump to next index" guard.
    expect(src).toMatch(/if\s*\(\s*next\s*===\s*prev\s*\)\s*next\s*=\s*\(\s*prev\s*\+\s*1\s*\)\s*%\s*FOOD_INTEL_TIPS\.length/);
  });

  it('onRefresh invokes cycleDiscoveryTip so the tip changes on pull-to-refresh', () => {
    // The exact call must live inside the onRefresh function body.
    const onRefreshBody = src.match(/const\s+onRefresh\s*=\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\n\s*\};/);
    expect(onRefreshBody).not.toBeNull();
    expect((onRefreshBody as RegExpMatchArray)[0]).toMatch(/cycleDiscoveryTip\(\)/);
  });
});
