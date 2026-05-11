// HX3.2: DiscoveryStrip per-source migration — REVERTED 2026-05-11.
//
// Why this file remains: pins the rationale + the post-revert state so
// a future PR can't quietly re-mount DiscoveryStrip on Today without
// either (a) fixing the underlying nested-horizontal-FlatList sizing
// bug or (b) refactoring NutritionStrip away from horizontal-FlatList.
//
// The diagnosis: NutritionStrip is itself a horizontal FlatList (the
// macro pill scroller). Nesting a horizontal FlatList inside any
// horizontal scroll container (FlatList OR ScrollView) hits a React
// Native height-inheritance bug — the outer scroller claims ~400px of
// phantom vertical height even when the inner content is only ~60px
// tall. Visible result was a large empty band between the recipe hero
// and the RecipeSectionsGrid header.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HX3.2: HomeScreen surfaces stack (post-revert state)', () => {
  const raw = readFileSync(FILE, 'utf8');
  const live = stripComments(raw);

  it('does NOT mount <DiscoveryStrip /> on the home screen', () => {
    // Live JSX must not include <DiscoveryStrip — only comments may
    // mention it (preserved for the rationale + future-migration note).
    expect(live).not.toMatch(/<DiscoveryStrip\b/);
  });

  it('the 5 discovery surfaces render as a vertical stack (the pre-HX3.2 layout)', () => {
    // Each surface appears exactly once in live JSX, directly inside
    // the ScrollView (not wrapped in a horizontal scroll container).
    const surfaces = [
      'SundayPolaroidCard',
      'FirstOfDayNote',
      'NutritionStrip',
      'CohortSocialProofPill',
      'TodayDiscoveryCard',
    ];
    for (const tag of surfaces) {
      const matches = live.match(new RegExp(`<${tag}\\b`, 'g'));
      expect(matches).not.toBeNull();
      expect((matches as RegExpMatchArray).length).toBe(1);
    }
  });

  it('the DiscoveryStrip component itself remains in the tree for future re-migration', () => {
    // The shell + its tests stay. Only the WIRING on index.tsx was reverted.
    const componentSrc = readFileSync(
      path.resolve(__dirname, '../../components/today/DiscoveryStrip.tsx'),
      'utf8',
    );
    expect(componentSrc).toMatch(/export.*DiscoveryStrip/);
    expect(componentSrc).toMatch(/filterAndSort/);
  });

  it('the revert is explicitly documented in a code comment so future readers know why', () => {
    expect(raw).toMatch(/HX3\.2.*reverted/i);
    expect(raw).toMatch(/horizontal[- ]FlatList/i);
  });
});
