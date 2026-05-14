// frontend/__tests__/design/darkPastelTitleContrast.test.ts
//
// Guard for the dark-mode title-on-pastel-dark pairings introduced when fixing
// the "card bg hardcoded light pastel in dark mode" regression (NewToYou,
// BrowseByFamily, RecipeCarousel, CookbookRecipeList, EditorialQuickPicks).
//
// Pairs:
//   text #FFD9B0  on  PastelDark.peach
//   text #C8E6CA  on  PastelDark.sage
//   text #E1BEE7  on  PastelDark.lavender
//   text #BBDEFB  on  PastelDark.sky
//   text #FFECB3  on  PastelDark.golden
//   text #F8BBD0  on  PastelDark.blush
//
// Every pair must clear WCAG AA body (4.5:1).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contrastRatio } = require('../../scripts/buildContrastTable.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('../../constants/colorTokens.cjs');

const AA_BODY = 4.5;

const DARK_TITLE_PAIRS: Array<[string, string, string]> = [
  ['peach',    '#FFD9B0', tokens.PastelTokens.dark.peach],
  ['sage',     '#C8E6CA', tokens.PastelTokens.dark.sage],
  ['lavender', '#E1BEE7', tokens.PastelTokens.dark.lavender],
  ['sky',      '#BBDEFB', tokens.PastelTokens.dark.sky],
  ['golden',   '#FFECB3', tokens.PastelTokens.dark.golden],
  ['blush',    '#F8BBD0', tokens.PastelTokens.dark.blush],
];

describe('Dark-mode pastel-title pairs — WCAG AA body', () => {
  it.each(DARK_TITLE_PAIRS)('%s — title on PastelDark passes AA body (4.5:1)', (name, ink, surface) => {
    const ratio = contrastRatio(ink, surface);
    expect({ name, ratio, ink, surface, ok: ratio >= AA_BODY })
      .toMatchObject({ ok: true });
  });
});
