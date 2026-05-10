// Synthesized design tokens — RN-accessible mirror of the Tailwind / CSS-var system.
// See frontend/design.md for philosophy + rationale.
//
// Lead: Airbnb. Layered: Duolingo (joy), Apple (typography/elevation), Uber (canvas).
// Additive: existing constants/Colors.ts, Typography.ts, Spacing.ts, Shadows.ts remain valid.
//
// Use these tokens in StyleSheet, Animated, and any RN style object that can't reach Tailwind.

import { Platform, TextStyle } from 'react-native';
// Color tokens are sourced from a single CJS file so tailwind.config.js
// (CommonJS, no TS loader) and tokens.ts share one definition. See DS0.1.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const colorTokens = require('./colorTokens.cjs');

// ─── Canvas (sharp B&W stage) ────────────────────────────────────────────
export const Canvas = colorTokens.Canvas as {
  readonly light: string;
  readonly dark: string;
  readonly warmLight: string;
  readonly warmDark: string;
};

// ─── Surfaces ────────────────────────────────────────────────────────────
export const Surface = colorTokens.Surface as {
  readonly light: { readonly base: string; readonly raised: string; readonly overlay: string; readonly tint: string };
  readonly dark: { readonly base: string; readonly raised: string; readonly overlay: string; readonly tint: string };
};

// ─── Brand (single coral accent) ─────────────────────────────────────────
export const Brand = colorTokens.Brand as {
  readonly light: { readonly base: string; readonly deep: string; readonly soft: string; readonly ink: string };
  readonly dark: { readonly base: string; readonly deep: string; readonly soft: string; readonly ink: string };
};

// ─── Pastel performers ───────────────────────────────────────────────────
type PastelKey = 'sage' | 'golden' | 'lavender' | 'peach' | 'sky' | 'blush' | 'orange' | 'red';
export const PastelTokens = colorTokens.PastelTokens as {
  readonly light: Readonly<Record<PastelKey, string>>;
  readonly dark: Readonly<Record<PastelKey, string>>;
};

type AccentKey = 'sage' | 'golden' | 'lavender' | 'peach' | 'sky' | 'blush';
export const AccentTokens = colorTokens.AccentTokens as Readonly<Record<AccentKey, string>>;

// ─── Ink (text scale) ────────────────────────────────────────────────────
type InkBranch = { readonly primary: string; readonly secondary: string; readonly tertiary: string; readonly inverse: string; readonly warm: string };
export const Ink = colorTokens.Ink as { readonly light: InkBranch; readonly dark: InkBranch };

// ─── Hairline borders (last resort, never decorative) ────────────────────
type HairlineBranch = { readonly hairline: string; readonly soft: string; readonly strong: string };
export const Hairline = colorTokens.Hairline as { readonly light: HairlineBranch; readonly dark: HairlineBranch };

// ─── Semantic ────────────────────────────────────────────────────────────
type SemanticBranch = { readonly success: string; readonly warning: string; readonly error: string; readonly info: string };
export const Semantic = colorTokens.Semantic as { readonly light: SemanticBranch; readonly dark: SemanticBranch };

// ─── Semantic surfaces (DS3.2) ───────────────────────────────────────────
type SurfaceSemanticEntry = { readonly bg: string; readonly border: string; readonly ink: string };
type SurfaceSemanticBranch = { readonly success: SurfaceSemanticEntry; readonly warning: SurfaceSemanticEntry; readonly error: SurfaceSemanticEntry; readonly info: SurfaceSemanticEntry };
export const SurfaceSemantic = colorTokens.SurfaceSemantic as { readonly light: SurfaceSemanticBranch; readonly dark: SurfaceSemanticBranch };

// ─── Chart palette (DS3.1) ───────────────────────────────────────────────
type ChartBranch = { readonly series: readonly string[] };
export const Chart = colorTokens.Chart as { readonly light: ChartBranch; readonly dark: ChartBranch };

// ─── Frost (DS3.3) ───────────────────────────────────────────────────────
export const Frost = colorTokens.Frost as {
  readonly intensity: number;
  readonly bg: { readonly light: string; readonly dark: string };
  readonly border: { readonly light: string; readonly dark: string };
};

