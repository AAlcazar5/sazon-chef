// frontend/hooks/useCostTracking.ts
// Custom hook for managing cost analysis and tracking

import { useState } from 'react';
import { shoppingListApi, userApi, costTrackingApi } from '../lib/api';

interface UseCostTrackingProps {
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
}

interface UseCostTrackingReturn {
  /** Cost analysis data */
  costAnalysis: any | null;
  /** Whether cost analysis is loading */
  loadingCostAnalysis: boolean;
  /** Shopping list savings data */
  shoppingListSavings: any | null;
  /** Whether savings are loading */
  loadingSavings: boolean;
  /** Load cost analysis for current meal plan */
  loadCostAnalysis: () => Promise<void>;
  /** Set cost analysis */
  setCostAnalysis: React.Dispatch<React.SetStateAction<any | null>>;
  /** Set loading cost analysis */
  setLoadingCostAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
  /** Set shopping list savings */
  setShoppingListSavings: React.Dispatch<React.SetStateAction<any | null>>;
  /** Set loading savings */
  setLoadingSavings: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Custom hook for cost analysis and tracking
 * Handles cost calculations, budget tracking, and savings suggestions
 */
export function useCostTracking({
  hourlyMeals,
}: UseCostTrackingProps): UseCostTrackingReturn {
  const [costAnalysis, setCostAnalysis] = useState<any | null>(null);
  const [loadingCostAnalysis, setLoadingCostAnalysis] = useState(false);
  const [shoppingListSavings, setShoppingListSavings] = useState<any | null>(null);
  const [loadingSavings, setLoadingSavings] = useState(false);

  /**
   * Load cost analysis for current meal plan
   * Calculates total cost, per-meal costs, and budget tracking
   */
  const loadCostAnalysis = async () => {
    try {
      setLoadingCostAnalysis(true);

      // Get user preferences for budget
      const prefsResponse = await userApi.getPreferences();
      const preferences = prefsResponse.data;

      const maxDailyBudget = preferences?.maxDailyFoodBudget
        ? preferences.maxDailyFoodBudget / 7 // Convert weekly to daily
        : undefined;
      const maxWeeklyBudget = preferences?.maxDailyFoodBudget;
      const maxMealCost = preferences?.maxMealCost;

      // Calculate cost from current recipes in view
      const recipeIds: string[] = [];
      Object.values(hourlyMeals).forEach((meals) => {
        meals.forEach((meal) => {
          if (meal.id && !recipeIds.includes(meal.id)) {
            recipeIds.push(meal.id);
          }
        });
      });

      if (recipeIds.length === 0) {
        setCostAnalysis(null);
        return;
      }

      // Calculate estimated cost from shopping list generation
      try {
        const shoppingListResponse = await shoppingListApi.generateFromMealPlan({
          recipeIds,
        });
        const estimatedCost = shoppingListResponse.data.estimatedCost;

        if (estimatedCost) {
          // Create cost analysis object
          const daysCount = 7; // Assume weekly
          const mealsCount = recipeIds.length;

          // Calculate per-meal costs and breakdown by meal type
          const mealCosts: Array<{ name: string; cost: number; mealType: string; hour: number }> = [];
          const costByMealType: Record<string, number> = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snacks: 0
          };

          // Get meal costs from hourlyMeals
          Object.entries(hourlyMeals).forEach(([hourStr, meals]) => {
            meals.forEach((meal) => {
              const mealCost = meal.estimatedCost || meal.estimatedCostPerServing || (estimatedCost / mealsCount);
              const mealType = meal.mealType || 'other';
              const mealTypeKey = mealType === 'snack' || mealType === 'dessert' ? 'snacks' : mealType;

              mealCosts.push({
                name: meal.name || meal.title || 'Unknown Meal',
                cost: mealCost,
                mealType: mealTypeKey,
                hour: parseInt(hourStr),
              });

              if (costByMealType[mealTypeKey] !== undefined) {
                costByMealType[mealTypeKey] += mealCost;
              }
            });
          });

          setCostAnalysis({
            totalCost: estimatedCost,
            costPerDay: estimatedCost / daysCount,
            costPerMeal: estimatedCost / mealsCount,
            mealsCount,
            daysCount,
            isWithinBudget: maxWeeklyBudget ? estimatedCost <= maxWeeklyBudget : true,
            budgetRemaining: maxWeeklyBudget ? Math.max(0, maxWeeklyBudget - estimatedCost) : undefined,
            budgetExceeded: maxWeeklyBudget && estimatedCost > maxWeeklyBudget
              ? estimatedCost - maxWeeklyBudget
              : undefined,
            recommendations: maxWeeklyBudget && estimatedCost > maxWeeklyBudget
              ? [`Meal plan exceeds weekly budget by $${(estimatedCost - maxWeeklyBudget).toFixed(2)}. Consider cheaper recipe alternatives.`]
              : maxWeeklyBudget
              ? [`You have $${(maxWeeklyBudget - estimatedCost).toFixed(2)} remaining in your weekly budget.`]
              : undefined,
            mealCosts,
            costByMealType,
          });

          // Load savings suggestions for shopping list
          if (shoppingListResponse.data.items) {
            try {
              setLoadingSavings(true);
              const ingredientNames = shoppingListResponse.data.items
                .map((item: any) => item.name.toLowerCase())
                .filter((name: string) => name.length > 0);

              if (ingredientNames.length > 0) {
                const bestStoreResponse = await costTrackingApi.getBestStoreForShoppingList(ingredientNames);
                setShoppingListSavings(bestStoreResponse.data);
              }
            } catch (error) {
              console.log('Savings not available:', error);
            } finally {
              setLoadingSavings(false);
            }
          }
        } else {
          setCostAnalysis(null);
        }
      } catch (error) {
        // Cost calculation is optional
        console.log('Cost analysis not available:', error);
        setCostAnalysis(null);
      }
    } catch (error: any) {
      // Cost analysis is optional, don't show errors
      console.log('Cost analysis not available:', error.message);
      setCostAnalysis(null);
    } finally {
      setLoadingCostAnalysis(false);
    }
  };

  return {
    costAnalysis,
    loadingCostAnalysis,
    shoppingListSavings,
    loadingSavings,
    loadCostAnalysis,
    setCostAnalysis,
    setLoadingCostAnalysis,
    setShoppingListSavings,
    setLoadingSavings,
  };
}
