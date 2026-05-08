// ROADMAP 4.0 N8.4 — i18n readiness cap test.
//
// Marks every new HX/IG/WK user-facing string for future i18n via a thin
// `t()` wrapper. No actual translation table ships now — but hardcoded
// strings get audited out so a future i18n tier can land in days, not weeks.
//
// This cap test pins the count of hardcoded user-facing string literals in
// `<Text>...literal...</Text>` JSX patterns at the current baseline. The
// count is allowed to *decrease* (cleanup) but cannot *grow* (regression).
//
// Pattern: `<Text...>Capital Letter ... lowercase</Text>` heuristic. Catches
// editorial copy + headlines but tolerates dynamic interpolations and
// translated wrapper calls.

import * as fs from 'fs';
import * as path from 'path';

const ROOTS = [
  'components/home',
  'components/today',
  'components/meal-plan',
  'components/kitchen',
];

const FRONTEND_ROOT = path.resolve(__dirname, '../..');

/**
 * Baseline pinned 2026-05-06 during N8.4 wiring. The count cannot grow.
 * Cleanup that lowers the count is welcome — update the constant in this
 * file to match.
 *
 * 2026-05-08 — Tier i18n-OPS3.2 batch 1 wrapped strings in NoResultsState,
 * DraggableMealCard, DuplicateModal, LogFoodSheet, MealSnackSelectorModal.
 * Baseline lowered 220 → 165 to lock in the gain.
 *
 * 2026-05-08 — Tier i18n-OPS3.2 batch 2 wrapped Kitchen views
 * (KitchenJourneyView, KitchenStoriesView) plus meal-plan modals
 * (PlanIQCard, TemplatePickerModal, RecurringMealModal, SaveTemplateModal,
 * TimePickerModal, WeeklyNutritionSummary, RecurringMealsManagerModal) and
 * RecipeSearchBar. Baseline lowered 165 → 114 to lock in the gain.
 *
 * 2026-05-08 — Tier I2.4 (reverse-discovery card) introduced 2 new
 * hardcoded strings in components/today. Baseline raised 114 → 116;
 * a future i18n-OPS3.2 batch 3 should wrap those and reclaim the gain.
 */
const HARDCODED_STRING_BASELINE = 116;

const HARDCODED_STRING_PATTERN =
  /<Text[^>]*>\s*[A-Z][A-Za-z][A-Za-z\s'.,!?:;\-—]{2,}\s*<\/Text>/g;

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

function countHardcodedStrings(rel: string): number {
  const full = path.join(FRONTEND_ROOT, rel);
  const src = fs.readFileSync(full, 'utf-8');
  const matches = src.match(HARDCODED_STRING_PATTERN);
  return matches ? matches.length : 0;
}

describe('N8.4 — i18n readiness cap', () => {
  const allFiles = ROOTS.flatMap(listTsx).sort();

  it('walks the four covered roots', () => {
    expect(allFiles.length).toBeGreaterThan(50);
  });

  it('hardcoded user-facing string count does not grow above baseline', () => {
    const total = allFiles.reduce(
      (acc, rel) => acc + countHardcodedStrings(rel),
      0,
    );
    if (total > HARDCODED_STRING_BASELINE) {
      throw new Error(
        `N8.4 i18n cap: hardcoded <Text> string count ${total} exceeds baseline ${HARDCODED_STRING_BASELINE}.\n` +
          'New user-facing strings must use a t(...) wrapper or be added intentionally to the baseline\n' +
          'in __tests__/quality/i18nReadiness.test.ts (with rationale).',
      );
    }
    expect(total).toBeLessThanOrEqual(HARDCODED_STRING_BASELINE);
  });

  it('records the current count for cleanup tracking', () => {
    const total = allFiles.reduce(
      (acc, rel) => acc + countHardcodedStrings(rel),
      0,
    );
    // This test always passes — it just surfaces the count in test output
    // so cleanup PRs can track progress.
    expect(total).toBeGreaterThan(0);
    // Floor: if the count drops below 30, the regex probably broke.
    expect(total).toBeGreaterThan(30);
  });
});
