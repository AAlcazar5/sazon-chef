// Empty State Library for Sazon Chef app
// Predefined empty state configurations for all screens

import { Icons } from './Icons';
import { LogoMascotExpression } from '../components/mascot/LogoMascot';

/**
 * Empty state configuration type
 */
export interface EmptyStateConfig {
  /** Title text displayed prominently */
  title: string;
  /** Description/subtitle text */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Icon name from Icons constant (if not using mascot) */
  icon?: keyof typeof Icons;
  /** Whether to use mascot instead of icon */
  useMascot: boolean;
  /** Mascot expression to use */
  mascotExpression: LogoMascotExpression;
  /** Mascot size */
  mascotSize: 'tiny' | 'small' | 'medium' | 'large' | 'hero';
}

/**
 * Empty states for the Home screen
 */
export const HomeEmptyStates = {
  /** No recipes available */
  noRecipes: {
    title: 'No Recipes Yet',
    description: 'Start exploring delicious recipes tailored just for you!',
    actionLabel: 'Discover Recipes',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** No search results */
  noSearchResults: {
    title: 'No Recipes Found',
    description: 'Try adjusting your search or filters to find more recipes.',
    actionLabel: 'Clear Filters',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No filtered results */
  noFilteredResults: {
    title: 'No Matching Recipes',
    description: 'Your current filters are quite specific. Try removing some to see more options.',
    actionLabel: 'Reset Filters',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** Loading failed */
  loadingFailed: {
    title: 'Oops! Something Went Wrong',
    description: 'We couldn\'t load recipes right now. Please try again.',
    actionLabel: 'Try Again',
    useMascot: true,
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },
} as const;

/**
 * Empty states for the Cookbook screen
 */
export const CookbookEmptyStates = {
  /** No saved recipes */
  noSavedRecipes: {
    title: 'Your Cookbook is Empty',
    description: 'Start saving recipes you love by tapping the bookmark icon!',
    actionLabel: 'Explore Recipes',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** No recipes in collection */
  emptyCollection: {
    title: 'This Collection is Empty',
    description: 'Add recipes to this collection to organize your favorites.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No collections */
  noCollections: {
    title: 'No Collections Yet',
    description: 'Create collections to organize your favorite recipes by occasion, cuisine, or mood.',
    actionLabel: 'Create Collection',
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No user-created recipes */
  noUserRecipes: {
    title: 'No Personal Recipes',
    description: 'Create your own recipes to add them to your cookbook!',
    actionLabel: 'Create Recipe',
    useMascot: true,
    mascotExpression: 'proud' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No liked recipes */
  noLikedRecipes: {
    title: 'No Liked Recipes',
    description: 'Like recipes you enjoy to see them here.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** No disliked recipes */
  noDislikedRecipes: {
    title: 'No Disliked Recipes',
    description: 'Dislike recipes to filter them from recommendations.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** Search returned no results */
  noSearchResults: {
    title: 'No Recipes Found',
    description: 'No recipes match your search. Try searching for ingredients, cuisine, or recipe names.',
    actionLabel: 'Clear Search',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },
} as const;

/**
 * Empty states for the Meal Plan screen
 */
export const MealPlanEmptyStates = {
  /** No meal plan for today */
  noMealPlan: {
    title: 'No Meals Planned',
    description: 'Plan your meals for the day to stay on track with your nutrition goals.',
    actionLabel: 'Generate Meal Plan',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** No meals for selected day */
  emptyDay: {
    title: 'Nothing Planned Yet',
    description: 'Add meals to this day or let us generate suggestions for you.',
    actionLabel: 'Add Meal',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** Meal plan completed */
  mealPlanComplete: {
    title: 'Great Job!',
    description: 'You\'ve completed all meals for today. Keep up the healthy eating!',
    useMascot: true,
    mascotExpression: 'celebrating' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },
} as const;

/**
 * Empty states for the Shopping List screen
 */
export const ShoppingListEmptyStates = {
  /** No shopping lists */
  noLists: {
    title: 'No Shopping Lists',
    description: 'Create a shopping list to keep track of ingredients you need.',
    actionLabel: 'Create List',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },

  /** Empty shopping list */
  emptyList: {
    title: 'Your List is Empty',
    description: 'Add items to your shopping list or generate one from your meal plan.',
    actionLabel: 'Add Items',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** All items purchased */
  allPurchased: {
    title: 'Shopping Complete!',
    description: 'You\'ve checked off all items. Time to cook something delicious!',
    useMascot: true,
    mascotExpression: 'chef-kiss' as LogoMascotExpression,
    mascotSize: 'large' as const,
  },
} as const;

/**
 * Empty states for the Profile screen
 */
export const ProfileEmptyStates = {
  /** No weight history */
  noWeightHistory: {
    title: 'No Weight Logs',
    description: 'Start tracking your weight to monitor your progress.',
    actionLabel: 'Log Weight',
    useMascot: true,
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'small' as const,
  },

  /** No preferences set */
  noPreferences: {
    title: 'Set Your Preferences',
    description: 'Tell us about your dietary preferences for personalized recommendations.',
    actionLabel: 'Get Started',
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },
} as const;

/**
 * Empty states for search/discover
 */
export const SearchEmptyStates = {
  /** Initial search state */
  initial: {
    title: 'Search for Recipes',
    description: 'Find recipes by name, ingredient, or cuisine.',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No results found */
  noResults: {
    title: 'No Results Found',
    description: 'We couldn\'t find any recipes matching your search. Try different keywords.',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },
} as const;

/**
 * Generic empty states for common scenarios
 */
export const GenericEmptyStates = {
  /** Loading state */
  loading: {
    title: 'Loading...',
    description: 'Just a moment while we fetch your content.',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** Error state */
  error: {
    title: 'Something Went Wrong',
    description: 'We encountered an error. Please try again.',
    actionLabel: 'Retry',
    useMascot: true,
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** Offline state */
  offline: {
    title: 'You\'re Offline',
    description: 'Please check your internet connection and try again.',
    actionLabel: 'Retry',
    useMascot: true,
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** Coming soon */
  comingSoon: {
    title: 'Coming Soon',
    description: 'This feature is under development. Stay tuned!',
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },

  /** No data */
  noData: {
    title: 'Nothing Here Yet',
    description: 'This section is empty. Start adding content!',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
  },
} as const;

/**
 * All empty states combined for easy access
 */
export const EmptyStates = {
  home: HomeEmptyStates,
  cookbook: CookbookEmptyStates,
  mealPlan: MealPlanEmptyStates,
  shoppingList: ShoppingListEmptyStates,
  profile: ProfileEmptyStates,
  search: SearchEmptyStates,
  generic: GenericEmptyStates,
} as const;

// Type exports
export type HomeEmptyStateKey = keyof typeof HomeEmptyStates;
export type CookbookEmptyStateKey = keyof typeof CookbookEmptyStates;
export type MealPlanEmptyStateKey = keyof typeof MealPlanEmptyStates;
export type ShoppingListEmptyStateKey = keyof typeof ShoppingListEmptyStates;
export type ProfileEmptyStateKey = keyof typeof ProfileEmptyStates;
export type SearchEmptyStateKey = keyof typeof SearchEmptyStates;
export type GenericEmptyStateKey = keyof typeof GenericEmptyStates;
