// frontend/hooks/useMealPlanData.ts
// Custom hook for managing meal plan data loading and state

import { useState, useRef, Dispatch, SetStateAction } from 'react';
import { mealPlanApi, mealPrepApi } from '../lib/api';
import type { WeeklyPlan, DailySuggestion } from '../types';

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseMealPlanDataProps {
  /** Selected date for meal plan */
  selectedDate: Date;
  /** Whether component is mounted (to prevent state updates after unmount) */
  isMountedRef: React.MutableRefObject<boolean>;
  /** Meal type to hour mapping */
  mealTypeToHour: Record<string, number>;
}

interface UseMealPlanDataReturn {
  /** Weekly meal plan data */
  weeklyPlan: any | null;
  /** Daily suggestion data */
  dailySuggestion: DailySuggestion | null;
  /** Loading state */
  loading: boolean;
  /** Refreshing state (for pull-to-refresh) */
  refreshing: boolean;
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Daily macro totals */
  dailyMacros: Macros;
  /** Total prep time for the day */
  totalPrepTime: number;
  /** Thawing reminders */
  thawingReminders: any[];
  /** Loading state for thawing reminders */
  loadingThawingReminders: boolean;
  /** Meal completion status by meal ID */
  mealCompletionStatus: Record<string, boolean>;
  /** Meal notes by meal ID */
  mealNotes: Record<string, string>;
  /** Week dates array */
  weekDates: Date[];
  /** Load meal plan data */
  loadMealPlan: () => Promise<void>;
  /** Refresh meal plan data */
  refreshMealPlan: () => Promise<void>;
  /** Get meals for a specific date */
  getMealsForDate: (date: Date) => any[];
  /** Update hourly meals (supports functional updates) */
  setHourlyMeals: Dispatch<SetStateAction<Record<number, any[]>>>;
  /** Update daily macros (supports functional updates) */
  setDailyMacros: Dispatch<SetStateAction<Macros>>;
  /** Update total prep time (supports functional updates) */
  setTotalPrepTime: Dispatch<SetStateAction<number>>;
  /** Update meal completion status (supports functional updates) */
  setMealCompletionStatus: Dispatch<SetStateAction<Record<string, boolean>>>;
  /** Update meal notes (supports functional updates) */
  setMealNotes: Dispatch<SetStateAction<Record<string, string>>>;
  /** Update weekly plan (supports functional updates) */
  setWeeklyPlan: Dispatch<SetStateAction<any | null>>;
}

/**
 * Get week dates starting from Sunday
 */
function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(startOfWeek);
    weekDate.setDate(startOfWeek.getDate() + i);
    weekDates.push(weekDate);
  }
  return weekDates;
}

/**
 * Custom hook for managing meal plan data
 * Handles loading, refreshing, and state management for weekly meal plans
 */