// ─── Skeleton (DS3.4) ────────────────────────────────────────────────────
export const Skeleton = colorTokens.Skeleton as {
  readonly bg: { readonly light: string; readonly dark: string };
  readonly shimmer: { readonly light: string; readonly dark: string };
  readonly durationMs: number;
  readonly easing: 'linear';
};

// ─── ImageState (DS3.5) ──────────────────────────────────────────────────
export const ImageState = colorTokens.ImageState as {
  readonly placeholder: { readonly bg: { readonly light: string; readonly dark: string } };
  readonly fallback: { readonly mascot: string };
  readonly error: { readonly bg: { readonly light: string; readonly dark: string }; readonly mascot: string };
};

// ─── Spacing — 4px base, generous Apple/Headspace breathing room ─────────
export const Space = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '30': 120,
  '36': 144,
  '48': 192,
} as const;

export const Layout = {
  screenPx: 20,
  cardPx: 16,
  cardPxHero: 24,
  cardGap: 12,
  sectionGap: 48,
  heroGap: 80,
  maxWidth: 1200,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  input: 14,
  lg: 16,
  card: 20, // Airbnb signature
  '2xl': 24,
  sheet: 28,
  hero: 36,
  pill: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────
// RN shadows can't compose multiple layers like CSS box-shadow, so we approximate
// the Airbnb layered subtle shadow with a single tuned shadow per level.

interface ShadowBranch {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

const platformShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
  color: string = '#000',
): ShadowBranch =>
  Platform.select<ShadowBranch>({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) ?? {};

export const Elevation = {
  xs: platformShadow(1, 2, 0.04, 1),
  sm: platformShadow(2, 6, 0.06, 2),
  md: platformShadow(4, 12, 0.08, 4),
  lg: platformShadow(8, 20, 0.10, 8),
  xl: platformShadow(16, 32, 0.14, 12),

  // Peak-moment shadow — Duolingo-spirited, sparing.
  // RN can't render `box-shadow: 0 4px 0 X` natively; emulate with a wrapper
  // that has an absolutely-positioned 4px-tall colored element behind the button.
  // Provide the depth + color tokens here for the wrapper component to consume.
  peak: {
    depth: colorTokens.PeakShadow.depth,
    color: colorTokens.PeakShadow.lightColor,
    pressTranslate: colorTokens.PeakShadow.pressTranslate,
  },
  peakDark: {
    depth: colorTokens.PeakShadow.depth,
    color: colorTokens.PeakShadow.darkColor,
    pressTranslate: colorTokens.PeakShadow.pressTranslate,
  },
} as const;

// ─── Backdrop overlays ───────────────────────────────────────────────────
export const Backdrop = colorTokens.Backdrop as {
  readonly light: string;
  readonly heavy: string;
  readonly lightDark: string;
  readonly heavyDark: string;
};

// ─── Typography ──────────────────────────────────────────────────────────
// Apple-style negative letter-spacing curve. Family follows existing
// EditorialFontFamily from Typography.ts (Fraunces display + Plus Jakarta body).

export const Type = {
  // Eyebrow — uppercase, wide-tracked label above a title
  eyebrow: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    lineHeight: 11 * 1.4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  caption: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 12 * 1.4,
    letterSpacing: 0.3,
  } as TextStyle,
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    lineHeight: 13 * 1.35,
    letterSpacing: 0.2,
  } as TextStyle,
  bodySm: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    lineHeight: 14 * 1.45,
    letterSpacing: 0,
  } as TextStyle,
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    lineHeight: 15 * 1.5,
    letterSpacing: 0,
  } as TextStyle,
  bodyLg: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 17,
    lineHeight: 17 * 1.45,
    letterSpacing: -0.1,
  } as TextStyle,
  title: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    lineHeight: 18 * 1.35,
    letterSpacing: -0.1,
  } as TextStyle,
  subheading: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    lineHeight: 20 * 1.3,
    letterSpacing: -0.2,
  } as TextStyle,
  headingSm: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 22 * 1.25,
    letterSpacing: -0.3,
  } as TextStyle,
  heading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    lineHeight: 26 * 1.2,
    letterSpacing: -0.4,
  } as TextStyle,
  headingLg: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    lineHeight: 32 * 1.15,
    letterSpacing: -0.6,
  } as TextStyle,
  // DS2.5 — Fraunces stylistic-set ss01 (alternate g) was originally enabled
  // on display sizes for the Clay-inspired editorial flourish, but RN's
  // TextStyle.fontVariant doesn't accept OpenType `ss01`. Field dropped
  // until we wire a font-loader-side feature flag. Body unchanged.
  displayMd: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 44,
    lineHeight: 44 * 1.05,
    letterSpacing: -0.9,
  } as TextStyle,
  displayLg: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 56,
    lineHeight: 56 * 1.05,
    letterSpacing: -1.4,
  } as TextStyle,
  display: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 80,
    lineHeight: 80 * 1.0,
    letterSpacing: -2.4,
  } as TextStyle,
  // Stat numbers — DS5.4 — tabular figures so column-aligned numbers don't
  // shimmy. `123` and `222` render at the same width.
  stat: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    lineHeight: 24 * 1.1,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statDisplay: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 40,
    lineHeight: 40 * 1.0,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statHero: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 56,
    lineHeight: 56 * 1.0,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

