// BAP1.2: Today screen plate dedup guard.
//
// Once BAP0.1 puts TodayPlateHero at the top and BAP1.1 collapses the
// 3 legacy plate cards into the variant logic INSIDE the hero, app/(tabs)/
// index.tsx must mount AT MOST ONE plate-themed surface above the
// recipe-sections grid. A regression that re-introduces any of the
// legacy 3 cards (or stacks them alongside TodayPlateHero) would create
// a transition state the spec explicitly bans:
//   > avoid a transition state where Today has both a new plate hero
//   > AND three sub-hero plate cards
//
// Mounting (tabs)/index.tsx in jest is impractical (1500+ lines with
// every home dep imported). The guard is a STATIC check on the source
// file — it pins the import + JSX wiring so the regression can't slip
// past code review.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

describe('BAP1.2: HomeScreen plate dedup guard', () => {
  const src = readFileSync(FILE, 'utf8');

  it('imports TodayPlateHero from the home barrel', () => {
    expect(src).toMatch(/\bTodayPlateHero\b[\s\S]*?from\s+['"]\.\.\/\.\.\/components\/home['"]/);
  });

  it('renders exactly ONE <TodayPlateHero ...> in the JSX tree', () => {
    const matches = src.match(/<TodayPlateHero\b/g);
    expect(matches).not.toBeNull();
    expect((matches as RegExpMatchArray).length).toBe(1);
  });

  it('does NOT render the legacy <EditorialHomeLayout .../> (replaced by TodayPlateHero)', () => {
    expect(src).not.toMatch(/<EditorialHomeLayout\b/);
  });

  it('does NOT render the legacy <StretchHomeCard /> (subsumed into TodayPlateHero variant logic)', () => {
    expect(src).not.toMatch(/<StretchHomeCard\b/);
  });

  it('does NOT render the legacy <PlateOfWeekCard /> (subsumed into TodayPlateHero variant logic)', () => {
    expect(src).not.toMatch(/<PlateOfWeekCard\b/);
  });

  it('does NOT render the legacy <PantryPlateHeroCard ... /> directly on home (moved into EditorialHomeLayout which is now itself removed)', () => {
    // PantryPlateHeroCard might still be imported by other surfaces, but
    // it must not render directly on the home tab — its framing is now
    // resolved by useTodayPlateContext and rendered inside TodayPlateHero.
    expect(src).not.toMatch(/<PantryPlateHeroCard\b/);
  });

  it('TodayPlateHero appears in the page body, not just an import', () => {
    // Defensive: the import alone isn't proof — the component has to be
    // wired into the JSX tree.
    const heroOpen = src.indexOf('<TodayPlateHero');
    // Should be far past the imports block.
    expect(heroOpen).toBeGreaterThan(2000);
  });
});
