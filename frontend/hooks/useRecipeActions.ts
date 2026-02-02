// frontend/hooks/useRecipeActions.ts
// Custom hook for recipe action menu handlers

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { recipeApi, mealPlanApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import type { SuggestedRecipe } from '../types';

interface UseRecipeActionsOptions {
  selectedRecipe: SuggestedRecipe | null;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSimilarRecipesFound?: (recipes: SuggestedRecipe[]) => void;
}

interface UseRecipeActionsReturn {
  handleAddToMealPlan: () => void;
  handleViewSimilar: () => Promise<void>;
  handleHealthify: () => Promise<void>;
  handleReportIssue: () => void;
}

export function useRecipeActions(options: UseRecipeActionsOptions): UseRecipeActionsReturn {
  const { selectedRecipe, onClose, showToast, onSimilarRecipesFound } = options;

  // Add recipe to meal plan
  const addRecipeToMealPlan = useCallback(async (mealType: string) => {
    if (!selectedRecipe) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await mealPlanApi.addRecipeToMeal({
        recipeId: selectedRecipe.id,
        date: today,
        mealType,
      });

      HapticPatterns.success();
      showToast(`Added to ${mealType}!`, 'success');
      router.push('/(tabs)/meal-plan');
    } catch (error: any) {
      console.error('Error adding to meal plan:', error);
      HapticPatterns.error();
      Alert.alert('Error', error?.message || 'Failed to add recipe to meal plan');
    }
  }, [selectedRecipe, showToast]);

  const handleAddToMealPlan = useCallback(() => {
    if (!selectedRecipe) return;

    Alert.alert(
      'Add to Meal Plan',
      'Which meal would you like to add this to?',
      [
        { text: 'Breakfast', onPress: () => addRecipeToMealPlan('breakfast') },
        { text: 'Lunch', onPress: () => addRecipeToMealPlan('lunch') },
        { text: 'Dinner', onPress: () => addRecipeToMealPlan('dinner') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [selectedRecipe, addRecipeToMealPlan]);

  // View similar recipes
  const handleViewSimilar = useCallback(async () => {
    if (!selectedRecipe) return;

    try {
      const response = await recipeApi.getSimilarRecipes(selectedRecipe.id, 10);
      if (response.data && response.data.length > 0) {
        if (onSimilarRecipesFound) {
          onSimilarRecipesFound(response.data);
        }
        showToast(`Found ${response.data.length} similar recipes`, 'success');
        onClose();
      } else {
        Alert.alert('No Similar Recipes', "We couldn't find any similar recipes at the moment.");
      }
    } catch (error) {
      console.error('Error fetching similar recipes:', error);
      Alert.alert('Error', 'Failed to load similar recipes');
    }
  }, [selectedRecipe, showToast, onClose, onSimilarRecipesFound]);

  // Healthify recipe
  const handleHealthify = useCallback(async () => {
    if (!selectedRecipe) return;

    try {
      showToast('Healthifying recipe...', 'info');
      const response = await recipeApi.healthifyRecipe(selectedRecipe.id);

      if (response.data) {
        HapticPatterns.success();
        showToast('Recipe healthified!', 'success');
        router.push(`/modal?id=${response.data.id || selectedRecipe.id}`);
        onClose();
      }
    } catch (error: any) {
      console.error('Error healthifying recipe:', error);
      HapticPatterns.error();
      Alert.alert('Error', error?.message || 'Failed to healthify recipe');
    }
  }, [selectedRecipe, showToast, onClose]);

  // Report issue helper
  const reportIssue = useCallback((issueType: string) => {
    HapticPatterns.success();
    showToast("Thank you for reporting! We'll look into it.", 'success');
    onClose();
  }, [showToast, onClose]);

  const handleReportIssue = useCallback(() => {
    if (!selectedRecipe) return;

    Alert.alert(
      'Report Issue',
      'What issue would you like to report?',
      [
        { text: 'Incorrect Information', onPress: () => reportIssue('incorrect_info') },
        { text: 'Missing Ingredients', onPress: () => reportIssue('missing_ingredients') },
        { text: 'Wrong Instructions', onPress: () => reportIssue('wrong_instructions') },
        { text: 'Other', onPress: () => reportIssue('other') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [selectedRecipe, reportIssue]);

  return {
    handleAddToMealPlan,
    handleViewSimilar,
    handleHealthify,
    handleReportIssue,
  };
}

export default useRecipeActions;
