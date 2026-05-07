// Typography constants for Sazon Chef app
// Consistent typography scale for all text elements

import { TextStyle } from 'react-native';
import {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  Fraunces_300Light_Italic,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold_Italic,
  Fraunces_800ExtraBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

/**
 * Font family definitions.
 *
 * DS2.4 — Plus Jakarta everywhere, no Platform.select fallbacks. Brand voice
 * (consistency) wins over native-feel (Material 3 / iOS system font) for a
 * lifestyle app. See docs/design-decisions/DS2.4-font-decision.md.
 *
 * Until Plus Jakarta is loaded via `useFonts(...)`, RN falls back to the
 * platform default — no special handling needed.
 */
export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  /** @deprecated Use FontFamily.regular. Retained as a brand-consistent alias. */
  system: 'PlusJakartaSans_400Regular',
} as const;

/**
 * Font weight definitions
 */
export const FontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
} as const;

/**
 * Font size scale (in pixels)
 */
export const FontSize = {
  /** 10px - Extra small (badges, captions) */
  xs: 10,
  /** 12px - Small (labels, hints) */
  sm: 12,
  /** 14px - Base (body text, form fields) */
  base: 14,
  /** 16px - Medium (emphasized body, buttons) */
  md: 16,
  /** 18px - Large (subheadings) */
  lg: 18,
  /** 20px - Extra large (section titles) */
  xl: 20,
  /** 24px - Double extra large (screen titles) */
  '2xl': 24,
  /** 28px - Triple extra large (hero titles) */
  '3xl': 28,
  /** 32px - Quadruple extra large (splash titles) */
  '4xl': 32,
  /** 36px - Display size */
  '5xl': 36,
  /** 32px - Display numbers (profile stats, macro numbers, Sazon Score) */
  display: 32,
  /** 40px - Hero titles (screen headers, key numbers) */
  hero: 40,
} as const;

/**
 * Line height scale (multipliers of font size)
 */
export const LineHeight = {
  /** Tight - 1.1x (headings) */
  tight: 1.1,
  /** Snug - 1.25x (subheadings) */
  snug: 1.25,
  /** Normal - 1.4x (body text) */
  normal: 1.4,
  /** Relaxed - 1.5x (readable paragraphs) */
  relaxed: 1.5,
  /** Loose - 1.75x (large text blocks) */
  loose: 1.75,
} as const;

/**
 * Letter spacing scale (in pixels)
 */
export const LetterSpacing = {
  /** Tight - -0.5px */
  tight: -0.5,
  /** Normal - 0 */
  normal: 0,
  /** Wide - 0.5px */
  wide: 0.5,
  /** Wider - 1px */
  wider: 1,
} as const;

/**
 * Typography presets
 * Pre-defined text styles for common use cases
 */
export const Typography = {
  // Display/Hero text
  display: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.extrabold,
    lineHeight: FontSize.display * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,

  // Hero numbers / splash titles
  hero: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    lineHeight: FontSize.hero * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,

  // Page/Screen titles
  h1: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    lineHeight: FontSize['3xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,

  // Section titles
  h2: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['2xl'] * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Subsection titles
  h3: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xl * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Card titles, emphasized content
  h4: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.lg * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Small headings
  h5: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.md * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Body text (default)
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Larger body text
  bodyLarge: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * LineHeight.relaxed,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Smaller body text
  bodySmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Labels for form fields
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Input text
  input: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Button text
  button: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.md * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  } as TextStyle,

  // Small button text
  buttonSmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  } as TextStyle,

  // Caption text
  caption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Hint/placeholder text
  hint: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Error messages
  error: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Badge/pill text
  badge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  } as TextStyle,

  // Tab bar labels
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Navigation title
  navTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.lg * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  } as TextStyle,

  // Macro/stat values
  stat: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.xl * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,

  // Large stat values
  statLarge: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['2xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,
} as const;

/**
 * Editorial font family definitions (v2 design system)
 * Fraunces = display/serif, Plus Jakarta Sans = body/UI
 */
export const EditorialFontFamily = {
  display: {
    light: 'Fraunces_300Light',
    regular: 'Fraunces_400Regular',
    medium: 'Fraunces_500Medium',
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
    extrabold: 'Fraunces_800ExtraBold',
  },
  displayItalic: {
    light: 'Fraunces_300Light_Italic',
    regular: 'Fraunces_400Regular_Italic',
    medium: 'Fraunces_500Medium_Italic',
    semibold: 'Fraunces_600SemiBold_Italic',
    bold: 'Fraunces_700Bold_Italic',
    extrabold: 'Fraunces_800ExtraBold_Italic',
  },
  body: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
  },
} as const;

/**
 * Editorial typography presets (v2 design system)
 */
export const EditorialTypography = {
  display: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 46,
    letterSpacing: -1.5,
    lineHeight: 46 * 0.98,
  } as TextStyle,

  displayAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 46,
    letterSpacing: -1.5,
    lineHeight: 46 * 0.98,
  } as TextStyle,

  sectionTitle: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 26 * 1.15,
  } as TextStyle,

  sectionAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 26 * 1.15,
  } as TextStyle,

  heroTitle: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 22 * 1.2,
  } as TextStyle,

  statNumber: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 22 * 1.1,
  } as TextStyle,

  recipeDetailTitle: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 38,
    letterSpacing: -1.2,
    lineHeight: 38 * 1.05,
  } as TextStyle,

  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 11 * 1.4,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  body: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 14 * 1.5,
  } as TextStyle,
} as const;

/**
 * Font asset map for expo-font loading.
 * Pass this to `useFonts()` or `Font.loadAsync()` in _layout.tsx.
 */
export const EDITORIAL_FONTS: Record<string, number> = {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  Fraunces_300Light_Italic,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold_Italic,
  Fraunces_800ExtraBold_Italic,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

// Type exports
export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
export type TypographyKey = keyof typeof Typography;
export type EditorialTypographyKey = keyof typeof EditorialTypography;
