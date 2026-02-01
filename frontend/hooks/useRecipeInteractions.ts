// frontend/hooks/useRecipeInteractions.ts
// Hook for managing recipe user interactions (like/dislike, action menu)

import { useState, useCallback } from 'react';
import type { SuggestedRecipe } from '../types';
import type { UserFeedback } from '../utils/recipeUtils';

export interface UseRecipeInteractionsReturn {
  /** User feedback state for all recipes */
  userFeedback: Record<string, UserFeedback>;
  /** Which recipe's feedback is currently loading */
  feedbackLoading: string | null;
  /** Whether the action menu is visible */
  actionMenuVisible: boolean;
  /** The recipe selected for the action menu */
  selectedRecipeForMenu: SuggestedRecipe | null;
  /** Set user feedback state */
  setUserFeedback: (feedback: Record<string, UserFeedback>) => void;
  /** Set feedback loading state */
  setFeedbackLoading: (recipeId: string | null) => void;
  /** Open action menu for a recipe */
  openActionMenu: (recipe: SuggestedRecipe) => void;
  /** Close action menu */
  closeActionMenu: () => void;
  /** Update feedback for a specific recipe */
  updateRecipeFeedback: (recipeId: string, feedback: UserFeedback) => void;
  /** Initialize feedback state for recipes */
  initializeFeedback: (recipes: SuggestedRecipe[]) => void;
}

/**
 * Hook for managing recipe user interactions
 * Handles like/dislike feedback state and action menu state
 */
export function useRecipeInteractions(): UseRecipeInteractionsReturn {
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedRecipeForMenu, setSelectedRecipeForMenu] = useState<SuggestedRecipe | null>(null);

  // Open action menu for a recipe
  const openActionMenu = useCallback((recipe: SuggestedRecipe) => {
    setSelectedRecipeForMenu(recipe);
    setActionMenuVisible(true);
  }, []);

  // Close action menu
  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setSelectedRecipeForMenu(null);
  }, []);

  // Update feedback for a specific recipe
  const updateRecipeFeedback = useCallback((recipeId: string, feedback: UserFeedback) => {
    setUserFeedback(prev => ({
      ...prev,
      [recipeId]: feedback,
    }));
  }, []);

  // Initialize feedback state for a list of recipes
  const initializeFeedback = useCallback((recipes: SuggestedRecipe[]) => {
    const initialFeedback: Record<string, UserFeedback> = {};
    recipes.forEach((recipe) => {
      if (recipe?.id) {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      }
    });
    setUserFeedback(initialFeedback);
  }, []);

  return {
    userFeedback,
    feedbackLoading,
    actionMenuVisible,
    selectedRecipeForMenu,
    setUserFeedback,
    setFeedbackLoading,
    openActionMenu,
    closeActionMenu,
    updateRecipeFeedback,
    initializeFeedback,
  };
}

export default useRecipeInteractions;
