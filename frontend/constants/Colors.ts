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
  surfaceTint: string; // Warm beige for grouped sections / input fills
  card: string; // Card surfaces resting on background
  cardRaised: string; // Elevated cards (cards on cards, modals)
  cardOverlay: string; // Top-level overlay surfaces
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

/**
 * @deprecated Prefer `Brand`, `Canvas`, `Surface`, `Ink`, `Semantic` from
 *   `constants/tokens` (DS0.5). This object remains valid for legacy callers
 *   and for domain colors that have no token equivalent (e.g. `secondaryRed`,
 *   `tertiaryGreen`, `macros.*`). Touch-it-migrate-it: when you edit a file
 *   that imports `Colors.primary` or similar overlapping keys for
 *   non-data-mapping use, switch that file to the equivalent token.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _t = require('./colorTokens.cjs');

// Light theme color palette
export const Colors: ColorPalette = {
  // Primary colors (Orange theme - Sazon means seasoning/flavor)
  primary: _t.Brand.light.base, // sourced from tokens.Brand.light.base
  primaryLight: '#ffb464', // Lighter variant for backgrounds/highlights (no direct token equiv)
  primaryDark: _t.Brand.light.deep, // sourced from tokens.Brand.light.deep
  
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
  
  // Semantic colors — sourced from tokens.Semantic.light.*
  success: _t.Semantic.light.success,
  warning: _t.Semantic.light.warning,
  error: _t.Semantic.light.error,
  info: _t.Semantic.light.info,

  // Neutral colors — sourced from tokens.Canvas.* / Surface.light.*
  background: _t.Canvas.light,
  surface: _t.Canvas.warmLight, // warm cream (was #F9FAFB gray-50)
  surfaceTint: '#F5F0EB', // warm beige for grouped sections / input fills
  card: '#FFFFFF', // card surfaces
  cardRaised: '#FFFFFF', // elevated cards
  cardOverlay: '#FFFFFF', // overlay surfaces
  
  text: {
    primary: '#111827', // gray-900 (legacy — Ink.light.primary is #0A0A0A; preserved for AA contrast on existing surfaces)
    secondary: '#6B7280', // gray-500
    tertiary: '#9CA3AF', // gray-400
    inverse: _t.Ink.light.inverse,
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

/**
 * @deprecated Prefer `Brand`, `Canvas`, `Surface`, `Ink`, `Semantic` (dark branch)
 *   from `constants/tokens` (DS0.5). Same migration policy as `Colors`.
 */
