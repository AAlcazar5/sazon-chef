// frontend/__tests__/constants/CategoryColorsContrast.test.ts
//
// WCAG AA contrast guard for CATEGORY_COLORS.
//
// FilterPill (active state) and home QuickFiltersBar's FilterChip both render
// `text` on `bg` (light mode) or `textDark` on `bgDark` (dark mode). User
// reported home + cookbook chips with text that was hard to read — the cause
// is a handful of category pairings (orange/yellow text on pale-yellow bg)
// that fall well short of 4.5:1.
//
// This test asserts the full matrix passes. If a future palette tweak
// introduces a low-contrast pair, this fails before it ships.

import { CATEGORY_COLORS } from '../../constants/CategoryColors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contrastRatio } = require('../../scripts/buildContrastTable.cjs');

const MIN_RATIO = 4.5; // WCAG AA for normal text (chip labels are 11-14pt)

describe('CATEGORY_COLORS — WCAG AA contrast', () => {
  const entries = Object.entries(CATEGORY_COLORS);

  it.each(entries)('%s — light mode text on bg passes AA', (name, color) => {
    const ratio = contrastRatio(color.text, color.bg);
    expect({ name, ratio, mode: 'light', text: color.text, bg: color.bg, ok: ratio >= MIN_RATIO })
      .toMatchObject({ ok: true });
  });

  it.each(entries)('%s — dark mode textDark on bgDark passes AA', (name, color) => {
    const ratio = contrastRatio(color.textDark, color.bgDark);
    expect({ name, ratio, mode: 'dark', text: color.textDark, bg: color.bgDark, ok: ratio >= MIN_RATIO })
      .toMatchObject({ ok: true });
  });
});
