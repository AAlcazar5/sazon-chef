// Color palette for Sazon Chef app
// Using Tailwind CSS color system for consistency
//
// WCAG 2.1 Contrast Guidelines:
// - AA Normal Text (< 18pt): 4.5:1 minimum ratio
// - AA Large Text (>= 18pt or >= 14pt bold): 3:1 minimum ratio
//
// Gray Scale Usage (ensures WCAG AA compliance):
// ┌─────────────┬───────────┬──────────────────────┬──────────────────────┐
// │ Color       │ Hex       │ On White (#FFF)      │ On Dark (#111827)    │
// ├─────────────┼───────────┼──────────────────────┼──────────────────────┤
// │ gray-400    │ #9CA3AF   │ 2.91:1 ❌ FAILS AA   │ 5.85:1 ✓ PASSES AA  │
// │ gray-500    │ #6B7280   │ 5.03:1 ✓ PASSES AA  │ 3.39:1 ❌ FAILS AA   │
// │ gray-600    │ #4B5563   │ 7.52:1 ✓ PASSES AA  │ 2.27:1 ❌ FAILS AA   │
// │ gray-700    │ #374151   │ 10.18:1 ✓ PASSES AA │ 1.67:1 ❌ FAILS AA   │
// └─────────────┴───────────┴──────────────────────┴──────────────────────┘
//
// CORRECT PATTERN: text-gray-500 dark:text-gray-400
// WRONG PATTERN:   text-gray-400 dark:text-gray-500 (both fail!)
//
// Text Color Usage:
// - text.primary:   Body text, headings (gray-900 light / gray-50 dark)
// - text.secondary: Labels, descriptions (gray-500 light / gray-300 dark) - PASSES AA
// - text.tertiary:  Hints, placeholders ONLY (gray-400) - fails AA on light, OK on dark
// - text.inverse:   Text on colored backgrounds (white/gray-900)
//
// Theme Usage - When to use which approach:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Approach              │ When to Use                                         │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ useColorScheme()      │ NativeWind/Tailwind classes (dark:, className)     │
// │ from 'nativewind'     │ Example: className="bg-white dark:bg-gray-900"     │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ useTheme()            │ JS style objects, dynamic colors, theme switching   │
// │ from ThemeContext     │ Example: style={{ color: colors.text.primary }}    │
// │                       │ Also provides: setThemeMode, toggleTheme            │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ Colors/DarkColors     │ Direct imports when theme is known or for constants │
// │ imports               │ Example: placeholderTextColor={Colors.text.tertiary}│
// └─────────────────────────────────────────────────────────────────────────────┘
//
// Best Practice: Use NativeWind classes (dark:) for most styling. Use useTheme()
// when you need the colors object for dynamic styling or conditional logic.
// The ThemeContext syncs with NativeWind, so they stay consistent.

// Interfaces for this file
interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryRed: string; // Complementary red shade for secondary color
  secondaryRedLight: string; // Light variant of secondary red
  secondaryRedDark: string; // Dark variant of secondary red
  tertiary: string; // Rainbow gradient for special screens and actions
  tertiaryGreen: string; // Green tertiary color
  tertiaryGreenLight: string; // Light variant of tertiary green
  tertiaryGreenDark: string; // Dark variant of tertiary green
  accent: string;
  accentSecondary: string; // Red accent for habanero variants and brand
  
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Neutral colors
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  
  // Border colors
  border: {
    light: string;
    medium: string;
    dark: string;
  };
  
  // Macro-specific colors
  macros: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    sugar: string;
  };
  
  // Feedback colors
  feedback: {
    like: string;
    dislike: string;
    neutral: string;
  };
  
  // Score colors
  score: {
    high: string;
    medium: string;
    low: string;
  };
}

// Light theme color palette
export const Colors: ColorPalette = {
  // Primary colors (Orange theme - Sazon means seasoning/flavor)
  primary: '#fa7e12', // New brand orange
  primaryLight: '#ffb464', // Lighter variant for backgrounds/highlights
  primaryDark: '#d67a0c', // Darker variant for emphasis
  
  // Secondary colors
  secondary: '#6B7280', // gray-500
  secondaryRed: '#e42614', // New darker habanero red for light mode
  secondaryRedLight: '#dc2626', // Darker variant for better text visibility with white text
  secondaryRedDark: '#b91c1c', // Dark variant for emphasis
  tertiary: 'rainbow', // Rainbow gradient for special screens and actions
  tertiaryGreen: '#5e8659', // Green tertiary color
  tertiaryGreenLight: '#9dc299', // Light variant for backgrounds/highlights
  tertiaryGreenDark: '#4a6b45', // Dark variant for emphasis
  accent: '#8B5CF6', // violet-500
  accentSecondary: '#e42614', // New habanero red - for habanero variants and brand accents
  
  // Semantic colors
  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  error: '#EF4444', // red-500
  info: '#3B82F6', // blue-500
  
  // Neutral colors
  background: '#FFFFFF',
  surface: '#F9FAFB', // gray-50
  
  text: {
    primary: '#111827', // gray-900
    secondary: '#6B7280', // gray-500
    tertiary: '#9CA3AF', // gray-400
    inverse: '#FFFFFF'
  },
  
  // Border colors
  border: {
    light: '#E5E7EB', // gray-200
    medium: '#D1D5DB', // gray-300
    dark: '#374151' // gray-700
  },
  
  // Macro-specific colors (matching MacroPill component)
  macros: {
    calories: '#3B82F6', // blue-500
    protein: '#10B981', // emerald-500
    carbs: '#F59E0B', // amber-500
    fat: '#8B5CF6', // violet-500
    fiber: '#059669', // emerald-600
    sugar: '#EC4899' // pink-500
  },
  
  // Feedback colors
  feedback: {
    like: '#10B981', // emerald-500
    dislike: '#EF4444', // red-500
    neutral: '#6B7280' // gray-500
  },
  
  // Score colors
  score: {
    high: '#10B981', // emerald-500 (80-100)
    medium: '#F59E0B', // amber-500 (60-79)
    low: '#EF4444' // red-500 (0-59)
  }
};

