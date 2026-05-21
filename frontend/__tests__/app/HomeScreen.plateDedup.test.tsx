// BAP1.1 + BAP1.2: Today screen plate dedup guard.
//
// State after the BAP0.1 revert (recipe-of-the-day hero restored):
//   - Today's TOP hero is <EditorialHomeLayout> (the featured recipe).
//     The QuickActionRow's "Build a plate" chip directly above it gives
//     Build-a-Plate its visual seat without sacrificing the recipe hero.
//   - The 3 legacy sub-cards (StretchHomeCard, PlateOfWeekCard,
//     PantryPlateHeroCard) STAY removed — BAP1.1 is still correct;
//     those framings live in <TodayPlateCard>'s variant logic if a
//     future surface mounts it.
//   - <TodayPlateHero> is NOT mounted on the home screen. The component
//     remains exported from the home barrel for future use.
//
// The guard is a STATIC check on the source file — it pins the wiring so
// the regression where someone re-stacks the 3 sub-cards (or re-introduces
// TodayPlateHero alongside the recipe hero) can't slip past code review.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

/**
 * Strip JS line + block comments + JSX comments so the regex below only
 * matches LIVE JSX, not casual mentions in adjacent commentary.
 */
function stripComments(s: string): string {
  return s
    // /* ... */ block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // // line comments
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('BAP1.1 + BAP1.2: HomeScreen plate dedup guard', () => {
  const src = stripComments(readFileSync(FILE, 'utf8'));

  it('mounts the featured recipe hero (<EditorialHomeLayout />) as the top above-fold surface', () => {
    expect(src).toMatch(/<EditorialHomeLayout\b/);
    // Receives heroRecipe + recipePool — the established hero props.
    expect(src).toMatch(/heroRecipe=\{recipeOfTheDay\}/);
  });

  it('does NOT mount <TodayPlateHero /> on the home screen (BAP0.1 revert)', () => {
    expect(src).not.toMatch(/<TodayPlateHero\b/);
  });

  it('does NOT render the legacy <StretchHomeCard /> (BAP1.1 — subsumed)', () => {
    expect(src).not.toMatch(/<StretchHomeCard\b/);
  });

  it('does NOT render the legacy <PlateOfWeekCard /> (BAP1.1 — subsumed)', () => {
    expect(src).not.toMatch(/<PlateOfWeekCard\b/);
  });

  it('does NOT render <PantryPlateHeroCard /> directly on home (legacy — its framing lives inside TodayPlateCard)', () => {
    expect(src).not.toMatch(/<PantryPlateHeroCard\b/);
  });

  it('exactly ONE plate-themed featured surface above the recipe-sections grid', () => {
    // EditorialHomeLayout is the single featured surface. There must be
    // no other competing plate-themed CTA stacked alongside it.
    const editorialMatches = src.match(/<EditorialHomeLayout\b/g);
    expect(editorialMatches).not.toBeNull();
    expect((editorialMatches as RegExpMatchArray).length).toBe(1);
  });

  // Y-Dead-2c (2026-05-21): TodayPlateHero was kept "for future use"
  // after the BAP0.1 revert, but accumulated zero consumers in the
  // 10 days since. Deleted per the no-speculative-abstractions rule.
  // TodayPlateCard + PlateRationaleRibbon stay (consumed by
  // EditorialHomeLayout's variant logic).
  it('TodayPlateCard + PlateRationaleRibbon stay exported from the barrel', () => {
    const barrelSrc = readFileSync(
      path.resolve(__dirname, '../../components/home/index.ts'),
      'utf8',
    );
    expect(barrelSrc).toMatch(/TodayPlateCard/);
    expect(barrelSrc).toMatch(/PlateRationaleRibbon/);
    // TodayPlateHero is no longer exported — its source was deleted.
    expect(barrelSrc).not.toMatch(/from '\.\/TodayPlateHero/);
  });
});
