// frontend/hooks/useShoppingListGeneration.ts
// Custom hook for shopping list generation from meal plan

import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { shoppingListApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';

interface UsShoppingListGenerationProps {
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Week dates array */
  weekDates: Date[];
  /** Whether shopping list is being generated */
  generatingShoppingList: boolean;
  /** Set generating shopping list state */
  setGeneratingShoppingList: Dispatch<SetStateAction<boolean>>;
  /** Set shopping list name modal visibility */
  setShowShoppingListNameModal: Dispatch<SetStateAction<boolean>>;
  /** Shopping list name input value */
  shoppingListName: string;
  /** Set shopping list name */
  setShoppingListName: Dispatch<SetStateAction<string>>;
  /** Set shopping list success message */
  setShoppingListSuccessMessage: Dispatch<SetStateAction<{ title: string; message: string }>>;
  /** Set shopping list success modal visibility */
  setShowShoppingListSuccessModal: Dispatch<SetStateAction<boolean>>;
}

interface UseShoppingListGenerationReturn {
  /** Open shopping list name modal */
  handleGenerateShoppingList: () => void;
  /** Confirm and generate shopping list */
  handleConfirmShoppingListName: () => Promise<void>;
}

export function useShoppingListGeneration({
  hourlyMeals,
  weekDates,
  generatingShoppingList,
  setGeneratingShoppingList,
  setShowShoppingListNameModal,
  shoppingListName,
  setShoppingListName,
  setShoppingListSuccessMessage,
  setShowShoppingListSuccessModal,
}: UsShoppingListGenerationProps): UseShoppingListGenerationReturn {

  const handleGenerateShoppingList = () => {
    if (generatingShoppingList) return;
    setShoppingListName('');
    setShowShoppingListNameModal(true);
  };

  const handleConfirmShoppingListName = async () => {
    if (generatingShoppingList) return;

    try {
      setGeneratingShoppingList(true);
      setShowShoppingListNameModal(false);
      HapticPatterns.buttonPressPrimary();

      // Get current week dates
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      // Collect all recipe IDs from hourly meals (frontend state)
      const recipeIds: string[] = [];
      Object.values(hourlyMeals).forEach((meals) => {
        meals.forEach((meal) => {
          if (meal.id && !recipeIds.includes(meal.id)) {
            recipeIds.push(meal.id);
          }
        });
      });

      // Check if there are any recipes to generate from
      if (recipeIds.length === 0) {
        Alert.alert(
          'No Recipes Found',
          'Please add some recipes to your meal plan first before generating a shopping list.',
          [{ text: 'OK' }]
        );
        setGeneratingShoppingList(false);
        return;
      }

      // Try to generate from meal plan first, fallback to recipe IDs if no meal plan exists
      let response;
      try {
        response = await shoppingListApi.generateFromMealPlan({
          startDate,
          endDate,
          name: shoppingListName.trim() || undefined,
        });
      } catch (error: any) {
        console.log('🔍 Error caught, checking for fallback:', {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          errorData: error.response?.data,
          recipeIdsCount: recipeIds.length,
          fullError: JSON.stringify(error, null, 2),
        });

        // If no meal plan found, try using recipe IDs from frontend state
        const statusCode = error.response?.status;
        const errorCode = error.code;
        const errorMessage = String(error.message || '');
        const errorData = error.response?.data || error.details || {};
        const errorText = String(errorData.error || errorData.message || errorMessage || '');

        // Check if this is a 404 or "no meal plan" error
        const is404 = statusCode === 404 ||
                     errorCode === 'HTTP_404' ||
                     errorMessage.includes('404') ||
                     errorMessage.includes('No active meal plan') ||
                     errorMessage.includes('meal plan not found') ||
                     errorText.includes('No active meal plan') ||
                     errorText.includes('meal plan not found') ||
                     errorText.includes('404');

        console.log('🔍 404 Check:', {
          statusCode,
          errorCode,
          is404,
          hasRecipeIds: recipeIds.length > 0,
          errorText
        });

        if (is404 && recipeIds.length > 0) {
          console.log('📝 No meal plan found, using recipes from current view:', recipeIds);
          try {
            response = await shoppingListApi.generateFromMealPlan({
              recipeIds,
              name: shoppingListName.trim() || undefined,
            });
            console.log('✅ Fallback successful, shopping list generated from recipes');
          } catch (fallbackError: any) {
            console.error('❌ Fallback also failed:', fallbackError);
            throw fallbackError;
          }
        } else {
          console.log('❌ Not using fallback:', {
            is404,
            hasRecipeIds: recipeIds.length > 0,
            reason: !is404 ? 'Not a 404 error' : 'No recipe IDs available'
          });
          throw error;
        }
      }

      const { shoppingList, itemsAdded, estimatedCost } = response.data;

      HapticPatterns.success();

      let message = `Shopping list created with ${itemsAdded} new items!`;
      if (estimatedCost) {
        message += ` Estimated cost: $${estimatedCost.toFixed(2)}`;
      }

      setShoppingListSuccessMessage({
        title: 'Shopping List Generated!',
        message: message,
      });
      setShowShoppingListSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Error generating shopping list:', error);
      HapticPatterns.error();

      const message = error.response?.data?.error || error.message || 'Failed to generate shopping list';
      Alert.alert('Error', message);
    } finally {
      setGeneratingShoppingList(false);
    }
  };

  return {
    handleGenerateShoppingList,
    handleConfirmShoppingListName,
  };
}