// Dark theme color palette
export const DarkColors: ColorPalette = {
  // Primary colors (same as light theme for brand consistency)
  primary: '#fa7e12', // New brand orange
  primaryLight: '#ffb464', // Lighter variant for backgrounds/highlights
  primaryDark: '#d67a0c', // Darker variant for emphasis
  
  // Secondary colors
  secondary: '#9CA3AF', // gray-400 (lighter for dark mode)
  secondaryRed: '#f87171', // Lighter red for dark mode (brighter for visibility)
  secondaryRedLight: '#dc2626', // Darker variant for better text visibility with white text
  secondaryRedDark: '#e42614', // New habanero red - darker variant for borders/accents
  tertiary: 'rainbow', // Rainbow gradient for special screens and actions
  tertiaryGreen: '#6fa06a', // Lighter green for dark mode (brighter for visibility)
  tertiaryGreenLight: '#9dc299', // Light variant for backgrounds with opacity
  tertiaryGreenDark: '#4a6b45', // Dark variant for borders/accents
  accent: '#A78BFA', // violet-400 (lighter for dark mode)
  accentSecondary: '#f87171', // Lighter red for dark mode - for habanero variants and brand accents
  
  // Semantic colors (same as light theme)
  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  error: '#EF4444', // red-500
  info: '#3B82F6', // blue-500
  
  // Neutral colors (dark mode inversions)
  background: '#111827', // gray-900
  surface: '#1F2937', // gray-800
  
  text: {
    primary: '#F9FAFB', // gray-50 (inverse)
    secondary: '#D1D5DB', // gray-300
    tertiary: '#9CA3AF', // gray-400
    inverse: '#111827' // gray-900 (inverse)
  },
  
  // Border colors (dark mode)
  border: {
    light: '#374151', // gray-700
    medium: '#4B5563', // gray-600
    dark: '#6B7280' // gray-500
  },
  
  // Macro-specific colors (same as light theme)
  macros: {
    calories: '#60A5FA', // blue-400 (lighter for dark mode)
    protein: '#34D399', // emerald-400 (lighter for dark mode)
    carbs: '#FBBF24', // amber-400 (lighter for dark mode)
    fat: '#A78BFA', // violet-400 (lighter for dark mode)
    fiber: '#34D399', // emerald-400
    sugar: '#F472B6' // pink-400 (lighter for dark mode)
  },
  
  // Feedback colors (same as light theme)
  feedback: {
    like: '#10B981', // emerald-500
    dislike: '#EF4444', // red-500
    neutral: '#9CA3AF' // gray-400
  },
  
  // Score colors (same as light theme)
  score: {
    high: '#10B981', // emerald-500 (80-100)
    medium: '#F59E0B', // amber-500 (60-79)
    low: '#EF4444' // red-500 (0-59)
  }
};

// Background colors for macro pills and other elements
export const BackgroundColors = {
  macro: {
    calories: '#DBEAFE', // blue-100
    protein: '#D1FAE5', // emerald-100
    carbs: '#FEF3C7', // amber-100
    fat: '#EDE9FE', // violet-100
    fiber: '#A7F3D0', // emerald-200
    sugar: '#FCE7F3' // pink-100
  },
  
  feedback: {
    like: '#D1FAE5', // emerald-100
    dislike: '#FEE2E2', // red-100
    neutral: '#F3F4F6' // gray-100
  },
  
  score: {
    high: '#D1FAE5', // emerald-100
    medium: '#FEF3C7', // amber-100
    low: '#FEE2E2' // red-100
  }
};

// Text colors for macro pills and other elements
export const TextColors = {
  macro: {
    calories: '#1E40AF', // blue-800
    protein: '#065F46', // emerald-800
    carbs: '#92400E', // amber-800
    fat: '#5B21B6', // violet-800
    fiber: '#065F46', // emerald-800
    sugar: '#9D174D' // pink-800
  },
  
  feedback: {
    like: '#065F46', // emerald-800
    dislike: '#991B1B', // red-800
    neutral: '#374151' // gray-700
  },
  
  score: {
    high: '#065F46', // emerald-800
    medium: '#92400E', // amber-800
    low: '#991B1B' // red-800
  }
};

// Gradient colors for potential future use
export const Gradients = {
  primary: ['#fa7e12', '#d67a0c'], // New brand orange gradient
  success: ['#10B981', '#059669'], // emerald-500 to emerald-600
  premium: ['#8B5CF6', '#7C3AED'], // violet-500 to violet-600
  accent: ['#e42614', '#b91c1c'], // New habanero red gradient - for habanero variants
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF0000'], // Rainbow gradient - red, orange, yellow, green, blue, indigo, violet, back to red
  rainbowBright: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFB3E6', '#FFB3BA'], // Pastel rainbow gradient for dark mode - soft, light colors
  rainbowBrightLight: ['#E63946', '#F77F00', '#FCBF49', '#06A77D', '#118AB2', '#7209B7', '#B5179E', '#E63946'] // Vibrant, saturated rainbow gradient for light mode - non-pastel for better legibility
};

// Helper functions
export const getScoreColor = (score: number): keyof typeof Colors.score => {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
};

export const getMacroColor = (type: keyof typeof Colors.macros): string => {
  return Colors.macros[type];
};

export const getFeedbackColor = (type: 'like' | 'dislike' | 'neutral'): string => {
  return Colors.feedback[type];
};