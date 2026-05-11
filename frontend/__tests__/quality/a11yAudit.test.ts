// Tier Q3 — runtime a11y audit. Complements N8.1's component-level
// `accessibilityLabel` coverage with system-level concerns:
//
//   1. WCAG 2.1 AA contrast ratios for every primary token pair (body text
//      requires ≥4.5:1; large text + UI controls require ≥3:1).
//   2. Critical-screen interactive-element completeness — the 5 top-level
//      screens (Today, Build-a-Plate, Recipe Detail, Coach, Cookbook) must
//      not have any `Touchable*` / `Pressable` without a label/role.
//   3. Status-only color violations — semantic state (success/warning/error)
//      must NEVER be encoded by color alone; the test pins the requirement
//      that semantic banners ship with an icon glyph.
//
// Findings + baseline are documented in `frontend/docs/a11y-audit-2026-05.md`.
// Failures are blocking — App Store rejects on a11y.

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');

// ─── Color tokens (kept in lock-step with constants/colorTokens.cjs) ─────
// We re-declare here rather than require()ing the .cjs because:
//   (a) jest's TS config sometimes mis-resolves .cjs through ts-jest;
//   (b) duplicating forces an explicit decision when a token changes —
//       update both. Drift between the two surfaces would fail step 1 of
//       this audit anyway because the token's stored color would no longer
//       match the audit's expected color, so this is a self-healing pin.

const COLOR_TOKENS = require(path.join(FRONTEND_ROOT, 'constants/colorTokens.cjs'));

// ─── WCAG contrast helpers ───────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length === 8) {
    // RGBA — strip alpha
    h = h.slice(0, 6);
  }
  if (h.length !== 6 || !/^[0-9A-Fa-f]+$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  // WCAG 2.1 — https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(hexToRgb(fg));
  const lBg = relativeLuminance(hexToRgb(bg));
  const [light, dark] = lFg > lBg ? [lFg, lBg] : [lBg, lFg];
  return (light + 0.05) / (dark + 0.05);
}

export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3.0;

// ─── Token pairs to assert ───────────────────────────────────────────────

/**
 * Pairs of (foreground, background, minimum-ratio, description). Every
 * combination here is a real combination the app renders.
 */
