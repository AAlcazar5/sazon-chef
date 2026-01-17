// Color Contrast Validation Utility for WCAG Compliance
// Ensures all color combinations meet accessibility standards

import { Colors, DarkColors, TextColors, BackgroundColors } from '../constants/Colors';

/**
 * WCAG 2.1 Contrast Ratio Requirements:
 * - AA Normal Text (< 18pt or < 14pt bold): 4.5:1
 * - AA Large Text (>= 18pt or >= 14pt bold): 3:1
 * - AAA Normal Text: 7:1
 * - AAA Large Text: 4.5:1
 */

export const ContrastRatios = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  if (fullHex.length !== 6) return null;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  // Convert to sRGB
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;

  // Apply gamma correction
  const R = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a ratio like 4.5 or 7.0
 */
export function getContrastRatio(foreground: string, background: string): number {
  const L1 = getRelativeLuminance(foreground);
  const L2 = getRelativeLuminance(background);

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color combination meets WCAG AA for normal text (4.5:1)
 */
export function meetsWCAG_AA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= ContrastRatios.AA_NORMAL;
}

/**
 * Check if a color combination meets WCAG AA for large text (3:1)
 */
export function meetsWCAG_AA_Large(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= ContrastRatios.AA_LARGE;
}

/**
 * Check if a color combination meets WCAG AAA for normal text (7:1)
 */
export function meetsWCAG_AAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= ContrastRatios.AAA_NORMAL;
}

/**
 * Get a human-readable contrast level
 */
export function getContrastLevel(
  foreground: string,
  background: string
): 'fail' | 'AA-large' | 'AA' | 'AAA' {
  const ratio = getContrastRatio(foreground, background);

  if (ratio >= ContrastRatios.AAA_NORMAL) return 'AAA';
  if (ratio >= ContrastRatios.AA_NORMAL) return 'AA';
  if (ratio >= ContrastRatios.AA_LARGE) return 'AA-large';
  return 'fail';
}

/**
 * Suggest a darker or lighter version of a color to meet contrast requirements
 */
export function suggestAccessibleColor(
  foreground: string,
  background: string,
  targetRatio: number = ContrastRatios.AA_NORMAL
): string {
  const currentRatio = getContrastRatio(foreground, background);
  if (currentRatio >= targetRatio) return foreground;

  const rgb = hexToRgb(foreground);
  const bgLuminance = getRelativeLuminance(background);
  if (!rgb) return foreground;

  // Determine if we should darken or lighten
  const shouldDarken = bgLuminance > 0.5;

  let { r, g, b } = rgb;
  const step = shouldDarken ? -5 : 5;
  const limit = shouldDarken ? 0 : 255;

  // Iteratively adjust until we meet the target ratio
  for (let i = 0; i < 51; i++) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));

    const newHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (getContrastRatio(newHex, background) >= targetRatio) {
      return newHex;
    }

    if (r === limit && g === limit && b === limit) break;
  }

  return foreground;
}

// Pre-defined color combinations for the app
export interface ColorCombination {
  name: string;
  foreground: string;
  background: string;
  usage: string;
  ratio: number;
  level: 'fail' | 'AA-large' | 'AA' | 'AAA';
  passes: boolean;
}

/**
 * Audit all app color combinations for WCAG compliance
 * Returns an array of combinations with their contrast ratios
 */
