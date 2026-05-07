// frontend/__tests__/constants/colorsParity.test.ts
// ROADMAP 4.0 DS0.5 — assert Colors.ts overlaps with constants/tokens never drift.
// Only the keys with direct token equivalents are checked; legacy domain colors
// (e.g. secondaryRed, tertiaryGreen, macros.*, score.*) are preserved as-is.

import { Colors, DarkColors } from '../../constants/Colors';
import { Brand, Canvas, Ink, Semantic } from '../../constants/tokens';

describe('DS0.5 — Colors ↔ tokens parity (overlapping keys only)', () => {
  describe('light theme', () => {
    it('Colors.primary === Brand.light.base', () => {
      expect(Colors.primary).toBe(Brand.light.base);
    });
    it('Colors.primaryDark === Brand.light.deep', () => {
      expect(Colors.primaryDark).toBe(Brand.light.deep);
    });
    it('Colors.success/warning/error/info === Semantic.light.*', () => {
      expect(Colors.success).toBe(Semantic.light.success);
      expect(Colors.warning).toBe(Semantic.light.warning);
      expect(Colors.error).toBe(Semantic.light.error);
      expect(Colors.info).toBe(Semantic.light.info);
    });
    it('Colors.background === Canvas.light', () => {
      expect(Colors.background).toBe(Canvas.light);
    });
    it('Colors.surface === Canvas.warmLight (warm-cream legacy default)', () => {
      expect(Colors.surface).toBe(Canvas.warmLight);
    });
    it('Colors.text.inverse === Ink.light.inverse', () => {
      expect(Colors.text.inverse).toBe(Ink.light.inverse);
    });
  });

  describe('dark theme', () => {
    it('DarkColors.primary === Brand.dark.base', () => {
      expect(DarkColors.primary).toBe(Brand.dark.base);
    });
    it('DarkColors.primaryDark === Brand.dark.deep', () => {
      expect(DarkColors.primaryDark).toBe(Brand.dark.deep);
    });
    it('DarkColors.success/warning/error/info === Semantic.dark.*', () => {
      expect(DarkColors.success).toBe(Semantic.dark.success);
      expect(DarkColors.warning).toBe(Semantic.dark.warning);
      expect(DarkColors.error).toBe(Semantic.dark.error);
      expect(DarkColors.info).toBe(Semantic.dark.info);
    });
    it('DarkColors.background === Canvas.warmDark (warm cocoa scaffold)', () => {
      expect(DarkColors.background).toBe(Canvas.warmDark);
    });
    it('DarkColors.text.primary === Ink.dark.warm (ivory, never pure white)', () => {
      expect(DarkColors.text.primary).toBe(Ink.dark.warm);
    });
    it('DarkColors.text.inverse === Canvas.warmDark', () => {
      expect(DarkColors.text.inverse).toBe(Canvas.warmDark);
    });
  });
});
