// HX3.2: DiscoveryStrip per-source migration on Today.
//
// DiscoveryStrip shell shipped with 9 tests in
// `__tests__/components/today/DiscoveryStrip.test.tsx`. The HX3.2 gate
// item was wiring the 5 previously-stacked discovery surfaces
// (SundayPolaroid, FirstOfDayNote, NutritionStrip, CohortSocialProofPill,
// TodayDiscoveryCard) into the strip's variant slots with externally-
// computed hasData per surface.
//
// SeasonalProduceCard is not currently mounted on Today (removed in a
// prior cleanup); the spec listed it as one of the 6 candidates, but the
// migration scope is the 5 that actually live on the page.
//
// Contract test: pin the strip's wiring at the source level so a future
// refactor can't quietly drop a surface from the strip or break the
// hasData wiring.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/(tabs)/index.tsx');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HX3.2: HomeScreen DiscoveryStrip wiring', () => {
  const raw = readFileSync(FILE, 'utf8');
  const live = stripComments(raw);

  it('imports DiscoveryStrip + the DiscoverySurface type', () => {
    expect(raw).toMatch(/import\s+DiscoveryStrip,\s*\{\s*type\s+DiscoverySurface\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/today\/DiscoveryStrip['"]/);
  });

  it('mounts exactly ONE <DiscoveryStrip /> in the JSX tree', () => {
    const matches = live.match(/<DiscoveryStrip\b/g);
    expect(matches).not.toBeNull();
    expect((matches as RegExpMatchArray).length).toBe(1);
  });

  it('strip carries all 5 discovery surface ids in its surfaces[] array', () => {
    // The five surface IDs that the migration is scoped to. If a future
    // commit drops one or renames it, this test surfaces the regression
    // before it lands.
    const required = [
      'sundayPolaroid',
      'firstOfDay',
      'nutrition',
      'cohortSocialProof',
      'todayDiscovery',
    ];
    for (const id of required) {
      const re = new RegExp(String.raw`id:\s*['"]${id}['"]`);
      expect(raw).toMatch(re);
    }
  });

  it('hasData is computed externally for each surface (not blindly true)', () => {
    // Surfaces with externally-known data sources must compute hasData from
    // that data, not just pass `true`. CohortSocialProofPill is the one
    // documented exception (self-manages internal data fetch).
    expect(raw).toMatch(/id:\s*['"]sundayPolaroid['"][\s\S]*?hasData:\s*!!sundayRecap/);
    expect(raw).toMatch(/id:\s*['"]firstOfDay['"][\s\S]*?hasData:\s*!!lastCookCuisine\?\.trim\(\)/);
    expect(raw).toMatch(/id:\s*['"]nutrition['"][\s\S]*?hasData:\s*!!dailyNutrition/);
    expect(raw).toMatch(/id:\s*['"]todayDiscovery['"][\s\S]*?hasData:\s*!!dailyDiscoveryTip/);
  });

  it('cohortSocialProof reads hasData from the lifted useCohortSocialProof hook (no empty-slot reservation)', () => {
    // HX3.2 follow-up: cohort proof fetch was hoisted into a shared
    // hook so the strip can know hasData BEFORE the pill renders.
    // Otherwise the strip reserves an empty 280-wide slot for a pill
    // that returns null, producing a visible gap on cold-start.
    expect(raw).toMatch(/useCohortSocialProof/);
    expect(raw).toMatch(/id:\s*['"]cohortSocialProof['"][\s\S]*?hasData:\s*!cohortProofLoading\s*&&\s*!!cohortProof/);
  });

  it('legacy stacked surfaces are gone from the JSX (only the strip mounts them now)', () => {
    // Each surface must appear inside the strip's surfaces[] array as a
    // `node:` field — NOT as a top-level JSX element above other content.
    // The check: each component is referenced exactly ONCE in live JSX
    // (the strip surface node). Any second reference would mean a
    // legacy duplicate remained.
    const checkSingle = (tag: string) => {
      const re = new RegExp(`<${tag}\\b`, 'g');
      const matches = live.match(re);
      expect(matches).not.toBeNull();
      expect((matches as RegExpMatchArray).length).toBe(1);
    };
    checkSingle('SundayPolaroidCard');
    checkSingle('FirstOfDayNote');
    checkSingle('NutritionStrip');
    checkSingle('CohortSocialProofPill');
    checkSingle('TodayDiscoveryCard');
  });

  it('surface priorities are unique + left-to-right ordering is explicit', () => {
    // Priority numbers control L→R order; collisions would make the order
    // depend on the (stable) input order which is fine but harder to
    // reason about. Unique priorities are the contract.
    const priorities = Array.from(
      raw.matchAll(/priority:\s*(\d+)/g),
    ).map((m) => Number(m[1]));
    expect(priorities.length).toBeGreaterThanOrEqual(5);
    // First 5 are the discovery surfaces. They must be strictly increasing.
    const stripPriorities = priorities.slice(0, 5);
    const sorted = [...stripPriorities].sort((a, b) => a - b);
    expect(stripPriorities).toEqual(sorted);
    expect(new Set(stripPriorities).size).toBe(stripPriorities.length);
  });
});
