// frontend/__tests__/design/tailwindThemeBinding.test.ts
// ROADMAP 4.0 DS0.1 — verify tailwind.config.js + tokens.ts share a single
// color source (constants/colorTokens.cjs) and never drift apart.

import {
  Canvas,
  Surface,
  Brand,
  PastelTokens,
  AccentTokens,
  Ink,
  Hairline,
  Semantic,
  Backdrop,
} from '../../constants/tokens';

const tailwindConfig = require('../../tailwind.config.js');
const colorTokens = require('../../constants/colorTokens.cjs');

describe('DS0.1 — Tailwind ↔ tokens.ts color binding', () => {
  describe('single source of truth', () => {
    it('tokens.ts re-exports the same Canvas object as colorTokens.cjs', () => {
      expect(Canvas).toBe(colorTokens.Canvas);
    });

    it('tokens.ts re-exports the same Brand object as colorTokens.cjs', () => {
      expect(Brand).toBe(colorTokens.Brand);
    });

    it('tokens.ts re-exports the same Surface / Ink / Hairline / Semantic / Backdrop / PastelTokens / AccentTokens objects', () => {
      expect(Surface).toBe(colorTokens.Surface);
      expect(Ink).toBe(colorTokens.Ink);
      expect(Hairline).toBe(colorTokens.Hairline);
      expect(Semantic).toBe(colorTokens.Semantic);
      expect(Backdrop).toBe(colorTokens.Backdrop);
      expect(PastelTokens).toBe(colorTokens.PastelTokens);
      expect(AccentTokens).toBe(colorTokens.AccentTokens);
    });
  });

  describe('tailwind.config.js consumes colorTokens.cjs (no parallel hex)', () => {
    const tw = tailwindConfig.theme.extend.colors;

    it('canvas mirrors Canvas tokens', () => {
      expect(tw.canvas.DEFAULT).toBe(Canvas.light);
      expect(tw.canvas.dark).toBe(Canvas.dark);
      expect(tw.canvas.warm).toBe(Canvas.warmLight);
      expect(tw.canvas['warm-dark']).toBe(Canvas.warmDark);
    });

    it('brand mirrors Brand tokens', () => {
      expect(tw.brand.DEFAULT).toBe(Brand.light.base);
      expect(tw.brand.dark).toBe(Brand.dark.base);
      expect(tw.brand.deep).toBe(Brand.light.deep);
      expect(tw.brand['deep-dark']).toBe(Brand.dark.deep);
      expect(tw.brand.soft).toBe(Brand.light.soft);
      expect(tw.brand['soft-dark']).toBe(Brand.dark.soft);
      expect(tw.brand.ink).toBe(Brand.light.ink);
      expect(tw.brand['ink-dark']).toBe(Brand.dark.ink);
    });

    it('surface mirrors Surface tokens', () => {
      expect(tw.surface.DEFAULT).toBe(Surface.light.base);
      expect(tw.surface.dark).toBe(Surface.dark.base);
      expect(tw.surface.tint).toBe(Surface.light.tint);
      expect(tw.surface['tint-dark']).toBe(Surface.dark.tint);
      expect(tw.surface.raised).toBe(Surface.light.raised);
      expect(tw.surface['raised-dark']).toBe(Surface.dark.raised);
      expect(tw.surface.overlay).toBe(Surface.light.overlay);
      expect(tw.surface['overlay-dark']).toBe(Surface.dark.overlay);
    });

    it('pastel mirrors PastelTokens.light', () => {
      const pastelKeys: Array<keyof typeof PastelTokens.light> = [
        'sage',
        'golden',
        'lavender',
        'peach',
        'sky',
        'blush',
        'orange',
        'red',
      ];
      for (const k of pastelKeys) {
        expect(tw.pastel[k]).toBe(PastelTokens.light[k]);
      }
    });

    it('accent mirrors AccentTokens', () => {
      const accentKeys: Array<keyof typeof AccentTokens> = ['sage', 'golden', 'lavender', 'peach', 'sky', 'blush'];
      for (const k of accentKeys) {
        expect(tw.accent[k]).toBe(AccentTokens[k]);
      }
    });

    it('ink mirrors Ink tokens', () => {
      expect(tw.ink.primary).toBe(Ink.light.primary);
      expect(tw.ink['primary-dark']).toBe(Ink.dark.primary);
      expect(tw.ink.secondary).toBe(Ink.light.secondary);
      expect(tw.ink['secondary-dark']).toBe(Ink.dark.secondary);
      expect(tw.ink.tertiary).toBe(Ink.light.tertiary);
      expect(tw.ink['tertiary-dark']).toBe(Ink.dark.tertiary);
      expect(tw.ink.inverse).toBe(Ink.light.inverse);
      expect(tw.ink['inverse-dark']).toBe(Ink.dark.inverse);
      expect(tw.ink.warm).toBe(Ink.light.warm);
      expect(tw.ink['warm-dark']).toBe(Ink.dark.warm);
    });

    it('hairline mirrors Hairline tokens', () => {
      expect(tw.hairline.DEFAULT).toBe(Hairline.light.hairline);
      expect(tw.hairline.dark).toBe(Hairline.dark.hairline);
      expect(tw.hairline.soft).toBe(Hairline.light.soft);
      expect(tw.hairline['soft-dark']).toBe(Hairline.dark.soft);
      expect(tw.hairline.strong).toBe(Hairline.light.strong);
      expect(tw.hairline['strong-dark']).toBe(Hairline.dark.strong);
    });
  });

  describe('drift detection — no inline hex in DS0 token namespaces', () => {
    // Verifies that the migrated token namespaces in tailwind.config.js are
    // *all* string-equal to a value sourced from colorTokens.cjs. If a future
    // edit drops a literal hex into tw.brand.* etc., this test catches it.
    const tw = tailwindConfig.theme.extend.colors;
    const allTokenValues = new Set<string>();
    const collect = (obj: unknown): void => {
      if (typeof obj === 'string') {
        allTokenValues.add(obj);
      } else if (obj && typeof obj === 'object') {
        for (const v of Object.values(obj as Record<string, unknown>)) collect(v);
      }
    };
    collect(colorTokens);

    const namespacesMustComeFromTokens = ['canvas', 'surface', 'brand', 'pastel', 'accent', 'ink', 'hairline'] as const;

    it.each(namespacesMustComeFromTokens)('every value in tw.%s comes from colorTokens.cjs', (ns) => {
      const branch = tw[ns] as Record<string, string>;
      for (const [key, value] of Object.entries(branch)) {
        expect({ ns, key, value, fromTokens: allTokenValues.has(value) }).toEqual({
          ns,
          key,
          value,
          fromTokens: true,
        });
      }
    });
  });
});
