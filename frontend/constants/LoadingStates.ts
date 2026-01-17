// Loading States Library for Sazon Chef app
// Predefined loading state configurations with mascot expressions
// Provides consistent loading messages across all screens

import { LogoMascotExpression } from '../components/mascot/LogoMascot';

/**
 * Loading state configuration type
 */
export interface LoadingStateConfig {
  /** Main loading message */
  message: string;
  /** Optional secondary/hint text */
  hint?: string;
  /** Mascot expression to display */
  mascotExpression: LogoMascotExpression;
  /** Mascot size */
  mascotSize: 'tiny' | 'small' | 'medium' | 'large' | 'hero';
  /** Animation type for mascot */
  animationType?: 'pulse' | 'bounce' | 'wiggle' | 'none';
  /** Estimated time hint (optional) */
  estimatedTime?: string;
}

/**
 * Loading states for the Home screen
 */
export const HomeLoadingStates = {
  /** Loading recipe feed */
  recipes: {
    message: 'Finding delicious recipes...',
    hint: 'Personalizing based on your preferences',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Refreshing recipe feed */
  refreshing: {
    message: 'Getting fresh recommendations...',
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Generating AI recipe */
  generatingRecipe: {
    message: 'Creating a personalized recipe for you...',
    hint: 'This may take 10-15 seconds',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'large' as const,
    animationType: 'pulse' as const,
    estimatedTime: '10-15 seconds',
  },

  /** Searching recipes */
  searching: {
    message: 'Searching recipes...',
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Loading more recipes (pagination) */
  loadingMore: {
    message: 'Loading more recipes...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Applying filters */
  filtering: {
    message: 'Applying your filters...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },
} as const;

/**
 * Loading states for the Cookbook screen
 */
export const CookbookLoadingStates = {
  /** Loading saved recipes */
  savedRecipes: {
    message: 'Loading your cookbook...',
    hint: 'Fetching your saved recipes',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Loading collections */
  collections: {
    message: 'Loading your collections...',
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Saving recipe */
  savingRecipe: {
    message: 'Saving to cookbook...',
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Creating collection */
  creatingCollection: {
    message: 'Creating your collection...',
    mascotExpression: 'proud' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Searching cookbook */
  searching: {
    message: 'Searching your cookbook...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },
} as const;

/**
 * Loading states for the Meal Plan screen
 */
export const MealPlanLoadingStates = {
  /** Loading meal plan */
  mealPlan: {
    message: 'Loading your meal plan...',
    hint: 'Fetching your scheduled meals',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Generating meal plan */
  generating: {
    message: 'Creating your personalized meal plan...',
    hint: 'Optimizing for your nutrition goals',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'large' as const,
    animationType: 'pulse' as const,
    estimatedTime: '5-10 seconds',
  },

  /** Adding meal to plan */
  addingMeal: {
    message: 'Adding to your plan...',
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Removing meal from plan */
  removingMeal: {
    message: 'Removing from plan...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Getting swap suggestions */
  swapSuggestions: {
    message: 'Finding alternatives...',
    hint: 'Looking for similar recipes',
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Loading weekly view */
  weeklyView: {
    message: 'Loading your week...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Calculating macros */
  calculatingMacros: {
    message: 'Calculating nutrition...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },
} as const;

/**
 * Loading states for the Shopping List screen
 */
export const ShoppingListLoadingStates = {
  /** Loading shopping lists */
  lists: {
    message: 'Loading your shopping lists...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Generating shopping list from meal plan */
  generating: {
    message: 'Creating your shopping list...',
    hint: 'Gathering ingredients from your meal plan',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Adding item */
  addingItem: {
    message: 'Adding item...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Checking prices */
  checkingPrices: {
    message: 'Checking prices...',
    hint: 'Finding the best deals',
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Syncing list */
  syncing: {
    message: 'Syncing your list...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },
} as const;

/**
 * Loading states for the Profile screen
 */
export const ProfileLoadingStates = {
  /** Loading profile data */
  profile: {
    message: 'Loading your profile...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Saving settings */
  savingSettings: {
    message: 'Saving your settings...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Logging weight */
  loggingWeight: {
    message: 'Recording your weight...',
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Updating preferences */
  updatingPreferences: {
    message: 'Updating preferences...',
    hint: 'Your recommendations will be personalized',
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Loading statistics */
  loadingStats: {
    message: 'Calculating your statistics...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },
} as const;

/**
 * Generic loading states for common operations
 */
export const GenericLoadingStates = {
  /** Default loading */
  default: {
    message: 'Loading...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Saving/submitting */
  saving: {
    message: 'Saving...',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Refreshing */
  refreshing: {
    message: 'Refreshing...',
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'bounce' as const,
  },

  /** Processing */
  processing: {
    message: 'Processing...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** Uploading */
  uploading: {
    message: 'Uploading...',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'small' as const,
    animationType: 'pulse' as const,
  },

  /** Connecting */
  connecting: {
    message: 'Connecting...',
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'pulse' as const,
  },

  /** AI thinking */
  aiThinking: {
    message: 'Sazon is thinking...',
    hint: 'Our AI is preparing something special',
    mascotExpression: 'focused' as LogoMascotExpression,
    mascotSize: 'large' as const,
    animationType: 'pulse' as const,
  },

  /** Success transition */
  success: {
    message: 'Done!',
    mascotExpression: 'celebrating' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    animationType: 'bounce' as const,
  },
} as const;

/**
 * All loading states combined for easy access
 */
export const LoadingStates = {
  home: HomeLoadingStates,
  cookbook: CookbookLoadingStates,
  mealPlan: MealPlanLoadingStates,
  shoppingList: ShoppingListLoadingStates,
  profile: ProfileLoadingStates,
  generic: GenericLoadingStates,
} as const;

// Type exports
export type HomeLoadingStateKey = keyof typeof HomeLoadingStates;
export type CookbookLoadingStateKey = keyof typeof CookbookLoadingStates;
export type MealPlanLoadingStateKey = keyof typeof MealPlanLoadingStates;
export type ShoppingListLoadingStateKey = keyof typeof ShoppingListLoadingStates;
export type ProfileLoadingStateKey = keyof typeof ProfileLoadingStates;
export type GenericLoadingStateKey = keyof typeof GenericLoadingStates;

/**
 * Helper function to get a random loading message variation
 * Can be used to add variety to repeated loading states
 */
export const getLoadingMessage = (
  baseConfig: LoadingStateConfig,
  variations?: string[]
): LoadingStateConfig => {
  if (!variations || variations.length === 0) {
    return baseConfig;
  }
  const randomMessage = variations[Math.floor(Math.random() * variations.length)];
  return {
    ...baseConfig,
    message: randomMessage,
  };
};