// Dark theme color palette — "cookbook by candlelight"
// Warm cocoa scaffold, jewel-tone plates, ivory ink, brightened coral.
// Source: claude-design/sazon-chef-darkmode/COLORS.md
export const DarkColors: ColorPalette = {
  // Primary colors — coral brightened for AA contrast on cocoa scaffold
  primary: _t.Brand.dark.base,
  primaryLight: '#FFB489', // softer coral for tints / hover (no direct token equiv)
  primaryDark: _t.Brand.dark.deep,

  // Secondary colors
  secondary: '#B8A99A', // warm taupe (was gray-400)
  secondaryRed: '#f87171', // Lighter red for dark mode (brighter for visibility)
  secondaryRedLight: '#dc2626', // Darker variant for better text visibility with white text
  secondaryRedDark: '#e42614', // New habanero red - darker variant for borders/accents
  tertiary: 'rainbow', // Rainbow gradient for special screens and actions
  tertiaryGreen: '#6fa06a', // Lighter green for dark mode (brighter for visibility)
  tertiaryGreenLight: '#9dc299', // Light variant for backgrounds with opacity
  tertiaryGreenDark: '#4a6b45', // Dark variant for borders/accents
  accent: '#A78BFA', // violet-400 (lighter for dark mode)
  accentSecondary: '#f87171', // Lighter red for dark mode - for habanero variants and brand accents

  // Semantic colors (brighter for dark mode visibility) — sourced from tokens.Semantic.dark.*
  success: _t.Semantic.dark.success,
  warning: _t.Semantic.dark.warning,
  error: _t.Semantic.dark.error,
  info: _t.Semantic.dark.info,

  // Neutral surfaces — warm cocoa scaffold
  background: _t.Canvas.warmDark, // scaffold (warm cocoa-black)
  surface: '#1A1410', // base surface matches scaffold
  surfaceTint: '#352923', // surfaceMuted — chips, dividers, day rail tiles
  card: '#2A201B', // raised cards, top bar fill (surface)
  cardRaised: '#352923', // elevated cards, bottom sheets
  cardOverlay: '#3F3128', // top-level overlay surfaces

  text: {
    primary: _t.Ink.dark.warm, // warm ivory, never pure white (Ink.dark.warm = #F5EFE6)
    secondary: '#B8A99A', // inkMuted — warm taupe (legacy)
    tertiary: '#7A6A5C', // inkSoft — eyebrows / labels (legacy)
    inverse: _t.Canvas.warmDark, // text on accent / on ivory surfaces
  },

  // Border colors — hairline ivory at low opacity
  border: {
    light: 'rgba(245,239,230,0.08)', // hairline divider on cocoa
    medium: 'rgba(245,239,230,0.14)', // chip/card edges
    dark: 'rgba(245,239,230,0.24)' // emphasized edges
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

// Dark mode elevation surfaces
// In dark mode, shadows are nearly invisible — elevated surfaces use *lighter* backgrounds
// to communicate depth (Material Design dark theme specification).
//
// Elevation levels (dp = density-independent layer depth):
//   dp0  — screen background (base)
//   dp1  — cards, list items resting on surface
//   dp2  — floating action buttons, cards on elevation dp1
//   dp4  — navigation drawers, modals, bottom sheets
//   dp8  — bottom app bar, menus
//  dp16  — navigation bar, modals above sheets
//  dp24  — dialog boxes, top-level overlays
export const DarkElevation = {
  dp0:  '#0D0D0D', // deepest background (OLED-optimized)
  dp1:  '#1C1C1E', // card surfaces resting on background
  dp2:  '#242426', // cards on cards, bottom sheet body
  dp4:  '#2C2C2E', // bottom sheets, slide-in modals
  dp8:  '#363638', // menus, dropdowns, tooltips
  dp16: '#3A3A3C', // dialog boxes
  dp24: '#48484A', // top-level overlay surfaces
} as const;

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

// ─── Pastel Token System (9K) ─────────────────────────────────────────────────
// Light pastel tints for card/widget backgrounds
export const Pastel = {
  sage:     '#E8F5E9', // protein, healthy, vegetables, success
  golden:   '#FFF8E1', // carbs, breakfast, streaks, star ratings
  lavender: '#F3E5F5', // fat/lipids, activity, premium badges
  peach:    '#FFF3E0', // calories, meal plan, warm prompts
  sky:      '#E3F2FD', // hydration, cooking time, info states
  blush:    '#FCE4EC', // desserts, treats, cheat meal tags
  orange:   '#FFF0E5', // Sazon brand tint for warm card backgrounds
  red:      '#FFF0EE', // error state backgrounds, severity badges
} as const;

// Vivid accents for rings, charts, active indicators
export const Accent = {
  sage:     '#81C784',
  golden:   '#FFD54F',
  lavender: '#CE93D8',
  peach:    '#FFB74D',
  sky:      '#64B5F6',
  blush:    '#F06292',
} as const;

// Dark mode pastel adaptation — rgba overlays at 12% opacity on dark surfaces
export const PastelDark = {
  sage:     'rgba(129, 199, 132, 0.12)',
  golden:   'rgba(255, 213, 79, 0.12)',
  lavender: 'rgba(206, 147, 216, 0.12)',
  peach:    'rgba(255, 183, 77, 0.12)',
  sky:      'rgba(100, 181, 246, 0.12)',
  blush:    'rgba(240, 98, 146, 0.12)',
  orange:   'rgba(255, 139, 65, 0.12)',
  red:      'rgba(239, 68, 68, 0.12)',
} as const;

// Macro-to-color mapping — each macro gets a bg (pastel) + accent (vivid) pair
export const MACRO_COLORS = {
  protein:  { bg: Pastel.sage,     bgDark: PastelDark.sage,     accent: Accent.sage },
  carbs:    { bg: Pastel.golden,   bgDark: PastelDark.golden,   accent: Accent.golden },
  fat:      { bg: Pastel.lavender, bgDark: PastelDark.lavender, accent: Accent.lavender },
  calories: { bg: Pastel.peach,    bgDark: PastelDark.peach,    accent: Accent.peach },
} as const;

// Modal backdrop tokens
export const Backdrop = {
  light: 'rgba(0,0,0,0.4)', // Standard modals, bottom sheets
  heavy: 'rgba(0,0,0,0.7)', // Celebrations, paywall, full-screen overlays
} as const;

// Difficulty badge colors
export const DifficultyColors = {
  easy: { bg: '#D1FAE5', text: '#065F46', darkBg: 'rgba(16,185,129,0.2)', darkText: '#34D399' },
  medium: { bg: '#FEF3C7', text: '#92400E', darkBg: 'rgba(245,158,11,0.2)', darkText: '#FBBF24' },
  hard: { bg: '#FEE2E2', text: '#991B1B', darkBg: 'rgba(239,68,68,0.2)', darkText: '#F87171' },
} as const;

// ─── Editorial Tokens (10V-B) ────────────────────────────────────────────────
// v2 design system additions — used by editorial components
export const EditorialColors = {
  fg: {
    muted_cream: '#C9BFB5', // inactive category rail labels on cream bg
  },
  pastelTitle: {
    peach: '#8a4a00',
    sage: '#2E5931',
    lavender: '#6a2677',
    sky: '#0f4a7a',
    golden: '#8a6200',
    blush: '#9a1f5b',
  },
  blackCTA: '#111827', // primary CTA background (v2 editorial)
} as const;

// ─── Editorial Dark Mode Tokens — "cookbook by candlelight" ──────────────────
// Source: claude-design/sazon-chef-darkmode/COLORS.md
// Hero plates: circular pastel-on-screen anchors, each with bg gradient + ink + accent.
export const HeroPlatesDark = {
  // Onboarding step 1, Recipe Detail, Shopping progress
  orange: {
    bg: ['#7A3A0F', '#4F2208'] as const,
    ink: '#FFD4A6',
    accent: '#FF9559',
  },
  // Onboarding step 2
  green: {
    bg: ['#1F4022', '#0F2614'] as const,
    ink: '#A8DDA9',
    accent: '#83C788',
  },
  // Onboarding step 3, Meal Plan today's plan cards
  lavender: {
    bg: ['#3a1f4a', '#21102b'] as const,
    ink: '#D8B4DF',
    accent: '#C098CB',
  },
  // Cookbook "Most cooked" hero
  pink: {
    bg: ['#5a1d2c', '#321015'] as const,
    ink: '#F2B5BD',
    accent: '#F06292',
  },
  // Home "Tonight's picks" featured plate
  blue: {
    bg: ['#0f3247', '#0a2030'] as const,
    ink: '#9EC9DF',
    accent: '#64B5F6',
  },
} as const;

// Pastel tiles (category & sectional surfaces) — flat, muted jewel
export const PastelsJewelDark = {
  green:  { bg: '#1F2E22', accent: '#9CCFA0', dot: '#5C9460' },
  pink:   { bg: '#3a1d2a', accent: '#F2A6B4', dot: '#C8527A' },
  amber:  { bg: '#3a2614', accent: '#F0B97D', dot: '#C97A3A' },
  blue:   { bg: '#152a3a', accent: '#A8C8E0', dot: '#5C8FB8' },
  lilac:  { bg: '#2e1b3a', accent: '#D2B0DD', dot: '#9466A8' },
} as const;

// Editorial dark — cocoa scaffold + ivory ink scale + soft accent overlay
export const EditorialDark = {
  scaffold:     '#1A1410',
  scaffoldEnd:  '#221915',
  surface:      '#2A201B',
  surfaceMuted: '#352923',
  border:       'rgba(245,239,230,0.08)',
  ink:          '#F5EFE6',
  inkMuted:     '#B8A99A',
  inkSoft:      '#7A6A5C',
  serifTitle:   '#F5EFE6',
  serifMuted:   '#E8D9C5',
  accent:       '#FF9559',
  accentInk:    '#1A1410', // text on accent
  accentSoft:   'rgba(255,149,89,0.14)', // tinted accent backgrounds
  // Shadows — deeper / opaque on cocoa
  shadowHero:   '0 18px 36px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.3)',
  shadowCard:   '0 8px 24px rgba(0,0,0,0.35)',
  shadowCTA:    '0 10px 24px rgba(255,149,89,0.35)',
} as const;

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

export const getDifficultyColor = (difficulty: string, isDark: boolean) => {
  const key = difficulty.toLowerCase() as keyof typeof DifficultyColors;
  const colors = DifficultyColors[key] || DifficultyColors.medium;
  return {
    bg: isDark ? colors.darkBg : colors.bg,
    text: isDark ? colors.darkText : colors.text,
  };
};