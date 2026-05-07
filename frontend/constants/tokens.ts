// Synthesized design tokens — RN-accessible mirror of the Tailwind / CSS-var system.
// See frontend/design.md for philosophy + rationale.
//
// Lead: Airbnb. Layered: Duolingo (joy), Apple (typography/elevation), Uber (canvas).
// Additive: existing constants/Colors.ts, Typography.ts, Spacing.ts, Shadows.ts remain valid.
//
// Use these tokens in StyleSheet, Animated, and any RN style object that can't reach Tailwind.

import { Platform, TextStyle } from 'react-native';

// ─── Canvas (sharp B&W stage) ────────────────────────────────────────────
export const Canvas = {
  light: '#FFFFFF',
  dark: '#0A0A0A',
  warmLight: '#FAF7F4', // editorial / hero opt-in
  warmDark: '#1A1410',
} as const;

// ─── Surfaces ────────────────────────────────────────────────────────────
export const Surface = {
  light: {
    base: '#FFFFFF',
    raised: '#FFFFFF',
    overlay: '#FFFFFF',
    tint: '#F8F8F8',
  },
  dark: {
    base: '#141414',
    raised: '#1F1F1F',
    overlay: '#2A2A2A',
    tint: '#1A1A1A',
  },
} as const;

// ─── Brand (single coral accent) ─────────────────────────────────────────
export const Brand = {
  light: {
    base: '#fa7e12',
    deep: '#d67a0c',
    soft: '#FFF0E5',
    ink: '#FFFFFF',
  },
  dark: {
    base: '#FF9559',
    deep: '#E07A40',
    soft: 'rgba(255,149,89,0.14)',
    ink: '#1A1410',
  },
} as const;

// ─── Pastel performers ───────────────────────────────────────────────────
export const PastelTokens = {
  light: {
    sage: '#E8F5E9',
    golden: '#FFF8E1',
    lavender: '#F3E5F5',
    peach: '#FFF3E0',
    sky: '#E3F2FD',
    blush: '#FCE4EC',
    orange: '#FFF0E5',
    red: '#FFF0EE',
  },
  dark: {
    sage: 'rgba(129,199,132,0.12)',
    golden: 'rgba(255,213,79,0.12)',
    lavender: 'rgba(206,147,216,0.12)',
    peach: 'rgba(255,183,77,0.12)',
    sky: 'rgba(100,181,246,0.12)',
    blush: 'rgba(240,98,146,0.12)',
    orange: 'rgba(255,139,65,0.12)',
    red: 'rgba(239,68,68,0.12)',
  },
} as const;

export const AccentTokens = {
  sage: '#81C784',
  golden: '#FFD54F',
  lavender: '#CE93D8',
  peach: '#FFB74D',
  sky: '#64B5F6',
  blush: '#F06292',
} as const;

// ─── Ink (text scale) ────────────────────────────────────────────────────
export const Ink = {
  light: {
    primary: '#0A0A0A',
    secondary: '#525252',
    tertiary: '#8A8A8A',
    inverse: '#FFFFFF',
    warm: '#1d1d1f',
  },
  dark: {
    primary: '#F5F5F5',
    secondary: '#A8A8A8',
    tertiary: '#6B6B6B',
    inverse: '#0A0A0A',
    warm: '#F5EFE6',
  },
} as const;

// ─── Hairline borders (last resort, never decorative) ────────────────────
export const Hairline = {
  light: {
    hairline: 'rgba(10,10,10,0.06)',
    soft: 'rgba(10,10,10,0.10)',
    strong: 'rgba(10,10,10,0.18)',
  },
  dark: {
    hairline: 'rgba(255,255,255,0.08)',
    soft: 'rgba(255,255,255,0.14)',
    strong: 'rgba(255,255,255,0.24)',
  },
} as const;

// ─── Semantic ────────────────────────────────────────────────────────────
export const Semantic = {
  light: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const;

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
    depth: 4,
    color: '#d67a0c',
    pressTranslate: 4,
  },
  peakDark: {
    depth: 4,
    color: '#E07A40',
    pressTranslate: 4,
  },
} as const;

// ─── Backdrop overlays ───────────────────────────────────────────────────
export const Backdrop = {
  light: 'rgba(0,0,0,0.4)',
  heavy: 'rgba(0,0,0,0.7)',
  lightDark: 'rgba(0,0,0,0.6)',
  heavyDark: 'rgba(0,0,0,0.85)',
} as const;

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
  // Stat numbers
  stat: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    lineHeight: 24 * 1.1,
    letterSpacing: -0.4,
  } as TextStyle,
  statDisplay: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 40,
    lineHeight: 40 * 1.0,
    letterSpacing: -0.8,
  } as TextStyle,
  statHero: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 56,
    lineHeight: 56 * 1.0,
    letterSpacing: -1.2,
  } as TextStyle,
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