export function auditColorContrast(): {
  light: ColorCombination[];
  dark: ColorCombination[];
} {
  const lightCombinations: ColorCombination[] = [
    // Text on backgrounds
    {
      name: 'Primary Text on Background',
      foreground: Colors.text.primary,
      background: Colors.background,
      usage: 'Main body text',
    },
    {
      name: 'Secondary Text on Background',
      foreground: Colors.text.secondary,
      background: Colors.background,
      usage: 'Labels, descriptions',
    },
    {
      name: 'Tertiary Text on Background',
      foreground: Colors.text.tertiary,
      background: Colors.background,
      usage: 'Hints, placeholders',
    },
    {
      name: 'Primary Text on Surface',
      foreground: Colors.text.primary,
      background: Colors.surface,
      usage: 'Cards, modals',
    },
    {
      name: 'Secondary Text on Surface',
      foreground: Colors.text.secondary,
      background: Colors.surface,
      usage: 'Card descriptions',
    },
    {
      name: 'Tertiary Text on Surface',
      foreground: Colors.text.tertiary,
      background: Colors.surface,
      usage: 'Card hints',
    },
    // Button text
    {
      name: 'White on Primary',
      foreground: '#FFFFFF',
      background: Colors.primary,
      usage: 'Primary button text',
    },
    {
      name: 'White on Secondary',
      foreground: '#FFFFFF',
      background: Colors.secondary,
      usage: 'Secondary button text',
    },
    {
      name: 'White on Error',
      foreground: '#FFFFFF',
      background: Colors.error,
      usage: 'Danger button text',
    },
    {
      name: 'Outline Button Text (gray-700)',
      foreground: '#374151',
      background: Colors.background,
      usage: 'Outline button text',
    },
    // Macro colors on their backgrounds
    {
      name: 'Calories Text on Background',
      foreground: TextColors.macro.calories,
      background: BackgroundColors.macro.calories,
      usage: 'Macro pill - calories',
    },
    {
      name: 'Protein Text on Background',
      foreground: TextColors.macro.protein,
      background: BackgroundColors.macro.protein,
      usage: 'Macro pill - protein',
    },
    {
      name: 'Carbs Text on Background',
      foreground: TextColors.macro.carbs,
      background: BackgroundColors.macro.carbs,
      usage: 'Macro pill - carbs',
    },
    {
      name: 'Fat Text on Background',
      foreground: TextColors.macro.fat,
      background: BackgroundColors.macro.fat,
      usage: 'Macro pill - fat',
    },
  ].map(combo => ({
    ...combo,
    ratio: Math.round(getContrastRatio(combo.foreground, combo.background) * 100) / 100,
    level: getContrastLevel(combo.foreground, combo.background),
    passes: meetsWCAG_AA(combo.foreground, combo.background),
  }));

  const darkCombinations: ColorCombination[] = [
    // Text on backgrounds
    {
      name: 'Primary Text on Background',
      foreground: DarkColors.text.primary,
      background: DarkColors.background,
      usage: 'Main body text',
    },
    {
      name: 'Secondary Text on Background',
      foreground: DarkColors.text.secondary,
      background: DarkColors.background,
      usage: 'Labels, descriptions',
    },
    {
      name: 'Tertiary Text on Background',
      foreground: DarkColors.text.tertiary,
      background: DarkColors.background,
      usage: 'Hints, placeholders',
    },
    {
      name: 'Primary Text on Surface',
      foreground: DarkColors.text.primary,
      background: DarkColors.surface,
      usage: 'Cards, modals',
    },
    {
      name: 'Secondary Text on Surface',
      foreground: DarkColors.text.secondary,
      background: DarkColors.surface,
      usage: 'Card descriptions',
    },
    {
      name: 'Tertiary Text on Surface',
      foreground: DarkColors.text.tertiary,
      background: DarkColors.surface,
      usage: 'Card hints',
    },
    // Button text
    {
      name: 'White on Primary',
      foreground: '#FFFFFF',
      background: DarkColors.primary,
      usage: 'Primary button text',
    },
    {
      name: 'Dark Text on Primary Light',
      foreground: DarkColors.text.inverse,
      background: DarkColors.primaryLight,
      usage: 'Light button text',
    },
    // Outline button in dark mode
    {
      name: 'Outline Button Text (gray-100)',
      foreground: '#F3F4F6',
      background: DarkColors.background,
      usage: 'Outline button text',
    },
  ].map(combo => ({
    ...combo,
    ratio: Math.round(getContrastRatio(combo.foreground, combo.background) * 100) / 100,
    level: getContrastLevel(combo.foreground, combo.background),
    passes: meetsWCAG_AA(combo.foreground, combo.background),
  }));

  return { light: lightCombinations, dark: darkCombinations };
}

/**
 * Get failing color combinations that need to be fixed
 */
export function getFailingCombinations(): {
  light: ColorCombination[];
  dark: ColorCombination[];
} {
  const audit = auditColorContrast();
  return {
    light: audit.light.filter(c => !c.passes),
    dark: audit.dark.filter(c => !c.passes),
  };
}

// Color recommendations for common use cases
export const ColorRecommendations = {
  // Minimum contrast colors for different backgrounds
  light: {
    // On white (#FFFFFF) background - need at least these colors for 4.5:1
    onWhite: {
      minGray: '#757575', // gray-600 equivalent, 4.54:1
      minOrange: '#B45309', // amber-700, passes AA
      recommended: '#374151', // gray-700, 9.18:1 - good for body text
    },
    // On gray-50 (#F9FAFB) background
    onSurface: {
      minGray: '#6B7280', // gray-500, 4.58:1
      recommended: '#374151', // gray-700, 8.34:1
    },
  },
  dark: {
    // On gray-900 (#111827) background
    onBackground: {
      minGray: '#9CA3AF', // gray-400, 5.85:1
      recommended: '#D1D5DB', // gray-300, 10.01:1
    },
    // On gray-800 (#1F2937) background
    onSurface: {
      minGray: '#9CA3AF', // gray-400, 4.74:1
      recommended: '#D1D5DB', // gray-300, 8.11:1
    },
  },
} as const;

// Gray scale contrast reference
// Shows contrast ratios against white and dark backgrounds
export const GrayScaleContrast = {
  'gray-50': { hex: '#F9FAFB', onWhite: 1.07, onDark: 15.94 },
  'gray-100': { hex: '#F3F4F6', onWhite: 1.12, onDark: 15.21 },
  'gray-200': { hex: '#E5E7EB', onWhite: 1.29, onDark: 13.15 },
  'gray-300': { hex: '#D1D5DB', onWhite: 1.60, onDark: 10.66 },
  'gray-400': { hex: '#9CA3AF', onWhite: 2.91, onDark: 5.85 },
  'gray-500': { hex: '#6B7280', onWhite: 5.03, onDark: 3.39 },
  'gray-600': { hex: '#4B5563', onWhite: 7.52, onDark: 2.27 },
  'gray-700': { hex: '#374151', onWhite: 10.18, onDark: 1.67 },
  'gray-800': { hex: '#1F2937', onWhite: 13.89, onDark: 1.23 },
  'gray-900': { hex: '#111827', onWhite: 17.05, onDark: 1.00 },
} as const;
