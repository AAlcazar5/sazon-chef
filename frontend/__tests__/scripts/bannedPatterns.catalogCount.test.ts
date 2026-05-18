// W-D1 no-recipe-count law (D-7) — guards CATALOG_COUNT_RE so user-facing
// catalog counts / paginator denominators can never re-enter the codebase
// without tripping the banned-patterns scanner.
import { CATALOG_COUNT_RE } from '../../scripts/banned-patterns';

describe('CATALOG_COUNT_RE (W-D1 no-recipe-count)', () => {
  it.each([
    '1–11 OF 11954 RECIPES',
    'Found 12 recipes matching "tzatziki"',
    'showing 1 of 1087 pages',
    'of 11954 recipes',
    '5 recipes available',
    '240 recipes found',
  ])('flags user-facing catalog count: %s', (copy) => {
    expect(CATALOG_COUNT_RE.test(copy)).toBe(true);
  });

  it.each([
    'You batch-cook — Sazon’s biasing prep-friendly tonight.',
    'Made it 3 times this month',
    'of 4 ingredients you have on hand',
    'Page turner — swipe for more',
    '12 cooks logged',
  ])('does not false-positive on benign copy: %s', (copy) => {
    expect(CATALOG_COUNT_RE.test(copy)).toBe(false);
  });
});
