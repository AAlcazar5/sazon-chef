// frontend/hooks/useRecipeFeedback.ts
// Custom hook for handling recipe like/dislike feedback

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { recipeApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { analytics } from '../utils/analytics';
import type { SuggestedRecipe } from '../types';
import type { UserFeedback } from '../utils/recipeUtils';

interface UseRecipeFeedbackOptions {
  userId?: string;
  source?: string;
  setFeedbackLoading: (recipeId: string | null) => void;
  updateRecipeFeedback: (recipeId: string, feedback: UserFeedback) => void;
  onRecipesUpdate?: (updater: (prev: SuggestedRecipe[]) => SuggestedRecipe[]) => void;
}

interface UseRecipeFeedbackReturn {
  handleLike: (recipeId: string) => Promise<void>;
  handleDislike: (recipeId: string, reason?: string) => Promise<void>;
}

export function useRecipeFeedback(options: UseRecipeFeedbackOptions): UseRecipeFeedbackReturn {
  const {
    userId,
    source = 'home_screen',
    setFeedbackLoading,
    updateRecipeFeedback,
    onRecipesUpdate,
  } = options;

  const handleLike = useCallback(async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 Liking recipe', recipeId);

      // Update UI immediately (optimistic update)
      updateRecipeFeedback(recipeId, { liked: true, disliked: false });

      await recipeApi.likeRecipe(recipeId);

      // Track like action
      if (userId) {
        analytics.trackRecipeInteraction('like', recipeId, { source });
      }

      // Update recipe score in local state
      if (onRecipesUpdate) {
        onRecipesUpdate(prev => prev.map(recipe =>
          recipe.id === recipeId
            ? { ...recipe, score: { ...recipe.score, total: recipe.score.total + 5 } }
            : recipe
        ));
      }

      HapticPatterns.success();
      Alert.alert('Liked!', "We'll show you more recipes like this");
    } catch (error: any) {
      console.error('📱 Like error', error);
      HapticPatterns.error();

      // Revert UI state on error
      updateRecipeFeedback(recipeId, { liked: false, disliked: false });

      Alert.alert('Error', 'Failed to like recipe');
    } finally {
      setFeedbackLoading(null);
    }
  }, [userId, source, setFeedbackLoading, updateRecipeFeedback, onRecipesUpdate]);

  const handleDislike = useCallback(async (recipeId: string, reason?: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 Disliking recipe', recipeId, reason ? `(reason: ${reason})` : '');

      // Update UI immediately (optimistic update)
      updateRecipeFeedback(recipeId, { liked: false, disliked: true });

      await recipeApi.dislikeRecipe(recipeId, reason);

      // Track dislike action
      if (userId) {
        analytics.trackRecipeInteraction('dislike', recipeId, { source });
      }

      // Update recipe score in local state
      if (onRecipesUpdate) {
        onRecipesUpdate(prev => prev.map(recipe =>
          recipe.id === recipeId
            ? { ...recipe, score: { ...recipe.score, total: Math.max(0, recipe.score.total - 5) } }
            : recipe
        ));
      }

      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Dislike error', error);
      HapticPatterns.error();

      // Revert UI state on error
      updateRecipeFeedback(recipeId, { liked: false, disliked: false });

      Alert.alert('Error', 'Failed to dislike recipe');
    } finally {
      setFeedbackLoading(null);
    }
  }, [userId, source, setFeedbackLoading, updateRecipeFeedback, onRecipesUpdate]);

  return {
    handleLike,
    handleDislike,
  };
}

export default useRecipeFeedback;
