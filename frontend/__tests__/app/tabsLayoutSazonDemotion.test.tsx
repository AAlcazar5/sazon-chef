// ROADMAP 4.0 IA2.4 — verify the coach route is hidden from the tab bar.
//
// Sazon is now a floating header icon (SazonFAB), not a tab. The /coach
// route stays alive for deep links + push notifications, but href is
// null so it doesn't render in the bottom bar.

import * as fs from 'fs';
import * as path from 'path';

const LAYOUT_PATH = path.resolve(
  __dirname,
  '../../app/(tabs)/_layout.tsx',
);

describe('IA2.4 — Sazon tab demotion', () => {
  /** Split the layout source into one block per <Tabs.Screen> declaration. */
  function tabBlocksByName(): Record<string, string> {
    const src = fs.readFileSync(LAYOUT_PATH, 'utf-8');
    // Each block starts at <Tabs.Screen and ends at the matching />.
    const blocks: Record<string, string> = {};
    const re = /<Tabs\.Screen([\s\S]*?)\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const body = m[1];
      const nameMatch = body.match(/name="([^"]+)"/);
      if (nameMatch) {
        blocks[nameMatch[1]] = m[0];
      }
    }
    return blocks;
  }

  it('coach route is hidden from the tab bar (href: null)', () => {
    const blocks = tabBlocksByName();
    expect(blocks['coach']).toBeDefined();
    expect(blocks['coach']).toMatch(/href\s*:\s*null/);
  });

  it('the coach tab is no longer rendered with a tabBarIcon (it is not a tab)', () => {
    const blocks = tabBlocksByName();
    expect(blocks['coach']).toBeDefined();
    expect(blocks['coach']).not.toMatch(/tabBarIcon/);
  });

  it('Today / Kitchen / Week tabs remain visible (not hidden)', () => {
    const blocks = tabBlocksByName();
    for (const name of ['index', 'cookbook', 'meal-plan']) {
      expect(blocks[name]).toBeDefined();
      expect(blocks[name]).not.toMatch(/href\s*:\s*null/);
    }
  });

  it('SazonSheetProvider mounted in app root layout', () => {
    const rootLayoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
    const src = fs.readFileSync(rootLayoutPath, 'utf-8');
    expect(src).toMatch(/SazonSheetProvider/);
    expect(src).toMatch(/import.*SazonSheetProvider.*SazonSheetContext/);
  });

  it('SazonFAB mounted globally in the tabs layout (Search + Quick Actions row)', () => {
    // IA2.5 relocated SazonFAB from individual tab headers to the global
    // Search + Quick-Actions row above the tab bar. Single mount point.
    const src = fs.readFileSync(LAYOUT_PATH, 'utf-8');
    expect(src).toMatch(/import\s+SazonFAB/);
    expect(src).toMatch(/<SazonFAB[\s\S]*?\/>/);
  });

  it('SazonFAB is NOT mounted inside individual tab headers (single global mount)', () => {
    const headers = [
      '../../components/home/HomeHeader.tsx',
      '../../components/meal-plan/MealPlanHeader.tsx',
      '../../components/cookbook/CookbookHeader.tsx',
    ];
    for (const rel of headers) {
      const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf-8');
      // No JSX usage and no import of the FAB. Comments mentioning the
      // component name are fine (and explain why it's NOT here).
      expect(src).not.toMatch(/<SazonFAB/);
      expect(src).not.toMatch(/import\s+SazonFAB/);
    }
  });
});
