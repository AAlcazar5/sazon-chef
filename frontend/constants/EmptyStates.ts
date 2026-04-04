// Empty State Library for Sazon Chef app
// Predefined empty state configurations for all screens
// 9N: Pastel tint backgrounds + Sazon personality copy for every state

import { Icons } from './Icons';
import { Pastel, PastelDark } from './Colors';
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
  /** Pastel tint bg for light mode */
  pastelTint?: string;
  /** Pastel tint bg for dark mode */
  pastelTintDark?: string;
}

/**
 * Empty states for the Home screen
 */
export const HomeEmptyStates = {
  /** No recipes available */
  noRecipes: {
    title: 'Your kitchen awaits',
    description: "Let's find some delicious recipes tailored just for you!",
    actionLabel: 'Discover Recipes',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No search results */
  noSearchResults: {
    title: 'Hmm, nothing came up',
    description: 'Try tweaking your search or removing a filter — I bet we can find something.',
    actionLabel: 'Clear Filters',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No filtered results */
  noFilteredResults: {
    title: "That's a very specific craving",
    description: "Try loosening up the filters — there's a lot of good stuff hiding behind them.",
    actionLabel: 'Reset Filters',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.lavender,
    pastelTintDark: PastelDark.lavender,
  },

  /** Loading failed */
  loadingFailed: {
    title: 'Hmm, something went sideways',
    description: "Couldn't load recipes right now — let me try again for you.",
    actionLabel: 'Try Again',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.lavender,
    pastelTintDark: PastelDark.lavender,
  },
} as const;

/**
 * Empty states for the Cookbook screen
 */
export const CookbookEmptyStates = {
  /** No saved recipes */
  noSavedRecipes: {
    title: 'Your cookbook awaits',
    description: 'Save recipes you love by tapping the bookmark — they\'ll live here.',
    actionLabel: 'Explore Recipes',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No recipes in collection */
  emptyCollection: {
    title: 'This collection is waiting',
    description: 'Add some recipes here to keep your favorites organized.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.sage,
    pastelTintDark: PastelDark.sage,
  },

  /** No collections */
  noCollections: {
    title: 'Organize your way',
    description: 'Create collections by occasion, cuisine, or whatever makes sense to you.',
    actionLabel: 'Create Collection',
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.lavender,
    pastelTintDark: PastelDark.lavender,
  },

  /** No user-created recipes */
  noUserRecipes: {
    title: 'Your recipes, your rules',
    description: 'Got a family favorite? Add your own recipes here.',
    actionLabel: 'Create Recipe',
    useMascot: true,
    mascotExpression: 'proud' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.golden,
    pastelTintDark: PastelDark.golden,
  },

  /** No liked recipes */
  noLikedRecipes: {
    title: 'Nothing liked yet',
    description: 'Heart the recipes you enjoy and they\'ll show up here.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.blush,
    pastelTintDark: PastelDark.blush,
  },

  /** No disliked recipes */
  noDislikedRecipes: {
    title: 'All good so far',
    description: 'Dislike recipes to keep them out of your recommendations.',
    actionLabel: 'Browse Recipes',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.sky,
    pastelTintDark: PastelDark.sky,
  },

  /** Search returned no results */
  noSearchResults: {
    title: 'Nothing matched that',
    description: 'Try different ingredients, a cuisine name, or simpler keywords.',
    actionLabel: 'Clear Search',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },
} as const;

/**
 * Empty states for the Meal Plan screen
 */
export const MealPlanEmptyStates = {
  /** No meal plan for today */
  noMealPlan: {
    title: 'What are we eating today?',
    description: 'Let me put together a meal plan that hits your macros and tastes amazing.',
    actionLabel: 'Generate Meal Plan',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No meals for selected day */
  emptyDay: {
    title: 'This day is wide open',
    description: 'Add meals or let me suggest something — your call.',
    actionLabel: 'Add Meal',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.sky,
    pastelTintDark: PastelDark.sky,
  },

  /** Meal plan completed */
  mealPlanComplete: {
    title: 'Crushed it!',
    description: 'Every meal today — done. You\'re on a roll.',
    useMascot: true,
    mascotExpression: 'celebrating' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.sage,
    pastelTintDark: PastelDark.sage,
  },
} as const;

/**
 * Empty states for the Shopping List screen
 */
export const ShoppingListEmptyStates = {
  /** No shopping lists */
  noLists: {
    title: 'Ready to shop?',
    description: 'Create a list or generate one from your meal plan — we\'ll sort it by aisle.',
    actionLabel: 'Create List',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.sky,
    pastelTintDark: PastelDark.sky,
  },

  /** Empty shopping list */
  emptyList: {
    title: 'Nothing on the list yet',
    description: 'Add items manually or pull them straight from your meal plan.',
    actionLabel: 'Add Items',
    useMascot: true,
    mascotExpression: 'happy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** All items purchased */
  allPurchased: {
    title: 'All done — time to cook!',
    description: 'Every item checked off. Your kitchen is fully stocked.',
    useMascot: true,
    mascotExpression: 'chef-kiss' as LogoMascotExpression,
    mascotSize: 'large' as const,
    pastelTint: Pastel.sage,
    pastelTintDark: PastelDark.sage,
  },
} as const;

/**
 * Empty states for the Profile screen
 */
export const ProfileEmptyStates = {
  /** No weight history */
  noWeightHistory: {
    title: 'Track your progress',
    description: 'Log your weight over time to see how your nutrition is paying off.',
    actionLabel: 'Log Weight',
    useMascot: true,
    mascotExpression: 'supportive' as LogoMascotExpression,
    mascotSize: 'small' as const,
    pastelTint: Pastel.lavender,
    pastelTintDark: PastelDark.lavender,
  },

  /** No preferences set */
  noPreferences: {
    title: 'Make it yours',
    description: 'Set your dietary preferences and I\'ll tailor every recommendation to you.',
    actionLabel: 'Get Started',
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },
} as const;

/**
 * Empty states for search/discover
 */
export const SearchEmptyStates = {
  /** Initial search state */
  initial: {
    title: 'What are you craving?',
    description: 'Search by name, ingredient, or cuisine — I\'ll find it.',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No results found */
  noResults: {
    title: 'Let me think of something else...',
    description: 'Nothing matched that search — try different keywords or an ingredient.',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },
} as const;

/**
 * Generic empty states for common scenarios
 * 9N: Pastel tint backgrounds + Sazon personality copy
 */
export const GenericEmptyStates = {
  /** Loading state */
  loading: {
    title: 'Cooking up something...',
    description: 'Just a sec while we get things ready for you.',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** API error — confused on lavender */
  error: {
    title: 'Hmm, something went sideways',
    description: 'Let me try that again — sometimes the kitchen gets a little chaotic.',
    actionLabel: 'Try Again',
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.lavender,
    pastelTintDark: PastelDark.lavender,
  },

  /** No results — thinking on peach */
  noResults: {
    title: 'Let me think of something else...',
    description: 'Nothing matched that search, but I have other ideas.',
    actionLabel: 'Try Different Keywords',
    useMascot: true,
    mascotExpression: 'thinking' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** Network offline — sleepy on sky blue */
  offline: {
    title: "We'll be back when you're connected",
    description: 'Looks like the internet took a break. Check your connection and try again.',
    actionLabel: 'Retry',
    useMascot: true,
    mascotExpression: 'sleepy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.sky,
    pastelTintDark: PastelDark.sky,
  },

  /** Timeout — sleepy on golden */
  timeout: {
    title: 'That took too long',
    description: 'Want to give it another shot? Sometimes the servers need a moment.',
    actionLabel: 'Try Again',
    useMascot: true,
    mascotExpression: 'sleepy' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.golden,
    pastelTintDark: PastelDark.golden,
  },

  /** Coming soon */
  comingSoon: {
    title: 'Something tasty is brewing',
    description: "This feature is in the oven — we'll let you know when it's ready!",
    useMascot: true,
    mascotExpression: 'excited' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.peach,
    pastelTintDark: PastelDark.peach,
  },

  /** No data */
  noData: {
    title: 'Nothing here yet',
    description: "This spot is waiting for you to fill it up — let's get started!",
    useMascot: true,
    mascotExpression: 'curious' as LogoMascotExpression,
    mascotSize: 'medium' as const,
    pastelTint: Pastel.sage,
    pastelTintDark: PastelDark.sage,
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
