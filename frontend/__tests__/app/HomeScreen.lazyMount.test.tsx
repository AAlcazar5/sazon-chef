// HX3.3: Per-surface lazy-mount wiring on Today.
//
// LazyMountBoundary primitive shipped with 10 tests in
// `__tests__/components/home/LazyMountBoundary.test.tsx`. The HX3.3 gate
// item was wiring the primitive into Today's below-the-fold surfaces:
// FriendsFeedSection, PremiumUpsellCard, AlmostMadeItSheet (the
// recipe-count footer's modern replacement per HX5.1).
//
// Mounting the whole HomeScreen in jest is impractical (~1500 lines, every
// home dep imported). This contract test pins the source-level wiring so
// a regression that strips the boundaries (or fails to wrap a future
// below-fold surface) can't slip past code review.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HX3.3: HomeScreen lazy-mount wiring', () => {
  const src = readFileSync(FILE, 'utf8');
  const live = stripComments(src);

  it('imports LazyMountBoundary', () => {
    expect(src).toMatch(/import\s+LazyMountBoundary\s+from\s+['"]\.\.\/\.\.\/components\/home\/LazyMountBoundary['"]/);
  });

  it('tracks a state-mirrored scrollOffset (throttled mirror of Animated scrollY)', () => {
    expect(src).toMatch(/const\s+\[scrollOffset,\s*setScrollOffset\]\s*=\s*useState\(0\)/);
    // The mirror MUST be bucketed — un-throttled 60fps setState would re-render the home tree.
    expect(src).toMatch(/Math\.round\(value\s*\/\s*100\)\s*\*\s*100/);
  });

  it('tracks viewportHeight from the ScrollView onLayout', () => {
    expect(src).toMatch(/const\s+\[viewportHeight,\s*setViewportHeight\]\s*=\s*useState\(0\)/);
    expect(src).toMatch(/onLayout=\{\(e\)\s*=>\s*\{[\s\S]*?setViewportHeight\(e\.nativeEvent\.layout\.height\)/);
  });

  it('wraps FriendsFeedSection in a LazyMountBoundary', () => {
    // Live JSX block — find FriendsFeedSection's enclosing element.
    const idx = live.indexOf('<FriendsFeedSection');
    expect(idx).toBeGreaterThan(-1);
    // The element ABOVE FriendsFeedSection in the JSX must be a LazyMountBoundary open tag.
    const before = live.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/<LazyMountBoundary\b[^>]*>/);
  });

  it('wraps PremiumUpsellCard in a LazyMountBoundary', () => {
    const idx = live.indexOf('<PremiumUpsellCard');
    expect(idx).toBeGreaterThan(-1);
    const before = live.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/<LazyMountBoundary\b[^>]*>/);
  });

  it('wraps AlmostMadeItSheet (the HX5.1 recipe-count footer replacement) in a LazyMountBoundary', () => {
    const idx = live.indexOf('<AlmostMadeItSheet');
    expect(idx).toBeGreaterThan(-1);
    const before = live.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/<LazyMountBoundary\b[^>]*>/);
  });

  it('every LazyMountBoundary on home passes scrollY={scrollOffset} + viewportHeight', () => {
    const opens = live.match(/<LazyMountBoundary\b[^>]*>/g) ?? [];
    expect(opens.length).toBeGreaterThanOrEqual(3);
    for (const tag of opens) {
      expect(tag).toMatch(/scrollY=\{scrollOffset\}/);
      expect(tag).toMatch(/viewportHeight=\{viewportHeight\}/);
    }
  });

  it('the scrollY listener is removed in the cleanup return (no leak)', () => {
    // Match the useEffect that subscribes + cleans up the scrollY listener.
    // Without the removeListener the home screen leaks subscribers on
    // every remount (tabs swap re-runs the effect).
    expect(src).toMatch(/scrollY\.addListener/);
    expect(src).toMatch(/scrollY\.removeListener\(sub\)/);
  });
});