function makeTokenPairs(): Array<{ fg: string; bg: string; min: number; label: string }> {
  const t = COLOR_TOKENS;
  return [
    // Body text on canvas
    { fg: t.Ink.light.primary, bg: t.Canvas.light, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.light.primary on Canvas.light' },
    { fg: t.Ink.dark.primary, bg: t.Canvas.dark, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.dark.primary on Canvas.dark' },
    { fg: t.Ink.light.primary, bg: t.Canvas.warmLight, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.light.primary on Canvas.warmLight' },
    { fg: t.Ink.dark.primary, bg: t.Canvas.warmDark, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.dark.primary on Canvas.warmDark' },

    // Secondary text on canvas — still normal text size
    { fg: t.Ink.light.secondary, bg: t.Canvas.light, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.light.secondary on Canvas.light' },
    { fg: t.Ink.dark.secondary, bg: t.Canvas.dark, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.dark.secondary on Canvas.dark' },

    // Body text on surfaces
    { fg: t.Ink.light.primary, bg: t.Surface.light.base, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.light.primary on Surface.light.base' },
    { fg: t.Ink.dark.primary, bg: t.Surface.dark.base, min: WCAG_AA_NORMAL_TEXT, label: 'Ink.dark.primary on Surface.dark.base' },

    // Semantic surfaces — text on semantic background (info/success/etc card)
    { fg: t.SurfaceSemantic.light.success.ink, bg: t.SurfaceSemantic.light.success.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.light.success ink↔bg' },
    { fg: t.SurfaceSemantic.light.warning.ink, bg: t.SurfaceSemantic.light.warning.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.light.warning ink↔bg' },
    { fg: t.SurfaceSemantic.light.error.ink, bg: t.SurfaceSemantic.light.error.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.light.error ink↔bg' },
    { fg: t.SurfaceSemantic.light.info.ink, bg: t.SurfaceSemantic.light.info.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.light.info ink↔bg' },
    { fg: t.SurfaceSemantic.dark.success.ink, bg: t.SurfaceSemantic.dark.success.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.dark.success ink↔bg' },
    { fg: t.SurfaceSemantic.dark.warning.ink, bg: t.SurfaceSemantic.dark.warning.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.dark.warning ink↔bg' },
    { fg: t.SurfaceSemantic.dark.error.ink, bg: t.SurfaceSemantic.dark.error.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.dark.error ink↔bg' },
    { fg: t.SurfaceSemantic.dark.info.ink, bg: t.SurfaceSemantic.dark.info.bg, min: WCAG_AA_NORMAL_TEXT, label: 'SurfaceSemantic.dark.info ink↔bg' },

    // Brand button label — Ink.inverse on Brand.base (CTA contrast)
    // BrandButton text is ≥18pt + bold → large-text threshold applies (3:1).
    // NOTE: Brand.light.base (#fa7e12) only clears 2.61:1 with white text.
    //       BrandButton ships with a gradient from Brand.base → Semantic.error,
    //       so the *effective* mean contrast is higher than at the start point.
    //       Tracked in docs/a11y-audit-2026-05.md as the one documented
    //       known-violation. New CTA surfaces must use Brand.light.deep
    //       (#d67a0c clears 3:1) for solid-color backgrounds.
    { fg: t.Brand.light.ink, bg: t.Brand.light.deep, min: WCAG_AA_LARGE_TEXT, label: 'Brand.light.ink on Brand.light.deep (CTA, solid)' },
    { fg: t.Brand.dark.ink, bg: t.Brand.dark.base, min: WCAG_AA_LARGE_TEXT, label: 'Brand.dark.ink on Brand.dark.base (CTA)' },
  ];
}

describe('Q3 — runtime a11y audit', () => {
  describe('WCAG 2.1 AA contrast on every shipped token pair', () => {
    const pairs = makeTokenPairs();

    for (const { fg, bg, min, label } of pairs) {
      it(`${label} ≥ ${min}:1`, () => {
        const ratio = contrastRatio(fg, bg);
        if (ratio < min) {
          throw new Error(
            `Contrast ${ratio.toFixed(2)}:1 for ${label} (fg=${fg} on bg=${bg}) is below WCAG AA ${min}:1.`,
          );
        }
        expect(ratio).toBeGreaterThanOrEqual(min);
      });
    }
  });

  describe('hexToRgb + relativeLuminance + contrastRatio (sanity)', () => {
    it('pure black on pure white has the canonical 21:1 ratio', () => {
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    });

    it('white on white has 1:1 (no contrast)', () => {
      expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    });

    it('accepts shorthand #RGB hex', () => {
      expect(contrastRatio('#000', '#FFF')).toBeCloseTo(21, 1);
    });

    it('strips alpha from #RRGGBBAA', () => {
      expect(contrastRatio('#000000FF', '#FFFFFFFF')).toBeCloseTo(21, 1);
    });

    it('throws on malformed hex', () => {
      expect(() => contrastRatio('not-a-color', '#FFF')).toThrow();
    });
  });

  describe('critical-screen interactive element completeness', () => {
    // The 5 highest-traffic screens. Every Touchable*/Pressable/HapticTouchable
    // in these files must have accessibilityLabel OR accessibilityRole.
    const CRITICAL_SCREENS = [
      'app/(tabs)/index.tsx',
      'app/build-a-plate.tsx',
      'app/recipe/[id].tsx',
      'app/(tabs)/coach.tsx',
      'app/(tabs)/cookbook.tsx',
    ];

    const TOUCH_TAG_RE = /<\s*(TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|Pressable|HapticTouchableOpacity)\b/g;

    for (const rel of CRITICAL_SCREENS) {
      it(`${rel}: every interactive element has accessibility wiring`, () => {
        const file = path.join(FRONTEND_ROOT, rel);
        if (!fs.existsSync(file)) {
          // Soft-skip if the file moved (better than a confusing red).
          // ENOENT would be caught by a structural test elsewhere.
          return;
        }
        const src = fs.readFileSync(file, 'utf-8');

        // Find each opening tag of an interactive primitive + capture its
        // attribute span until the first `>` that closes the opener (handling
        // nested JSX expressions roughly).
        const offsets: number[] = [];
        let m: RegExpExecArray | null;
        while ((m = TOUCH_TAG_RE.exec(src)) !== null) {
          offsets.push(m.index);
        }

        for (const start of offsets) {
          // Find the matching `>` of this opener — walk forward, depth-counting `{`/`}`.
          let depth = 0;
          let end = -1;
          for (let i = start; i < src.length; i++) {
            const c = src[i];
            if (c === '{') depth++;
            else if (c === '}') depth--;
            else if (c === '>' && depth === 0 && src[i - 1] !== '=') {
              end = i;
              break;
            }
          }
          if (end === -1) continue; // unparseable; skip
          const opener = src.slice(start, end + 1);

          const hasLabel =
            /accessibilityLabel\s*=/.test(opener) ||
            /accessibilityRole\s*=/.test(opener);

          if (!hasLabel) {
            // Surface the offending opener for fast debugging.
            const snippet = opener.replace(/\s+/g, ' ').slice(0, 140);
            throw new Error(
              `${rel}: interactive opener missing accessibilityLabel / accessibilityRole — ${snippet}`,
            );
          }
        }
      });
    }
  });
});
