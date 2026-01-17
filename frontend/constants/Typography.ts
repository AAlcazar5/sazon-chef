// Typography constants for Sazon Chef app
// Consistent typography scale for all text elements

import { TextStyle, Platform } from 'react-native';

/**
 * Font family definitions
 * Using system fonts for optimal performance and native feel
 */
export const FontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semibold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
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
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['5xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  } as TextStyle,

  // Page/Screen titles
  h1: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
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

// Type exports
export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
export type TypographyKey = keyof typeof Typography;
