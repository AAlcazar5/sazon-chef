// frontend/hooks/useMealSwap.ts
// Custom hook for managing meal swap functionality

import { useState, Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { mealPlanApi } from '../lib/api';

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseMealSwapProps {
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Selected date for meal plan */
  selectedDate: Date;
  /** Update hourly meals */
  setHourlyMeals: Dispatch<SetStateAction<Record<number, any[]>>>;
  /** Update daily macros */
  setDailyMacros: Dispatch<SetStateAction<Macros>>;
  /** Update total prep time */
  setTotalPrepTime: Dispatch<SetStateAction<number>>;
}

interface UseMealSwapReturn {
  /** Whether swap modal is visible */
  showSwapModal: boolean;
  /** Swap suggestions for modal */
  swapSuggestions: any[];
  /** Selected meal for swap */
  selectedMealForSwap: any | null;
  /** ID of expanded swap meal (inline suggestions) */
  expandedSwapMealId: string | null;
  /** ID of meal currently loading swap suggestions */
  loadingSwapSuggestions: string | null;
  /** Cached swap suggestions by meal ID */
  mealSwapSuggestions: Record<string, any[]>;
  /** Get swap suggestions for a meal (inline) */
  handleGetSwapSuggestions: (mealId: string, meal: any) => Promise<void>;
  /** Swap a meal with a new recipe */
  handleSwapMeal: (mealId: string, newRecipe: any, currentMeal: any) => Promise<void>;
  /** Set swap modal visibility */
  setShowSwapModal: Dispatch<SetStateAction<boolean>>;
  /** Set swap suggestions */
  setSwapSuggestions: Dispatch<SetStateAction<any[]>>;
  /** Set selected meal for swap */
  setSelectedMealForSwap: Dispatch<SetStateAction<any | null>>;
  /** Set expanded swap meal ID */
  setExpandedSwapMealId: Dispatch<SetStateAction<string | null>>;
}

/**
 * Custom hook for meal swap functionality
 * Handles fetching swap suggestions and swapping meals
 */
export function useMealSwap({
  hourlyMeals,
  selectedDate,
  setHourlyMeals,
  setDailyMacros,
  setTotalPrepTime,
}: UseMealSwapProps): UseMealSwapReturn {
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapSuggestions, setSwapSuggestions] = useState<any[]>([]);
  const [selectedMealForSwap, setSelectedMealForSwap] = useState<any | null>(null);
  const [expandedSwapMealId, setExpandedSwapMealId] = useState<string | null>(null);
  const [loadingSwapSuggestions, setLoadingSwapSuggestions] = useState<string | null>(null);
  const [mealSwapSuggestions, setMealSwapSuggestions] = useState<Record<string, any[]>>({});

  /**
   * Get swap suggestions for a meal (inline version)
   * Toggles expansion and loads suggestions if not cached
   */
  const handleGetSwapSuggestions = async (mealId: string, meal: any) => {
    // Toggle expansion
    if (expandedSwapMealId === mealId) {
      setExpandedSwapMealId(null);
      return;
    }

    // If suggestions already loaded, just expand
    if (mealSwapSuggestions[mealId] && mealSwapSuggestions[mealId].length > 0) {
      setExpandedSwapMealId(mealId);
      return;
    }

    // Load suggestions
    try {
      setLoadingSwapSuggestions(mealId);
      const response = await mealPlanApi.getMealSwapSuggestions(mealId);
      const suggestions = response.data.suggestions || [];
      setMealSwapSuggestions(prev => ({
        ...prev,
        [mealId]: suggestions,
      }));
      setExpandedSwapMealId(mealId);
    } catch (error: any) {
      console.error('Error getting swap suggestions:', error);
      Alert.alert('Error', 'Failed to get meal swap suggestions');
    } finally {
      setLoadingSwapSuggestions(null);
    }
  };

  /**
   * Swap a meal with a new recipe
   * Updates hourly meals and recalculates macros
   */
  const handleSwapMeal = async (mealId: string, newRecipe: any, currentMeal: any) => {
    try {
      // Find the meal in hourlyMeals
      let foundMeal: any = null;
      let foundHour: number | null = null;
      let foundIndex: number | null = null;

      Object.entries(hourlyMeals).forEach(([hourStr, meals]) => {
        const index = meals.findIndex((m: any) => m.mealPlanMealId === mealId);
        if (index !== -1) {
          foundMeal = meals[index];
          foundHour = parseInt(hourStr);
          foundIndex = index;
        }
      });

      if (!foundMeal || foundHour === null || foundIndex === null) {
        Alert.alert('Error', 'Meal not found in meal plan');
        return;
      }

      // Update the meal with new recipe data
      const updatedMeal = {
        ...foundMeal,
        id: newRecipe.recipe.id,
        name: newRecipe.recipe.title,
        description: newRecipe.recipe.description,
        calories: newRecipe.recipe.calories,
        protein: newRecipe.recipe.protein,
        carbs: newRecipe.recipe.carbs,
        fat: newRecipe.recipe.fat,
        cookTime: newRecipe.recipe.cookTime,
        difficulty: newRecipe.recipe.difficulty,
        cuisine: newRecipe.recipe.cuisine,
        imageUrl: newRecipe.recipe.imageUrl,
      };

      // Update hourlyMeals and recalculate macros
      setHourlyMeals(prev => {
        const updated = { ...prev };
        updated[foundHour!] = [...updated[foundHour!]];
        updated[foundHour!][foundIndex!] = updatedMeal;

        // Recalculate daily macros from all meals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalCookTime = 0;

        Object.values(updated).forEach((meals) => {
          meals.forEach((m: any) => {
            totalCalories += m.calories || 0;
            totalProtein += m.protein || 0;
            totalCarbs += m.carbs || 0;
            totalFat += m.fat || 0;
            totalCookTime += m.cookTime || 0;
          });
        });

        setDailyMacros({
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        });

        setTotalPrepTime(totalCookTime);

        return updated;
      });

      // Update backend - remove old meal and add new one
      if (mealId && foundMeal.mealPlanMealId) {
        try {
          // Get the date from the meal plan
          const dateStr = selectedDate.toISOString().split('T')[0];
          const mealType = foundMeal.mealType || (
            foundHour === 7 ? 'breakfast' :
            foundHour === 12 ? 'lunch' :
            foundHour === 18 ? 'dinner' :
            'snack'
          );

          // Note: Backend sync happens on next load
          // Future enhancement: Add dedicated swap endpoint
        } catch (error) {
          console.error('Error updating meal in backend:', error);
          // Continue anyway - local state is updated
        }
      }

      // Collapse swap suggestions
      setExpandedSwapMealId(null);

      // Clear swap suggestions for this meal to force refresh next time
      setMealSwapSuggestions(prev => {
        const updated = { ...prev };
        delete updated[mealId];
        return updated;
      });

      Alert.alert('Success', `Swapped to ${newRecipe.recipe.title}`);
    } catch (error: any) {
      console.error('Error swapping meal:', error);
      Alert.alert('Error', 'Failed to swap meal');
    }
  };

  return {
    showSwapModal,
    swapSuggestions,
    selectedMealForSwap,
    expandedSwapMealId,
    loadingSwapSuggestions,
    mealSwapSuggestions,
    handleGetSwapSuggestions,
    handleSwapMeal,
    setShowSwapModal,
    setSwapSuggestions,
    setSelectedMealForSwap,
    setExpandedSwapMealId,
  };
}
