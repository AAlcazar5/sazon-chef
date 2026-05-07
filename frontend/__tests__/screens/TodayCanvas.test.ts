// frontend/__tests__/screens/TodayCanvas.test.ts
// ROADMAP 4.0 DS2.2 — Today renders on canvas-warm; other tabs render on
// plain canvas. Validated by inspecting the wrapper-line source so the rule
// can't silently revert.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf-8');
}

describe('DS2.2 — Today canvas-warm rule', () => {
  it('Today (app/(tabs)/index.tsx) wraps in Canvas.warmLight / Canvas.warmDark', () => {
    const src = readFile('app/(tabs)/index.tsx');
    // First wrapper after the // DS2.2 marker.
    const idx = src.indexOf('// DS2.2');
    expect(idx).toBeGreaterThan(-1);
    const window = src.slice(idx, idx + 600);
    expect(window).toMatch(/Canvas\.warmDark\s*:\s*Canvas\.warmLight/);
  });

  it('Today does not wrap in plain Canvas.light/dark for the root container', () => {
    const src = readFile('app/(tabs)/index.tsx');
    const idx = src.indexOf('// DS2.2');
    const window = src.slice(idx, idx + 600);
    // The wrapper line should not pick the sharp canvas.
    expect(window).not.toMatch(/backgroundColor:\s*isDark\s*\?\s*Canvas\.dark\s*:\s*Canvas\.light\b/);
  });

  it('Cookbook (app/(tabs)/cookbook.tsx) does not opt in to canvas-warm', () => {
    // Soft check — the rule is "Today only", so Cookbook should not import warmLight
    // at the root container. We allow Canvas.warmLight in unrelated overlays.
    const src = readFile('app/(tabs)/cookbook.tsx');
    // Token: there is no `Canvas.warmLight` reference at the root <View> wrapper.
    // We accept any Canvas usage but warn if warmLight appears as the bg.
    const matches = src.match(/backgroundColor[^\n]*Canvas\.warmLight/g);
    expect(matches ?? []).toEqual([]);
  });

  it('Canvas tokens still expose all four warm/sharp keys', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Canvas } = require('../../constants/tokens');
    expect(Canvas.light).toBeDefined();
    expect(Canvas.dark).toBeDefined();
    expect(Canvas.warmLight).toBeDefined();
    expect(Canvas.warmDark).toBeDefined();
  });
});
