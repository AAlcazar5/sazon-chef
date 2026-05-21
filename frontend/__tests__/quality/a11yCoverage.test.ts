// ROADMAP 4.0 N8.1 — a11y coverage cap test.
//
// Every new component in components/{home,today,meal-plan,kitchen} must
// include `accessibilityLabel` or `accessibilityRole` somewhere in its
// render tree (presentational primitives that compose into accessibility
// elsewhere are exempt via the GRANDFATHERED list).
//
// This test pins the current baseline. Files that already lack a11y wiring
// (the 32-file grandfather list below) are tolerated for incremental cleanup.
// New files that lack wiring fail the test until they add `accessibilityLabel`.
//
// To clear an item from the grandfather list: add the wiring + remove the
// entry below. Do NOT add new entries — that defeats the cap.

import * as fs from 'fs';
import * as path from 'path';

const ROOTS = [
  'components/home',
  'components/today',
  'components/meal-plan',
  'components/kitchen',
];

/** Files that pre-date the cap. New files MUST NOT be added here. */
const GRANDFATHERED: ReadonlySet<string> = new Set([
  'components/home/EditorialHomeLayout.tsx',
  'components/home/EditorialMacroWidgets.tsx',
  'components/home/HomeEmptyState.tsx',
  'components/home/HomeErrorState.tsx',
  'components/home/HomeLoadingState.tsx',
  'components/home/MealPrepModeHeader.tsx',
  'components/home/NoResultsState.tsx',
  'components/home/ParallaxHeroSection.tsx',
  'components/home/QuickFiltersBar.tsx',
  'components/home/RandomRecipeModal.tsx',
  // Y-Dead-2a (2026-05-21): RecipeCarouselSection + RecipeOfTheDayCard
  // deleted as legacy orphans superseded by RecipeSectionsGrid.
  'components/home/RecipeSectionsGrid.tsx',
  'components/home/SearchScopeSelector.tsx',
  'components/home/SurpriseRouletteOverlay.tsx',
  'components/kitchen/KitchenJourneyView.tsx',
  'components/kitchen/KitchenStoriesView.tsx',
  'components/meal-plan/CompactMealView.tsx',
  'components/meal-plan/EditorialMealPlanIntro.tsx',
  'components/meal-plan/GoalModeSelector.tsx',
  'components/meal-plan/MealCardSkeleton.tsx',
  'components/meal-plan/MealSnackSelectorModal.tsx',
  'components/meal-plan/NutritionProgressRing.tsx',
  'components/meal-plan/QuickActionsBar.tsx',
  'components/meal-plan/SaveTemplateModal.tsx',
  'components/meal-plan/ShoppingListNameModal.tsx',
  'components/meal-plan/SurpriseBadge.tsx',
  'components/meal-plan/ThawingReminders.tsx',
  'components/meal-plan/TimePickerModal.tsx',
  'components/meal-plan/WeeklyCalendarSkeleton.tsx',
  'components/meal-plan/WeeklyNutritionSummary.tsx',
  'components/meal-plan/WheelPicker.tsx',
  // 2026-05-08: pure layout primitives — no semantic content of their
  // own. A11y is on each child the consumer passes in.
  'components/home/LazyMountBoundary.tsx',
  'components/today/DiscoveryStrip.tsx',
]);

const A11Y_PATTERN = /accessibilityLabel|accessibilityRole|accessibilityValue/;
const FRONTEND_ROOT = path.resolve(__dirname, '../..');

function listTsx(dir: string): string[] {
  const fullDir = path.join(FRONTEND_ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        out.push(path.relative(FRONTEND_ROOT, p));
      }
    }
  };
  walk(fullDir);
  return out;
}

function fileHasA11y(rel: string): boolean {
  const full = path.join(FRONTEND_ROOT, rel);
  const src = fs.readFileSync(full, 'utf-8');
  return A11Y_PATTERN.test(src);
}

describe('N8.1 — accessibility coverage cap', () => {
  const allFiles = ROOTS.flatMap(listTsx).sort();

  it('walks at least one file from each root (sanity)', () => {
    for (const root of ROOTS) {
      const matched = allFiles.filter((f) => f.startsWith(root));
      expect(matched.length).toBeGreaterThan(0);
    }
  });

  it('every non-grandfathered file declares accessibilityLabel/Role/Value', () => {
    const violations: string[] = [];
    for (const rel of allFiles) {
      if (GRANDFATHERED.has(rel)) continue;
      if (!fileHasA11y(rel)) violations.push(rel);
    }
    if (violations.length > 0) {
      const list = violations.map((v) => `  - ${v}`).join('\n');
      throw new Error(
        `N8.1 a11y cap: the following files are missing accessibilityLabel/Role:\n${list}\n\n` +
          'Either add accessibility wiring to the render tree, or (if intentional)\n' +
          'add the file to GRANDFATHERED in this test — but only with explicit reason.',
      );
    }
  });

  it('grandfather list does not grow — every entry is still missing a11y', () => {
    // If a grandfathered file gains a11y wiring, REMOVE it from the list
    // (rather than letting the list bloat). This test fails if an entry
    // has been cleaned up but not yet pruned from the list.
    const stillMissing: string[] = [];
    const cleanedUp: string[] = [];
    for (const rel of GRANDFATHERED) {
      const full = path.join(FRONTEND_ROOT, rel);
      if (!fs.existsSync(full)) continue; // file was deleted; harmless
      if (fileHasA11y(rel)) cleanedUp.push(rel);
      else stillMissing.push(rel);
    }
    if (cleanedUp.length > 0) {
      throw new Error(
        `N8.1: these files were cleaned up but are still in the grandfather list — remove them:\n` +
          cleanedUp.map((r) => `  - ${r}`).join('\n'),
      );
    }
    expect(stillMissing.length).toBeGreaterThan(0);
  });
});
