// Color palette for Sazon Chef app
// Using Tailwind CSS color system for consistency

// Interfaces for this file
interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  
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
  primary: '#F97316', // orange-500
  primaryLight: '#FDBA74', // orange-300
  primaryDark: '#EA580C', // orange-600
  
  // Secondary colors
  secondary: '#6B7280', // gray-500
  accent: '#8B5CF6', // violet-500
  
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
  primary: '#F97316', // orange-500
  primaryLight: '#FDBA74', // orange-300
  primaryDark: '#EA580C', // orange-600
  
  // Secondary colors
  secondary: '#9CA3AF', // gray-400 (lighter for dark mode)
  accent: '#A78BFA', // violet-400 (lighter for dark mode)
  
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
  primary: ['#F97316', '#EA580C'], // orange-500 to orange-600
  success: ['#10B981', '#059669'], // emerald-500 to emerald-600
  premium: ['#8B5CF6', '#7C3AED'] // violet-500 to violet-600
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