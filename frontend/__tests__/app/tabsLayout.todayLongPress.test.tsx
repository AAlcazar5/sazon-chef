// BAP3.1: Today tab long-press → Build-a-Plate seeded with today's context.
//
// Per plans/ia-spec.md, long-press on a tab opens that tab's "context".
// Today's context is *what would I cook tonight* — the most direct
// expression is Build-a-Plate prefilled. Before BAP3.1 the 1.8s threshold
// on Today opened Sazon; this contract test pins the new behavior.
//
// We use a static-text contract test instead of a full render mount
// because (tabs)/_layout.tsx imports the entire 4-tab graph and would
// require mocking every screen + every long-press handler dep. The
// contract approach catches: handler deletion, threshold drift, the
// router.push target being silently changed.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');

describe('BAP3.1: Today tab long-press contract', () => {
  const src = readFileSync(FILE, 'utf8');

  it('long-press at the SAZON threshold routes Today to Build-a-Plate', () => {
    // The push line lives inside the LONG_PRESS_SAZON_MS branch on the
    // Today tab button. Pin both: the comparison + the target route.
    expect(src).toMatch(/elapsed\s*>=\s*LONG_PRESS_SAZON_MS/);
    expect(src).toMatch(
      /router\.push\(\s*['"]\/build-a-plate\?seedFromToday=true['"][^)]*\)/,
    );
  });

  it('normal tap is unaffected (onPress wraps the original handler)', () => {
    // The tab button's onPress prop still forwards to the original
    // Tabs.Screen onPress so tap-to-navigate keeps working.
    expect(src).toMatch(/onPress=\{\s*\(e[^)]*\)\s*=>\s*onPress\?\.\(e\)\s*\}/);
  });

  it('voice-composer threshold (LONG_PRESS_VOICE_MS) is preserved below the SAZON threshold', () => {
    // The 1.0s voice composer still fires between VOICE_MS and SAZON_MS —
    // BAP3.1 only replaced the >=SAZON_MS branch, not the voice path.
    expect(src).toMatch(
      /elapsed\s*>=\s*LONG_PRESS_VOICE_MS\s*&&\s*elapsed\s*<\s*LONG_PRESS_SAZON_MS/,
    );
    expect(src).toMatch(/setShowVoiceComposer\(true\)/);
  });

  it('accessibility hint announces composing tonight\'s plate', () => {
    expect(src).toMatch(/accessibilityHint=['"][^'"]*tonight['"]?'?s? plate/);
  });

  it('Today long-press fires a heavy haptic before routing', () => {
    // Match the heavy-haptic call that sits adjacent to the router.push.
    const sazonBranch = src.match(
      /elapsed\s*>=\s*LONG_PRESS_SAZON_MS[\s\S]{0,600}?router\.push/,
    );
    expect(sazonBranch).not.toBeNull();
    expect((sazonBranch as RegExpMatchArray)[0]).toMatch(
      /Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Heavy\)/,
    );
  });

  it('other tabs (Kitchen, Week) still open Sazon at the SAZON threshold — BAP3.1 only changes Today', () => {
    // Sanity-check: openSazonForTab('kitchen') and openSazonForTab('week')
    // still exist. If a refactor accidentally routes them to /build-a-plate,
    // this test fails.
    expect(src).toMatch(/openSazonForTab\(['"]kitchen['"]\)/);
    expect(src).toMatch(/openSazonForTab\(['"]week['"]\)/);
    // Today no longer calls openSazonForTab — that line was BAP3.1's
    // replacement target.
    expect(src).not.toMatch(/openSazonForTab\(['"]today['"]\)/);
  });
});
