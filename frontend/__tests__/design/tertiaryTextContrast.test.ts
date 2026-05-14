// frontend/__tests__/design/tertiaryTextContrast.test.ts
//
// Guard for the `tertiary` ink tier. WCAG AA body text requires 4.5:1.
// On 2026-05-14 the tokens were darkened (light) / lightened (dark) so
// tertiary clears AA body on canvas + canvas-warm + surface + surface-tint
// in both themes. This test fails fast if a future tweak regresses that.
//
// The broader matrix lives in __tests__/design/contrastTable.test.ts; this
// is the narrowly-scoped pin for the tertiary text token specifically.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contrastRatio } = require('../../scripts/buildContrastTable.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('../../constants/colorTokens.cjs');

const AA_BODY = 4.5;

const LIGHT_SURFACES: Array<[string, string]> = [
  ['canvas', tokens.Canvas.light],
  ['canvas-warm', tokens.Canvas.warmLight],
  ['surface', tokens.Surface.light.base],
  ['surface-tint', tokens.Surface.light.tint],
];

const DARK_SURFACES: Array<[string, string]> = [
  ['canvas', tokens.Canvas.dark],
  ['canvas-warm', tokens.Canvas.warmDark],
  ['surface', tokens.Surface.dark.base],
  ['surface-tint', tokens.Surface.dark.tint],
];

describe('Ink.tertiary — WCAG AA body on primary surfaces', () => {
  describe('light mode', () => {
    it.each(LIGHT_SURFACES)('tertiary on %s clears AA body (4.5:1)', (name, surface) => {
      const ratio = contrastRatio(tokens.Ink.light.tertiary, surface);
      expect({ name, ratio, ink: tokens.Ink.light.tertiary, surface, ok: ratio >= AA_BODY })
        .toMatchObject({ ok: true });
    });
  });

  describe('dark mode', () => {
    it.each(DARK_SURFACES)('tertiary on %s clears AA body (4.5:1)', (name, surface) => {
      const ratio = contrastRatio(tokens.Ink.dark.tertiary, surface);
      expect({ name, ratio, ink: tokens.Ink.dark.tertiary, surface, ok: ratio >= AA_BODY })
        .toMatchObject({ ok: true });
    });
  });
});