// ─── Focus state (DS1.2) ─────────────────────────────────────────────────
// Keyboard focus ring (web + tvOS); touch focus highlight (mobile press tint).
// Consumers: BrandButton, FilterChip, Card (when interactive), Input, TabButton.
export const Focus = {
  ring: {
    width: 2,
    color: 'light' as 'light' | 'dark' | 'auto',
    offset: 2,
    radiusBeyond: 8,
  },
  highlight: {
    // 4% brand-soft tint on press; 100ms enter, instant leave.
    opacity: 0.04,
    durationMs: 100,
  },
} as const;

// ─── Motion ──────────────────────────────────────────────────────────────
export const Motion = {
  duration: {
    instant: 100,
    quick: 200,
    standard: 300,
    modal: 450,
    peak: 600,
  },
  spring: {
    default: { damping: 20, stiffness: 220 },
    bouncy: { damping: 14, stiffness: 200 }, // peak moments — overshoots
    stiff: { damping: 24, stiffness: 280 }, // chrome
  },
  press: {
    scale: 0.97,
    duration: 100,
  },
  // ─── DS6 — choreography patterns ──────────────────────────────────────
  // Each entry codifies a multi-step interaction so engineers don't
  // hand-compose ad-hoc transitions. See docs/design-decisions/DS6-motion.md.
  modal: {
    enter: {
      opacity: { from: 0, to: 1, duration: 200, easing: 'ease-out' as const },
      scale: { from: 0.96, to: 1.0, spring: { damping: 18, stiffness: 220 } },
    },
    exit: {
      opacity: { from: 1, to: 0, duration: 150, easing: 'ease-in' as const },
      // Note: no scale on exit — feels lighter, less theatrical.
    },
  },
  bottomSheet: {
    drag: {
      rubberBandBeyondOpen: true,
      dismissThresholdPct: 0.3, // release ≥30% of travel to dismiss
      flickVelocityPxPerS: 1500, // > this velocity always dismisses
      dismissDurationMs: 250,
    },
  },
  listReorder: {
    // HX2.1 hero re-roll, FX3.1 filter change — bouncy spring communicates
    // "Sazon re-thought this for you."
    spring: { damping: 14, stiffness: 200 },
  },
  pageTransition: {
    // Override Expo Router default (right-to-left iOS, fade Android) with a
    // unified slide so iOS + Android feel like one product.
    animation: 'slide_from_right' as const,
    durationMs: 300,
  },
} as const;

// ─── Card density (DS4.5) ────────────────────────────────────────────────
// Three densities for different surfaces. `feed` is the default; `hero` for
// editorial above-the-fold cards; `inline` for chips and compact lists.
export const Card = {
  density: {
    feed: { padding: 16, gap: 12 },
    hero: { padding: 24, gap: 16 },
    inline: { padding: 12, gap: 8 },
  },
} as const;

// ─── Theme picker helper ─────────────────────────────────────────────────
export type Theme = 'light' | 'dark';

export const pickTheme = <T extends { light: unknown; dark: unknown }>(
  token: T,
  theme: Theme,
): T['light'] | T['dark'] => (theme === 'dark' ? token.dark : token.light);

// Type exports
export type SpaceKey = keyof typeof Space;
export type RadiusKey = keyof typeof Radius;
export type TypeKey = keyof typeof Type;