export function useMealPlanData({
  selectedDate,
  isMountedRef,
  mealTypeToHour,
}: UseMealPlanDataProps): UseMealPlanDataReturn {
  const [weeklyPlan, setWeeklyPlan] = useState<any | null>(null);
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hourlyMeals, setHourlyMeals] = useState<Record<number, any[]>>({});
  const [dailyMacros, setDailyMacros] = useState<Macros>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [totalPrepTime, setTotalPrepTime] = useState(0);
  const [thawingReminders, setThawingReminders] = useState<any[]>([]);
  const [loadingThawingReminders, setLoadingThawingReminders] = useState(false);
  const [mealCompletionStatus, setMealCompletionStatus] = useState<Record<string, boolean>>({});
  const [mealNotes, setMealNotes] = useState<Record<string, string>>({});

  const weekDates = getWeekDates(selectedDate);

  /**
   * Load thawing reminders for upcoming days
   */
  const loadThawingReminders = async () => {
    try {
      setLoadingThawingReminders(true);
      const response = await mealPrepApi.getThawingReminders(3); // Get reminders for next 3 days
      setThawingReminders(response.data.reminders || []);
    } catch (error) {
      console.error('📱 MealPlan: Error loading thawing reminders', error);
    } finally {
      setLoadingThawingReminders(false);
    }
  };

  /**
   * Get meals for a specific date from weekly plan
   */
  const getMealsForDate = (date: Date): any[] => {
    const dateStr = date.toISOString().split('T')[0];
    const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
    const meals: any[] = [];

    if (dayMeals.breakfast?.recipe) {
      meals.push({ ...dayMeals.breakfast.recipe, mealType: 'breakfast', hour: 7 });
    }
    if (dayMeals.lunch?.recipe) {
      meals.push({ ...dayMeals.lunch.recipe, mealType: 'lunch', hour: 12 });
    }
    if (dayMeals.dinner?.recipe) {
      meals.push({ ...dayMeals.dinner.recipe, mealType: 'dinner', hour: 18 });
    }
    if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
      dayMeals.snacks.forEach((snack: any) => {
        if (snack?.recipe) {
          meals.push({ ...snack.recipe, mealType: 'snack', hour: 15 });
        }
      });
    }

    return meals;
  };

  /**
   * Load meal plan data for the current week
   */
  const loadMealPlan = async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      console.log('📱 MealPlan: Loading meal plan data');

      // Load weekly plan (includes meal prep sessions and portions)
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const weeklyResponse = await mealPlanApi.getWeeklyPlan({ startDate, endDate });
      setWeeklyPlan(weeklyResponse.data);

      // Load saved meals and convert to hourlyMeals format
      const savedMeals: Record<number, any[]> = {};
      const selectedDateStr = selectedDate.toISOString().split('T')[0];

      if (weeklyResponse.data?.weeklyPlan?.[selectedDateStr]?.meals) {
        const dayMeals = weeklyResponse.data.weeklyPlan[selectedDateStr].meals;

        // Helper to add meal to savedMeals
        const addMeal = (mealData: any, mealType: string) => {
          if (!mealData?.recipe) return;

          const hour = mealTypeToHour[mealType];
          if (!savedMeals[hour]) savedMeals[hour] = [];

          savedMeals[hour].push({
            id: mealData.recipe.id,
            mealPlanMealId: mealData.id,
            name: mealData.recipe.title,
            description: mealData.recipe.description,
            calories: mealData.recipe.calories,
            protein: mealData.recipe.protein,
            carbs: mealData.recipe.carbs,
            fat: mealData.recipe.fat,
            cookTime: mealData.recipe.cookTime,
            difficulty: mealData.recipe.difficulty,
            cuisine: mealData.recipe.cuisine,
            imageUrl: mealData.recipe.imageUrl,
            isCompleted: mealData.isCompleted || false,
            notes: mealData.notes || '',
          });
        };

        // Add breakfast, lunch, dinner
        addMeal(dayMeals.breakfast, 'breakfast');
        addMeal(dayMeals.lunch, 'lunch');
        addMeal(dayMeals.dinner, 'dinner');

        // Handle snacks (array)
        if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
          dayMeals.snacks.forEach((snack: any) => addMeal(snack, 'snack'));
        }

        // Calculate daily macros from saved meals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        Object.values(savedMeals).flat().forEach((meal: any) => {
          totalCalories += meal.calories || 0;
          totalProtein += meal.protein || 0;
          totalCarbs += meal.carbs || 0;
          totalFat += meal.fat || 0;
        });

        // Calculate total prep time
        let totalCookTime = 0;
        Object.values(savedMeals).flat().forEach((meal: any) => {
          totalCookTime += meal.cookTime || 0;
        });
        setTotalPrepTime(totalCookTime);

        // Load meal completion status and notes
        const completionStatus: Record<string, boolean> = {};
        const notesData: Record<string, string> = {};
        Object.values(savedMeals).flat().forEach((meal: any) => {
          if (meal.mealPlanMealId) {
            completionStatus[meal.mealPlanMealId] = meal.isCompleted || false;
            if (meal.notes) {
              notesData[meal.mealPlanMealId] = meal.notes;
            }
          }
        });
        setMealCompletionStatus(completionStatus);
        setMealNotes(notesData);

        setHourlyMeals(savedMeals);
        setDailyMacros({
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        });
      }

      // Load daily suggestion for selected date
      const dailyResponse = await mealPlanApi.getDailySuggestion();
      setDailySuggestion(dailyResponse.data);

      // Load thawing reminders
      loadThawingReminders();

      console.log('📱 MealPlan: Meal plan loaded successfully');
    } catch (error) {
      console.error('📱 MealPlan: Error loading meal plan', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh meal plan data (for pull-to-refresh)
   */
  const refreshMealPlan = async () => {
    try {
      setRefreshing(true);
      await loadMealPlan();
    } catch (error) {
      console.error('📱 MealPlan: Error refreshing meal plan', error);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    weeklyPlan,
    dailySuggestion,
    loading,
    refreshing,
    hourlyMeals,
    dailyMacros,
    totalPrepTime,
    thawingReminders,
    loadingThawingReminders,
    mealCompletionStatus,
    mealNotes,
    weekDates,
    loadMealPlan,
    refreshMealPlan,
    getMealsForDate,
    setHourlyMeals,
    setDailyMacros,
    setTotalPrepTime,
    setMealCompletionStatus,
    setMealNotes,
    setWeeklyPlan,
  };
}
