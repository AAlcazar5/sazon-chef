// frontend/hooks/useMealPlanActions.ts
// Custom hook for meal plan action handlers and business logic

import { useEffect, Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { mealPlanApi, aiRecipeApi, userApi, costTrackingApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { HapticChoreography } from '../utils/hapticChoreography';
import type { HourData } from './useMealPlanUI';
import type { MealPlanTemplate, RecurringMeal } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface UseMealPlanActionsProps {
  // From useMealPlanData
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Weekly meal plan data */
  weeklyPlan: any;
  /** Week dates array (Sunday through Saturday) */
  weekDates: Date[];
  /** Currently selected date */
  selectedDate: Date;
  /** Setter for selected date */
  setSelectedDate: Dispatch<SetStateAction<Date>>;
  /** Setter for hourly meals */
  setHourlyMeals: Dispatch<SetStateAction<Record<number, any[]>>>;
  /** Setter for daily macro totals */
  setDailyMacros: Dispatch<SetStateAction<Macros>>;
  /** Setter for total prep time */
  setTotalPrepTime: Dispatch<SetStateAction<number>>;
  /** Load meal plan data for the current week */
  loadMealPlan: () => Promise<void>;
  /** Refresh meal plan data (for pull-to-refresh) */
  refreshMealPlan: () => Promise<void>;

  // From useGenerationState
  /** Whether a plan is currently being generated */
  generatingPlan: boolean;
  /** Setter for generating plan state */
  setGeneratingPlan: Dispatch<SetStateAction<boolean>>;
  /** Setter for meal/snack selector visibility */
  setShowMealSnackSelector: Dispatch<SetStateAction<boolean>>;
  /** Number of meals selected for generation */
  selectedMeals: number;
  /** Number of snacks selected for generation */
  selectedSnacks: number;
  /** Setter for selected meals count */
  setSelectedMeals: Dispatch<SetStateAction<number>>;
  /** Setter for selected snacks count */
  setSelectedSnacks: Dispatch<SetStateAction<number>>;
  /** Maximum total prep time constraint */
  maxTotalPrepTime: number;
  /** Maximum weekly budget constraint */
  maxWeeklyBudget: number | null;
  /** Setter for maximum weekly budget */
  setMaxWeeklyBudget: Dispatch<SetStateAction<number | null>>;
  /** Type of generation in progress ('fullDay' or 'weekly') */
  generationType: 'fullDay' | 'weekly' | null;
  /** Setter for generation type */
  setGenerationType: Dispatch<SetStateAction<'fullDay' | 'weekly' | null>>;
  /** Setter for success modal visibility */
  setShowSuccessModal: Dispatch<SetStateAction<boolean>>;
  /** Setter for success message content */
  setSuccessMessage: Dispatch<SetStateAction<{ title: string; message: string }>>;

  // From useNutritionTracking
  /** Target macro goals for the day */
  targetMacros: Macros;
  /** Setter for target macros */
  setTargetMacros: Dispatch<SetStateAction<Macros>>;
  /** Setter for weekly nutrition summary */
  setWeeklyNutrition: Dispatch<SetStateAction<any>>;
  /** Setter for weekly nutrition loading state */
  setLoadingWeeklyNutrition: Dispatch<SetStateAction<boolean>>;

  // From useCostTracking
  /** Cost analysis data for the current meal plan */
  costAnalysis: any;

  // From useMealPlanUI
  /** Mapping of meal types to their default hours */
  mealTypeToHour: Record<string, number>;
  /** 24-hour data array */
  hours: HourData[];
  /** Check if a date is the currently selected date */
  isSelected: (date: Date) => boolean;
  /** Selected hour from the time picker */
  selectedHour: number;
  /** Selected minute from the time picker */
  selectedMinute: number;
  /** Setter for time picker modal visibility */
  setShowTimePickerModal: Dispatch<SetStateAction<boolean>>;
  /** Setter for add recipe modal visibility */
  setShowAddRecipeModal: Dispatch<SetStateAction<boolean>>;

  // From screen params
  /** Recipe ID from navigation params */
  recipeId: string | string[] | undefined;
  /** Recipe title from navigation params */
  recipeTitle: string | string[] | undefined;

  // Template state (from useGenerationState)
  setShowTemplatePickerModal: Dispatch<SetStateAction<boolean>>;
  setShowSaveTemplateModal: Dispatch<SetStateAction<boolean>>;
  templates: MealPlanTemplate[];
  setTemplates: Dispatch<SetStateAction<MealPlanTemplate[]>>;
  setLoadingTemplates: Dispatch<SetStateAction<boolean>>;
  setApplyingTemplate: Dispatch<SetStateAction<boolean>>;
  setSavingTemplate: Dispatch<SetStateAction<boolean>>;

  // Duplicate state (from useGenerationState)
  setDuplicating: Dispatch<SetStateAction<boolean>>;
  setShowDuplicateModal: Dispatch<SetStateAction<boolean>>;

  // Recurring meal state
  setRecurringModalVisible: Dispatch<SetStateAction<boolean>>;
  setRecurringMeal: Dispatch<SetStateAction<any>>;
  setManagerModalVisible: Dispatch<SetStateAction<boolean>>;
  recurringRules: RecurringMeal[];
  setRecurringRules: Dispatch<SetStateAction<RecurringMeal[]>>;

  // Goal mode state (from useGenerationState)
  planningMode: 'cut' | 'maintain' | 'build';
}

interface UseMealPlanActionsReturn {
  /** Shows meal/snack selector for weekly generation */
  handleGenerateWeeklyPlan: () => Promise<void>;
  /** Saves meals to backend API */
  saveMealsToBackend: (meals: any[], date: Date, mealPlanId?: string) => Promise<string | undefined>;
  /** Generates full weekly plan via server-side AI */
  generateWeeklyViaServer: () => Promise<void>;
  /** Shows cost optimization alert */
  handleOptimizeCost: () => Promise<void>;
  /** Refreshes meal plan */
  handleRefresh: () => Promise<void>;
  /** Selects a date */
  handleDateSelect: (date: Date) => void;
  /** Navigates to cookbook */
  handleAddRecipe: () => void;
  /** Adds recipe to specific meal type */
  handleAddRecipeToMeal: (mealType: string) => void;
  /** Shows add meal alert for a specific hour */
  handleAddMealToHour: (hour: number) => void;
  /** Moves meal between hours */
  handleMoveMeal: (fromHour: number, fromMealIndex: number, toHour: number) => void;
  /** Reorders meals within the same hour slot */
  handleReorderMeal: (hour: number, fromIndex: number, toIndex: number) => void;
  /** Removes meal with confirmation */
  handleRemoveMeal: (hour: number, mealIndex: number) => void;
  /** Adds meal macros to daily total */
  updateDailyMacros: (newMeal: any) => void;
  /** Loads weekly nutrition summary from API */
  loadWeeklyNutrition: () => Promise<void>;
  /** Confirms time picker selection */
  handleTimePickerConfirm: () => void;
  /** Calculates remaining macros for the day */
  getRemainingMacros: () => Promise<Macros>;
  /** Calculates recommended meal/snack counts based on calorie target */
  calculateRecommendedMealsAndSnacks: (targetCalories: number) => { meals: number; snacks: number };
  /** Shows selector for full day generation */
  handleGenerateFullDay: () => Promise<void>;
  /** Confirms meal/snack selection and triggers generation */
  handleConfirmMealSnackSelection: () => Promise<void>;
  /** Generates full day meal plan */
  generateFullDayWithSelection: () => Promise<void>;
  /** Generates only remaining unfilled meals */
  handleGenerateRemainingMeals: () => Promise<void>;
  /** Loads templates from API */
  loadTemplates: () => Promise<void>;
  /** Saves current week as a template */
  handleSaveAsTemplate: (name: string, description?: string) => Promise<void>;
  /** Applies a template to the current week */
  handleApplyTemplate: (templateId: string) => void;
  /** Deletes a user template */
  handleDeleteTemplate: (templateId: string) => void;
  /** Copies previous week's meals to current week */
  handleCopyLastWeek: () => void;
  /** Copies all meals from one day to another */
  handleCopyDay: (sourceDate: string, targetDate: string) => void;
  /** Copies a meal to multiple target days */
  handleCopyMealToDays: (sourceMealId: string, targetDates: string[], targetMealType?: string) => void;
  /** Opens recurring meal modal for a meal */
  handleSetRecurring: (meal: any) => void;
  /** Loads recurring rules from API */
  loadRecurringRules: () => Promise<void>;
  /** Saves a recurring rule (create or update) */
  handleSaveRecurringRule: (data: any) => Promise<void>;
  /** Deletes a recurring rule */
  handleDeleteRecurringRule: (ruleId: string) => void;
  /** Toggles active state of a recurring rule */
  handleToggleRecurringActive: (ruleId: string, isActive: boolean) => void;
  /** Applies recurring rules to current week */
  handleApplyRecurring: () => Promise<void>;
  /** One-tap streamlined "Plan My Week" with goal mode */
  handlePlanMyWeek: (mode: 'cut' | 'maintain' | 'build') => Promise<void>;
  /** Regenerate a single day in the current plan */
  handleRegenerateDay: (date: Date) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Custom hook for meal plan action handlers and business logic
 * Extracts all action/handler functions from the meal plan screen
 * into a reusable hook that receives dependencies as props.
 */
export function useMealPlanActions({
  hourlyMeals,
  weeklyPlan,
  weekDates,
  selectedDate,
  setSelectedDate,
  setHourlyMeals,
  setDailyMacros,
  setTotalPrepTime,
  loadMealPlan,
  refreshMealPlan,
  generatingPlan,
  setGeneratingPlan,
  setShowMealSnackSelector,
  selectedMeals,
  selectedSnacks,
  setSelectedMeals,
  setSelectedSnacks,
  maxTotalPrepTime,
  maxWeeklyBudget,
  setMaxWeeklyBudget,
  generationType,
  setGenerationType,
  setShowSuccessModal,
  setSuccessMessage,
  targetMacros,
  setTargetMacros,
  setWeeklyNutrition,
  setLoadingWeeklyNutrition,
  costAnalysis,
  mealTypeToHour,
  hours,
  isSelected,
  selectedHour,
  selectedMinute,
  setShowTimePickerModal,
  setShowAddRecipeModal,
  recipeId,
  recipeTitle,
  setShowTemplatePickerModal,
  setShowSaveTemplateModal,
  templates,
  setTemplates,
  setLoadingTemplates,
  setApplyingTemplate,
  setSavingTemplate,
  setDuplicating,
  setShowDuplicateModal,
  setRecurringModalVisible,
  setRecurringMeal,
  setManagerModalVisible,
  recurringRules,
  setRecurringRules,
  planningMode,
}: UseMealPlanActionsProps): UseMealPlanActionsReturn {

  // Load target macros from user profile on mount
  useEffect(() => {
    const loadTargetMacros = async () => {
      try {
        const macroGoalsResponse = await userApi.getMacroGoals();
        if (macroGoalsResponse.data) {
          setTargetMacros({
            calories: macroGoalsResponse.data.calories || 2000,
            protein: macroGoalsResponse.data.protein || 150,
            carbs: macroGoalsResponse.data.carbs || 200,
            fat: macroGoalsResponse.data.fat || 67,
            fiber: macroGoalsResponse.data.fiber || 25,
          });
        }
      } catch (error) {
        console.error('Error loading macro goals:', error);
      }
    };
    loadTargetMacros();
  }, []);

  // ─── Calculate recommended meals and snacks based on calorie target ───
  // Base: 2000 calories = 3 meals, 1 snack
  // Scales: Every 400 calories above 2000 = +1 snack
  // Scales: Every 400 calories below 2000 = -1 meal
  const calculateRecommendedMealsAndSnacks = (targetCalories: number): { meals: number; snacks: number } => {
    // Base recommendation: 3 meals, 1 snack for 2000 calories
    const baseMeals = 3;
    const baseSnacks = 1;
    const baseCalories = 2000;

    if (targetCalories >= baseCalories) {
      // Above base: increase snacks, meals stay at 3 (or 4 for very high)
      const caloriesAboveBase = targetCalories - baseCalories;
      const additionalSnacks = Math.floor(caloriesAboveBase / 400);
      const snacks = Math.min(baseSnacks + additionalSnacks, 4); // Cap at 4 snacks
      const meals = targetCalories >= 3000 ? 4 : baseMeals;
      return { meals, snacks };
    } else {
      // Below base: decrease meals, snacks stay at 1 (or 0 for very low)
      const caloriesBelowBase = baseCalories - targetCalories;
      const mealsToReduce = Math.floor(caloriesBelowBase / 400);
      const meals = Math.max(baseMeals - mealsToReduce, 1); // Minimum 1 meal
      // Keep snacks at 1 unless calories are very low (< 1200)
      const snacks = targetCalories < 1200 ? 0 : baseSnacks;
      return { meals, snacks };
    }
  };

  // ─── Generate weekly meal plan ────────────────────────────────────────
  const handleGenerateWeeklyPlan = async () => {
    if (generatingPlan) return;

    // Calculate and set recommended values based on target calories
    const recommendations = calculateRecommendedMealsAndSnacks(targetMacros.calories);
    setSelectedMeals(recommendations.meals);
    setSelectedSnacks(recommendations.snacks);

    // Load current budget from preferences
    try {
      const prefsResponse = await userApi.getPreferences();
      const preferences = prefsResponse.data;
      if (preferences?.maxDailyFoodBudget) {
        setMaxWeeklyBudget(preferences.maxDailyFoodBudget);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    }

    setGenerationType('weekly');
    setShowMealSnackSelector(true);
  };

  // ─── Save meals to backend ────────────────────────────────────────────
  const saveMealsToBackend = async (meals: any[], date: Date, mealPlanId?: string) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      let currentMealPlanId = mealPlanId;

      for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (!meal.id) continue;

        // Extract meal type from meal object (should be set when calling this function)
        const mealType = meal.mealType || 'breakfast';

        try {
          const response = await mealPlanApi.addRecipeToMeal({
            mealPlanId: currentMealPlanId,
            recipeId: meal.id,
            date: dateStr,
            mealType: mealType,
          });

          // Get meal plan ID from first response (backend creates it if not provided)
          if (!currentMealPlanId && response.data?.meal?.mealPlanId) {
            currentMealPlanId = response.data.meal.mealPlanId;
          }

          // Add small delay between saves to avoid overwhelming the API
          if (i < meals.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (mealError: any) {
          // Handle authentication errors specifically
          const statusCode = mealError.response?.status;
          const errorCode = mealError.code;

          if (statusCode === 401 || statusCode === 403 || errorCode === 'HTTP_401' || errorCode === 'HTTP_403') {
            console.error('Authentication error saving meal:', mealError);
            // Don't continue saving if auth fails - user needs to re-authenticate
            throw new Error('Authentication failed. Please log in again.');
          }

          // For other errors, log but continue with next meal
          console.warn(`Failed to save meal ${meal.id} to backend:`, mealError.message || mealError);
        }
      }

      return currentMealPlanId;
    } catch (error: any) {
      // Re-throw authentication errors
      if (error.message?.includes('Authentication failed')) {
        throw error;
      }

      console.error('Error saving meals to backend:', error);
      // Don't throw for other errors - allow meal plan generation to continue even if saving fails
      return mealPlanId;
    }
  };

  // ─── Generate weekly plan via server-side AI generation ───────────────
  const generateWeeklyViaServer = async () => {
    try {
      setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      const weekStart = weekDates[0];
      const startDateStr = weekStart.toISOString().split('T')[0];

      // Build mealsPerDay from selectedMeals/selectedSnacks
      const mealsPerDay: string[] = [];
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      for (let i = 0; i < Math.min(selectedMeals, mealTypes.length); i++) {
        mealsPerDay.push(mealTypes[i]);
      }
      for (let i = 0; i < selectedSnacks; i++) {
        mealsPerDay.push('snack');
      }

      const response = await mealPlanApi.generateMealPlan({
        days: 7,
        startDate: startDateStr,
        mealsPerDay,
        maxTotalPrepTime,
        maxDailyBudget: maxWeeklyBudget ? maxWeeklyBudget / 7 : undefined,
        planningMode,
      });

      if (response.data?.success) {
        HapticChoreography.planGenerated();
        setSuccessMessage({
          title: 'Weekly Meal Plan Generated!',
          message: `All ${response.data.days?.length || 7} days have been planned. Your personalized meal plan is ready!`,
        });
        setShowSuccessModal(true);

        // Reload meal plan to refresh weekly view with server data
        await loadMealPlan();
      } else {
        throw new Error(response.data?.error || 'Server generation failed');
      }
    } catch (error: any) {
      console.error('❌ Server-side generation failed, falling back to client-side:', error.message);
      // Fallback to client-side generation
      await generateWeeklyWithSelectionClientSide();
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─── Fallback: Generate weekly plan client-side ─────────────────────────
  const generateWeeklyWithSelectionClientSide = async () => {
    try {
      // Reset daily macros before generating (only show selected day's meals)
      setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      // Track meals generated across the week for variety and leftover planning
      const weeklyMeals: Array<{
        id: string;
        name: string;
        mealType: string;
        servings: number; // Estimated servings (default 4 for batch meals)
        isBatchFriendly: boolean;
        daysUsed: number; // Track how many days this meal is used
        mealData: any; // Store full meal data for reuse
      }> = [];

      // Track meal plan ID for the week
      let weekMealPlanId: string | undefined;

      // Generate meal plan for each day of the week
      const weekStart = weekDates[0];

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + i);

        let mealPlan: any = {};
        let total: any = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

        // Strategy: Reuse batch-friendly meals (dinner/lunch) from previous days
        // This simulates cooking large batches that feed multiple people (leftovers)
        // BUT: Keep reuse minimal (10% chance) to ensure maximum variety
        if (i > 0) {
          // Find batch-friendly meals that can be reused (dinner/lunch, used < 2 times)
          const reusableMeals = weeklyMeals.filter(m =>
            m.isBatchFriendly &&
            m.daysUsed < 2 && // Can be reused up to 2 times (covers ~3 days with leftovers)
            (m.mealType === 'dinner' || m.mealType === 'lunch')
          );

          // Reuse 0-1 batch meal per day (10% chance to maximize variety)
          // This accounts for leftovers from cooking large batches, but prioritizes variety
          if (reusableMeals.length > 0 && Math.random() < 0.1) {
            const mealToReuse = reusableMeals[Math.floor(Math.random() * reusableMeals.length)];
            mealToReuse.daysUsed += 1;

            // Add reused meal to plan
            if (mealToReuse.mealType === 'dinner') {
              mealPlan.dinner = mealToReuse.mealData;
            } else if (mealToReuse.mealType === 'lunch') {
              mealPlan.lunch = mealToReuse.mealData;
            }

            // Add to totals
            total.calories += mealToReuse.mealData.calories || 0;
            total.protein += mealToReuse.mealData.protein || 0;
            total.carbs += mealToReuse.mealData.carbs || 0;
            total.fat += mealToReuse.mealData.fat || 0;

            console.log(`♻️ Reusing ${mealToReuse.name} for day ${i + 1} (leftovers from previous day)`);
          }
        }

        // Generate remaining meals for variety
        // Calculate how many meals we still need (accounting for reused meals)
        const mealsNeeded = selectedMeals - (mealPlan.dinner ? 1 : 0) - (mealPlan.lunch ? 1 : 0);

        if (mealsNeeded > 0) {
          // Generate new meals for the day
          // Add cuisine rotation to ensure variety across days
          const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'Thai'];
          const dayCuisine = cuisines[i % cuisines.length]; // Rotate through cuisines

          // Generate new meals for the day
          // Backend should use user's macro goals and ensure variety
        const response = await aiRecipeApi.generateDailyPlan({
            mealCount: mealsNeeded,
            cuisine: dayCuisine, // Rotate cuisines to ensure variety
            maxTotalPrepTime: maxTotalPrepTime,
            maxWeeklyBudget: maxWeeklyBudget ? maxWeeklyBudget / 7 : undefined, // Convert weekly to daily for each day
            // Backend uses macro goals from user profile to ensure ~2000 calories per day
          });

          const generatedPlan = response.data.mealPlan;
          const generatedTotal = response.data.totalNutrition;

          // Merge generated meals with reused meals (don't overwrite reused meals)
          if (generatedPlan.breakfast && !mealPlan.breakfast) mealPlan.breakfast = generatedPlan.breakfast;
          if (generatedPlan.lunch && !mealPlan.lunch) mealPlan.lunch = generatedPlan.lunch;
          if (generatedPlan.dinner && !mealPlan.dinner) mealPlan.dinner = generatedPlan.dinner;
          if (generatedPlan.snack && !mealPlan.snack) mealPlan.snack = generatedPlan.snack;

          // Add generated totals
          total.calories += generatedTotal.calories;
          total.protein += generatedTotal.protein;
          total.carbs += generatedTotal.carbs;
          total.fat += generatedTotal.fat;
        }

        // Log for debugging
        console.log(`📊 Day ${i + 1} generated: ${total.calories} calories (target: ${targetMacros.calories})`);

        // Save meals to backend for persistence (non-blocking - don't fail generation if save fails)
        const mealsToSave = [
          { meal: mealPlan.breakfast, type: 'breakfast' },
          { meal: mealPlan.lunch, type: 'lunch' },
          { meal: mealPlan.dinner, type: 'dinner' },
          { meal: mealPlan.snack, type: 'snack' },
        ].filter(m => m.meal);

        if (mealsToSave.length > 0) {
          const mealsWithType = mealsToSave.map(({ meal, type }) => ({
            ...meal,
            mealType: type,
          }));

          // Save meals in background - don't block generation if save fails
          saveMealsToBackend(mealsWithType, currentDate, weekMealPlanId)
            .then((newMealPlanId) => {
              if (newMealPlanId) {
                weekMealPlanId = newMealPlanId;
              }
            })
            .catch((error) => {
              // Only show error for authentication failures
              if (error.message?.includes('Authentication failed')) {
                Alert.alert(
                  'Authentication Error',
                  'Your session has expired. Please log in again to save your meal plan.',
                  [{ text: 'OK' }]
                );
              } else {
                console.warn('Failed to save meals for day', i + 1, ':', error.message);
              }
            });
        }

        // Track newly generated meals for the week
        const mealsToTrack = mealsToSave;

        mealsToTrack.forEach(({ meal, type }) => {
          // Check if this meal already exists in weekly tracking
          const existingMeal = weeklyMeals.find(m => m.id === meal.id);

          if (!existingMeal) {
            // New meal - add to tracking
            // Assume batch meals (dinner, lunch) serve 4, snacks/breakfast serve 1-2
            const estimatedServings = (type === 'dinner' || type === 'lunch') ? 4 : 2;
            const isBatchFriendly = type === 'dinner' || type === 'lunch';

            weeklyMeals.push({
              id: meal.id,
              name: meal.title,
              mealType: type,
              servings: estimatedServings,
              isBatchFriendly,
              daysUsed: 1,
              mealData: meal, // Store full meal data for reuse
            });
          }
        });

        // Add meals to hourly meals if this is the selected date
        if (isSelected(currentDate)) {
          const newHourlyMeals = { ...hourlyMeals };

                    if (mealPlan.breakfast) {
                      const hour = mealTypeToHour.breakfast;
                      newHourlyMeals[hour] = [
                        ...(newHourlyMeals[hour] || []),
                        {
                          id: mealPlan.breakfast.id,
                          name: mealPlan.breakfast.title,
                          description: mealPlan.breakfast.description,
                          calories: mealPlan.breakfast.calories,
                          protein: mealPlan.breakfast.protein,
                          carbs: mealPlan.breakfast.carbs,
                          fat: mealPlan.breakfast.fat,
                          cookTime: mealPlan.breakfast.cookTime,
                          difficulty: mealPlan.breakfast.difficulty,
                          imageUrl: mealPlan.breakfast.imageUrl,
                        },
                      ];
                    }

                    if (mealPlan.lunch) {
                      const hour = mealTypeToHour.lunch;
                      newHourlyMeals[hour] = [
                        ...(newHourlyMeals[hour] || []),
                        {
                          id: mealPlan.lunch.id,
                          name: mealPlan.lunch.title,
                          description: mealPlan.lunch.description,
                          calories: mealPlan.lunch.calories,
                          protein: mealPlan.lunch.protein,
                          carbs: mealPlan.lunch.carbs,
                          fat: mealPlan.lunch.fat,
                          cookTime: mealPlan.lunch.cookTime,
                          difficulty: mealPlan.lunch.difficulty,
                          imageUrl: mealPlan.lunch.imageUrl,
                        },
                      ];
                    }

                    if (mealPlan.dinner) {
                      const hour = mealTypeToHour.dinner;
                      newHourlyMeals[hour] = [
                        ...(newHourlyMeals[hour] || []),
                        {
                          id: mealPlan.dinner.id,
                          name: mealPlan.dinner.title,
                          description: mealPlan.dinner.description,
                          calories: mealPlan.dinner.calories,
                          protein: mealPlan.dinner.protein,
                          carbs: mealPlan.dinner.carbs,
                          fat: mealPlan.dinner.fat,
                          cookTime: mealPlan.dinner.cookTime,
                          difficulty: mealPlan.dinner.difficulty,
                          imageUrl: mealPlan.dinner.imageUrl,
                        },
                      ];
                    }

                    if (mealPlan.snack) {
                      const hour = mealTypeToHour.snack;
                      newHourlyMeals[hour] = [
                        ...(newHourlyMeals[hour] || []),
                        {
                          id: mealPlan.snack.id,
                          name: mealPlan.snack.title,
                          description: mealPlan.snack.description,
                          calories: mealPlan.snack.calories,
                          protein: mealPlan.snack.protein,
                          carbs: mealPlan.snack.carbs,
                          fat: mealPlan.snack.fat,
                          cookTime: mealPlan.snack.cookTime,
                          difficulty: mealPlan.snack.difficulty,
                          imageUrl: mealPlan.snack.imageUrl,
                        },
                      ];
                    }

          setHourlyMeals(newHourlyMeals);

          // Update daily macros ONLY for the selected day (don't accumulate across days)
          setDailyMacros({
            calories: total.calories,
            protein: total.protein,
            carbs: total.carbs,
            fat: total.fat,
            fiber: total.fiber,
          });
        }

        // Small delay between days to avoid rate limiting
        if (i < 6) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      HapticPatterns.success();
      setSuccessMessage({
        title: 'Weekly Meal Plan Generated!',
        message: 'All 7 days have been planned. Your personalized meal plan is ready!',
      });
      setShowSuccessModal(true);

      // Reload meal plan to refresh weekly view
      await loadMealPlan();
    } catch (error: any) {
      console.error('❌ Error generating weekly plan:', error);
      HapticPatterns.error();

      // Check for various error types
      const errorMessage = error.message || error.details || '';
      const errorCode = error.code || '';

      const isQuotaError = errorCode === 'insufficient_quota' ||
                          errorCode === 'HTTP_429' ||
                          errorMessage?.includes('quota') ||
                          errorMessage?.includes('429');

      const isOverloadedError = errorCode === 'HTTP_529' ||
                                errorMessage?.includes('529') ||
                                errorMessage?.includes('overloaded') ||
                                errorMessage?.includes('Overloaded');

      let message = 'Failed to generate weekly meal plan. Please try again.';
      let title = 'Generation Failed';

      if (isOverloadedError) {
        title = 'Service Temporarily Unavailable';
        message = 'The AI service is currently overloaded. Please try again in a few moments, or generate meals day by day instead.';
      } else if (isQuotaError) {
        title = 'Quota Exceeded';
        message = 'AI generation quota exceeded. Please try again later or generate meals day by day.';
      }

      Alert.alert(title, message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─── Optimize meal plan cost ──────────────────────────────────────────
  const handleOptimizeCost = async () => {
    try {

      // Get user preferences for budget
      const prefsResponse = await userApi.getPreferences();
      const preferences = prefsResponse.data;

      const maxWeeklyBudgetPref = preferences?.maxDailyFoodBudget;
      const maxMealCost = preferences?.maxMealCost;

      // For now, show an alert with optimization suggestions
      // In the future, we can implement actual recipe substitutions
      let message = '';
      if (maxWeeklyBudgetPref && costAnalysis && costAnalysis.totalCost > maxWeeklyBudgetPref) {
        const exceeded = costAnalysis.budgetExceeded?.toFixed(2) || '0.00';
        message = `Your meal plan costs $${costAnalysis.totalCost.toFixed(2)}, which exceeds your weekly budget of $${maxWeeklyBudgetPref.toFixed(2)} by $${exceeded}.\n\nConsider:\n• Choosing cheaper recipe alternatives\n• Reducing portion sizes\n• Substituting expensive ingredients`;
      } else if (costAnalysis) {
        message = `Your meal plan costs $${costAnalysis.totalCost.toFixed(2)} per week ($${costAnalysis.costPerDay.toFixed(2)} per day).\n\nTo optimize further, we can suggest cheaper alternatives for expensive meals.`;
      } else {
        message = 'Cost optimization requires recipes to be added to your meal plan first.';
      }

      Alert.alert(
        '💰 Cost Optimization',
        message,
        [
          { text: 'OK' },
          ...(costAnalysis && costAnalysis.budgetExceeded ? [{
            text: 'Find Alternatives',
            onPress: () => {
              // TODO: Navigate to recipe alternatives screen
              Alert.alert('Coming Soon', 'Recipe alternatives feature coming soon!');
            },
          }] : []),
        ]
      );
    } catch (error: any) {
      console.error('Error optimizing cost:', error);
      Alert.alert('Error', 'Failed to optimize meal plan cost');
    }
  };

  // ─── Refresh meal plan ────────────────────────────────────────────────
  const handleRefresh = async () => {
    await refreshMealPlan();
  };

  // ─── Select a date ────────────────────────────────────────────────────
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // TODO: Load specific day's meal plan
  };

  // ─── Navigate to cookbook ──────────────────────────────────────────────
  const handleAddRecipe = () => {
    router.push('/cookbook');
  };

  // ─── Add recipe to specific meal type ─────────────────────────────────
  const handleAddRecipeToMeal = (mealType: string) => {
    if (!recipeId || !recipeTitle) return;

    Alert.alert(
      'Add to Meal Plan',
      `Add "${recipeTitle}" to ${mealType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              // TODO: Implement adding recipe to specific meal
              console.log(`Adding recipe ${recipeId} to ${mealType}`);
              Alert.alert('Success', `Recipe added to ${mealType}!`);
              setShowAddRecipeModal(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to add recipe to meal plan');
            }
          },
        },
      ]
    );
  };

  // ─── Add meal to specific hour ────────────────────────────────────────
  const handleAddMealToHour = (hour: number) => {
    const existingMealsCount = hourlyMeals[hour]?.length || 0;
    const mealText = existingMealsCount > 0
      ? `Add another meal at ${hours[hour].displayTime}? (${existingMealsCount} meal${existingMealsCount > 1 ? 's' : ''} already planned)`
      : `Add a meal at ${hours[hour].displayTime}?`;

      Alert.alert(
      'Add Meal',
      mealText,
        [
          { text: 'Cancel', style: 'cancel' },
        {
          text: 'From Cookbook',
          onPress: () => {
            router.push('/cookbook');
          },
        },
        {
          text: 'Custom Meal',
          onPress: () => {
            // TODO: Open custom meal form
            Alert.alert('Coming Soon', 'Custom meal entry will be available soon');
          },
        },
      ]
    );
  };

  // ─── Move meal between hours ──────────────────────────────────────────
  const handleMoveMeal = (fromHour: number, fromMealIndex: number, toHour: number) => {
    // Allow moving to same hour (reordering) or different hour
    // If moving to same hour and it's the only meal, do nothing
    if (fromHour === toHour && hourlyMeals[fromHour]?.length === 1) {
      return;
    }

    const meal = hourlyMeals[fromHour][fromMealIndex];

    // Remove from old hour
    setHourlyMeals(prev => ({
      ...prev,
      [fromHour]: prev[fromHour].filter((_, index) => index !== fromMealIndex)
    }));

    // Add to new hour (appends to end, allowing multiple meals per hour)
    // This makes it easy to slide multiple meals into the same time slot
    setHourlyMeals(prev => ({
      ...prev,
      [toHour]: [...(prev[toHour] || []), meal]
    }));

    HapticPatterns.success();
  };

  // ─── Reorder meals within the same hour slot ──────────────────────────
  const handleReorderMeal = (hour: number, fromIndex: number, toIndex: number) => {
    const meals = hourlyMeals[hour];
    if (!meals || fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= meals.length) return;
    if (toIndex < 0 || toIndex >= meals.length) return;

    const reordered = [...meals];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setHourlyMeals(prev => ({
      ...prev,
      [hour]: reordered,
    }));

    HapticPatterns.buttonPress();
  };

  // ─── Remove meal with confirmation ────────────────────────────────────
  const handleRemoveMeal = (hour: number, mealIndex: number) => {
    const meal = hourlyMeals[hour][mealIndex];
    Alert.alert(
      'Remove Meal',
      `Remove "${meal.name}" from ${hours[hour].displayTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove meal from hourly meals
            setHourlyMeals(prev => ({
              ...prev,
              [hour]: prev[hour].filter((_, index) => index !== mealIndex)
            }));

            // Update daily macros (subtract the meal's macros)
            setDailyMacros(prev => ({
              calories: prev.calories - (meal.calories || 0),
              protein: prev.protein - (meal.protein || 0),
              carbs: prev.carbs - (meal.carbs || 0),
              fat: prev.fat - (meal.fat || 0),
              fiber: prev.fiber - (meal.fiber || 0),
            }));
          },
        },
      ]
    );
  };

  // ─── Update daily macros ──────────────────────────────────────────────
  const updateDailyMacros = (newMeal: any) => {
    setDailyMacros(prev => ({
      calories: prev.calories + (newMeal.calories || 0),
      protein: prev.protein + (newMeal.protein || 0),
      carbs: prev.carbs + (newMeal.carbs || 0),
      fat: prev.fat + (newMeal.fat || 0),
      fiber: prev.fiber + (newMeal.fiber || 0),
    }));
    // Update total prep time
    setTotalPrepTime(prev => prev + (newMeal.cookTime || 0));
  };

  // ─── Load weekly nutrition summary ────────────────────────────────────
  const loadWeeklyNutrition = async () => {
    try {
      setLoadingWeeklyNutrition(true);
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const response = await mealPlanApi.getWeeklyNutritionSummary({ startDate, endDate });
      setWeeklyNutrition(response.data);
    } catch (error: any) {
      console.error('Error loading weekly nutrition:', error);
    } finally {
      setLoadingWeeklyNutrition(false);
    }
  };

  // ─── Confirm time picker selection ────────────────────────────────────
  const handleTimePickerConfirm = () => {
    if (!recipeId || !recipeTitle) return;

    // Add recipe to selected time
    const newMeal = {
      id: recipeId,
      name: recipeTitle,
      calories: 500, // TODO: Get from recipe data
      protein: 25,
      carbs: 50,
      fat: 20,
      description: "Delicious recipe added to your meal plan", // TODO: Get from recipe data
      prepTime: "15 min", // TODO: Get from recipe data
      difficulty: "Easy" // TODO: Get from recipe data
    };

    setHourlyMeals(prev => ({
      ...prev,
      [selectedHour]: [...(prev[selectedHour] || []), newMeal]
    }));

    updateDailyMacros(newMeal);
    setShowTimePickerModal(false);

    Alert.alert('Success', `"${recipeTitle}" added to ${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
  };

  // ─── Calculate remaining macros for the day ───────────────────────────
  const getRemainingMacros = async () => {
    try {
      // Collect all existing meals from hourlyMeals
      const existingMeals = Object.values(hourlyMeals)
        .flat()
        .map(meal => ({
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
        }));

      const response = await aiRecipeApi.calculateRemainingMacros(existingMeals);
      return response.data.remaining;
    } catch (error: any) {
      console.error('❌ Error calculating remaining macros:', error);
      // Fallback: calculate locally
      const consumed = Object.values(hourlyMeals)
        .flat()
        .reduce((acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return {
        calories: Math.max(0, targetMacros.calories - consumed.calories),
        protein: Math.max(0, targetMacros.protein - consumed.protein),
        carbs: Math.max(0, targetMacros.carbs - consumed.carbs),
        fat: Math.max(0, targetMacros.fat - consumed.fat),
      };
    }
  };

  // ─── Generate full day meal plan ──────────────────────────────────────
  const handleGenerateFullDay = async () => {
    if (generatingPlan) return;

    // Calculate and set recommended values based on target calories
    const recommendations = calculateRecommendedMealsAndSnacks(targetMacros.calories);
    setSelectedMeals(recommendations.meals);
    setSelectedSnacks(recommendations.snacks);

    // Load current budget from preferences
    try {
      const prefsResponse = await userApi.getPreferences();
      const preferences = prefsResponse.data;
      if (preferences?.maxDailyFoodBudget) {
        setMaxWeeklyBudget(preferences.maxDailyFoodBudget);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    }

    setGenerationType('fullDay');
    setShowMealSnackSelector(true);
  };

  // ─── Confirm meal/snack selection and trigger generation ──────────────
  const handleConfirmMealSnackSelection = async () => {
    if (!generationType) return;

    // Save budget to preferences if changed
    if (maxWeeklyBudget !== null) {
      try {
        await costTrackingApi.updateBudget({ maxDailyFoodBudget: maxWeeklyBudget });
      } catch (error) {
        console.error('Error saving budget:', error);
        // Continue with generation even if budget save fails
      }
    }

    setShowMealSnackSelector(false);
    setGeneratingPlan(true);

    try {
      if (generationType === 'fullDay') {
        await generateFullDayWithSelection();
      } else if (generationType === 'weekly') {
        await generateWeeklyViaServer();
      }
    } catch (error) {
      setGeneratingPlan(false);
    }
  };

  // ─── Generate full day with selection ─────────────────────────────────
  const generateFullDayWithSelection = async () => {
    try {
      const response = await aiRecipeApi.generateDailyPlan({
        mealCount: selectedMeals,
        maxTotalPrepTime: maxTotalPrepTime,
        maxWeeklyBudget: maxWeeklyBudget ? maxWeeklyBudget / 7 : undefined, // Convert weekly to daily for single day
        // Note: API may need snackCount parameter, adjust based on backend
      });
                const mealPlan = response.data.mealPlan;

                // Add meals to appropriate hours
                const newHourlyMeals = { ...hourlyMeals };
                const mealsToSave: any[] = [];

                if (mealPlan.breakfast) {
                  const hour = mealTypeToHour.breakfast;
                  newHourlyMeals[hour] = [
                    ...(newHourlyMeals[hour] || []),
                    {
                      id: mealPlan.breakfast.id,
                      name: mealPlan.breakfast.title,
                      description: mealPlan.breakfast.description,
                      calories: mealPlan.breakfast.calories,
                      protein: mealPlan.breakfast.protein,
                      carbs: mealPlan.breakfast.carbs,
                      fat: mealPlan.breakfast.fat,
                      cookTime: mealPlan.breakfast.cookTime,
                      difficulty: mealPlan.breakfast.difficulty,
                      imageUrl: mealPlan.breakfast.imageUrl,
                    },
                  ];
                  mealsToSave.push({ ...mealPlan.breakfast, mealType: 'breakfast' });
                }

                if (mealPlan.lunch) {
                  const hour = mealTypeToHour.lunch;
                  newHourlyMeals[hour] = [
                    ...(newHourlyMeals[hour] || []),
                    {
                      id: mealPlan.lunch.id,
                      name: mealPlan.lunch.title,
                      description: mealPlan.lunch.description,
                      calories: mealPlan.lunch.calories,
                      protein: mealPlan.lunch.protein,
                      carbs: mealPlan.lunch.carbs,
                      fat: mealPlan.lunch.fat,
                      cookTime: mealPlan.lunch.cookTime,
                      difficulty: mealPlan.lunch.difficulty,
                      imageUrl: mealPlan.lunch.imageUrl,
                    },
                  ];
                  mealsToSave.push({ ...mealPlan.lunch, mealType: 'lunch' });
                }

                if (mealPlan.dinner) {
                  const hour = mealTypeToHour.dinner;
                  newHourlyMeals[hour] = [
                    ...(newHourlyMeals[hour] || []),
                    {
                      id: mealPlan.dinner.id,
                      name: mealPlan.dinner.title,
                      description: mealPlan.dinner.description,
                      calories: mealPlan.dinner.calories,
                      protein: mealPlan.dinner.protein,
                      carbs: mealPlan.dinner.carbs,
                      fat: mealPlan.dinner.fat,
                      cookTime: mealPlan.dinner.cookTime,
                      difficulty: mealPlan.dinner.difficulty,
                      imageUrl: mealPlan.dinner.imageUrl,
                    },
                  ];
                  mealsToSave.push({ ...mealPlan.dinner, mealType: 'dinner' });
                }

                if (mealPlan.snack) {
                  const hour = mealTypeToHour.snack;
                  newHourlyMeals[hour] = [
                    ...(newHourlyMeals[hour] || []),
                    {
                      id: mealPlan.snack.id,
                      name: mealPlan.snack.title,
                      description: mealPlan.snack.description,
                      calories: mealPlan.snack.calories,
                      protein: mealPlan.snack.protein,
                      carbs: mealPlan.snack.carbs,
                      fat: mealPlan.snack.fat,
                      cookTime: mealPlan.snack.cookTime,
                      difficulty: mealPlan.snack.difficulty,
                      imageUrl: mealPlan.snack.imageUrl,
                    },
                  ];
                  mealsToSave.push({ ...mealPlan.snack, mealType: 'snack' });
                }

                setHourlyMeals(newHourlyMeals);

                // Save meals to backend (non-blocking)
                if (mealsToSave.length > 0) {
                  saveMealsToBackend(mealsToSave, selectedDate)
                    .catch((error) => {
                      // Only show error for authentication failures
                      if (error.message?.includes('Authentication failed')) {
                        Alert.alert(
                          'Authentication Error',
                          'Your session has expired. Please log in again to save your meal plan.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        console.warn('Failed to save meals to backend:', error.message);
                      }
                    });
                }

                // Update daily macros
                const total = response.data.totalNutrition;
      setDailyMacros(prev => ({
        calories: prev.calories + total.calories,
        protein: prev.protein + total.protein,
        carbs: prev.carbs + total.carbs,
        fat: prev.fat + total.fat,
        fiber: prev.fiber + (total.fiber || 0),
      }));

      setSuccessMessage({
        title: 'Full Day Meal Plan Generated!',
        message: 'Your complete meal plan for the day is ready!',
      });
      setShowSuccessModal(true);

      // Reload meal plan to refresh data
      await loadMealPlan();
    } catch (error: any) {
      console.error('❌ Error generating full day plan:', error);
      HapticPatterns.error();

      // Check for various error types
      const errorMessage = error.message || error.details || '';
      const errorCode = error.code || '';

      const isQuotaError = errorCode === 'insufficient_quota' ||
                          errorCode === 'HTTP_429' ||
                          errorMessage?.includes('quota') ||
                          errorMessage?.includes('429');

      const isOverloadedError = errorCode === 'HTTP_529' ||
                                errorMessage?.includes('529') ||
                                errorMessage?.includes('overloaded') ||
                                errorMessage?.includes('Overloaded');

      let message = 'Failed to generate meal plan. Please try again.';
      let title = 'Generation Failed';

      if (isOverloadedError) {
        title = 'Service Temporarily Unavailable';
        message = 'The AI service is currently overloaded. Please try again in a few moments.';
      } else if (isQuotaError) {
        title = 'Quota Exceeded';
        message = 'AI generation quota exceeded. Please try again later or browse existing recipes from the cookbook.';
      }

      Alert.alert(title, message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─── Generate remaining unfilled meals ────────────────────────────────
  const handleGenerateRemainingMeals = async () => {
    if (generatingPlan) return;

    try {
      setGeneratingPlan(true);

      // Calculate remaining macros
      const remainingMacros = await getRemainingMacros();

      // Determine which meals are missing
      const hasBreakfast = hourlyMeals[mealTypeToHour.breakfast]?.length > 0;
      const hasLunch = hourlyMeals[mealTypeToHour.lunch]?.length > 0;
      const hasDinner = hourlyMeals[mealTypeToHour.dinner]?.length > 0;
      const hasSnack = hourlyMeals[mealTypeToHour.snack]?.length > 0;

      const mealsToGenerate: string[] = [];
      if (!hasBreakfast) mealsToGenerate.push('breakfast');
      if (!hasLunch) mealsToGenerate.push('lunch');
      if (!hasDinner) mealsToGenerate.push('dinner');
      if (!hasSnack) mealsToGenerate.push('snack');

      if (mealsToGenerate.length === 0) {
        Alert.alert('All Meals Planned', 'You already have all meals planned for today!');
        setGeneratingPlan(false);
        return;
      }

      // Automatically determine how many meals to generate based on remaining calories
      // Average meal is about 400-600 calories, so estimate needed meals
      const avgCaloriesPerMeal = 500;
      const estimatedMealsNeeded = Math.max(1, Math.round(remainingMacros.calories / avgCaloriesPerMeal));
      const mealCount = Math.min(estimatedMealsNeeded, mealsToGenerate.length);

      // Limit to estimated meal count
      const meals = mealsToGenerate.slice(0, mealCount).join(',');

      Alert.alert(
        'Create Remaining Meals',
        `Create ${mealCount} meal${mealCount > 1 ? 's' : ''} to hit your daily targets?\n\n` +
        `Remaining: ${remainingMacros.calories} cal | ${remainingMacros.protein}g protein`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setGeneratingPlan(false) },
          {
            text: 'Create',
            onPress: async () => {
              try {
                const params: any = {
                  meals,
                  mealCount: mealCount,
                  useRemainingMacros: true, // IMPORTANT: Use remaining macros, not full daily
                  remainingMacros: remainingMacros, // Pass the calculated remaining macros
                  maxTotalPrepTime: maxTotalPrepTime,
                  maxWeeklyBudget: maxWeeklyBudget ? maxWeeklyBudget / 7 : undefined, // Convert weekly to daily for remaining meals
                };

                const response = await aiRecipeApi.generateDailyPlan(params);
                const mealPlan = response.data.mealPlan;

                // Add meals to appropriate hours (same logic as full day)
                const newHourlyMeals = { ...hourlyMeals };
                let totalAdded = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

                Object.entries(mealPlan).forEach(([mealType, recipe]: [string, any]) => {
                  if (recipe && mealTypeToHour[mealType]) {
                    const hour = mealTypeToHour[mealType];
                    newHourlyMeals[hour] = [
                      ...(newHourlyMeals[hour] || []),
                      {
                        id: recipe.id,
                        name: recipe.title,
                        description: recipe.description,
                        calories: recipe.calories,
                        protein: recipe.protein,
                        carbs: recipe.carbs,
                        fat: recipe.fat,
                        fiber: recipe.fiber,
                        cookTime: recipe.cookTime,
                        difficulty: recipe.difficulty,
                        imageUrl: recipe.imageUrl,
                      },
                    ];
                    totalAdded.calories += recipe.calories;
                    totalAdded.protein += recipe.protein;
                    totalAdded.carbs += recipe.carbs;
                    totalAdded.fat += recipe.fat;
                    totalAdded.fiber += recipe.fiber || 0;
                  }
                });

                setHourlyMeals(newHourlyMeals);

                // Update daily macros
                setDailyMacros(prev => ({
                  calories: prev.calories + totalAdded.calories,
                  protein: prev.protein + totalAdded.protein,
                  carbs: prev.carbs + totalAdded.carbs,
                  fat: prev.fat + totalAdded.fat,
                  fiber: prev.fiber + totalAdded.fiber,
                }));

                setSuccessMessage({
                  title: 'Meals Generated!',
                  message: `Successfully generated ${Object.keys(mealPlan).length} meal(s) for your plan!`,
                });
                setShowSuccessModal(true);
              } catch (error: any) {
                console.error('❌ Error generating remaining meals:', error);
                HapticPatterns.error();

                // Check for various error types
                const errorMessage = error.message || error.details || '';
                const errorCode = error.code || '';

                const isQuotaError = errorCode === 'insufficient_quota' ||
                                    errorCode === 'HTTP_429' ||
                                    errorMessage?.includes('quota') ||
                                    errorMessage?.includes('429');

                const isOverloadedError = errorCode === 'HTTP_529' ||
                                          errorMessage?.includes('529') ||
                                          errorMessage?.includes('overloaded') ||
                                          errorMessage?.includes('Overloaded');

                let message = 'Failed to generate meals. Please try again.';
                let title = 'Generation Failed';

                if (isOverloadedError) {
                  title = 'Service Temporarily Unavailable';
                  message = 'The AI service is currently overloaded. Please try again in a few moments.';
                } else if (isQuotaError) {
                  title = 'Quota Exceeded';
                  message = 'AI generation quota exceeded. Please try again later or browse existing recipes from the cookbook.';
                }

                Alert.alert(title, message);
              } finally {
                setGeneratingPlan(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      setGeneratingPlan(false);
      Alert.alert('Error', 'Failed to prepare meal generation');
    }
  };

  // ─── Template Handlers ────────────────────────────────────────────────

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await mealPlanApi.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveAsTemplate = async (name: string, description?: string) => {
    // Find a mealPlanId from the weeklyPlan data
    let mealPlanId: string | null = null;
    if (weeklyPlan) {
      for (const dateStr of Object.keys(weeklyPlan)) {
        const dayData = weeklyPlan[dateStr];
        const meals = dayData?.meals;
        if (meals) {
          for (const mealType of ['breakfast', 'lunch', 'dinner']) {
            const meal = meals[mealType];
            if (meal?.mealPlanId) {
              mealPlanId = meal.mealPlanId;
              break;
            }
          }
          if (!mealPlanId && meals.snacks) {
            for (const snack of meals.snacks) {
              if (snack?.mealPlanId) {
                mealPlanId = snack.mealPlanId;
                break;
              }
            }
          }
        }
        if (mealPlanId) break;
      }
    }

    if (!mealPlanId) {
      Alert.alert('No Meal Plan', 'Create some meals first before saving as a template.');
      return;
    }

    setSavingTemplate(true);
    try {
      await mealPlanApi.createTemplate({ name, description, mealPlanId });
      HapticPatterns.success();
      setShowSaveTemplateModal(false);
      setShowSuccessModal(true);
      setSuccessMessage({ title: 'Template Saved!', message: `"${name}" has been saved. You can apply it to any week.` });
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
      HapticPatterns.error();
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    const templateName = template?.name || 'this template';

    Alert.alert(
      'Apply Template',
      `Apply "${templateName}"? This will replace all meals for the current week.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplyingTemplate(true);
            try {
              const startDate = weekDates[0].toISOString().split('T')[0];
              await mealPlanApi.applyTemplate(templateId, { startDate });
              await loadMealPlan();
              HapticPatterns.success();
              setShowTemplatePickerModal(false);
              setShowSuccessModal(true);
              setSuccessMessage({ title: 'Template Applied!', message: `"${templateName}" has been applied to this week.` });
            } catch (error) {
              console.error('Error applying template:', error);
              Alert.alert('Error', 'Failed to apply template');
              HapticPatterns.error();
            } finally {
              setApplyingTemplate(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    const templateName = template?.name || 'this template';

    Alert.alert(
      'Delete Template',
      `Delete "${templateName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mealPlanApi.deleteTemplate(templateId);
              setTemplates(prev => prev.filter(t => t.id !== templateId));
              HapticPatterns.success();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
              HapticPatterns.error();
            }
          },
        },
      ]
    );
  };

  // ─── Duplicate Handlers ──────────────────────────────────────────────

  const handleCopyLastWeek = () => {
    Alert.alert(
      'Copy Last Week',
      'Replace this week\'s meals with last week\'s meals?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: async () => {
            setDuplicating(true);
            try {
              const startDate = weekDates[0].toISOString().split('T')[0];
              await mealPlanApi.duplicateMeals({ mode: 'week', targetStartDate: startDate });
              await loadMealPlan();
              HapticPatterns.success();
              setShowDuplicateModal(false);
              setSuccessMessage({ title: 'Week Copied!', message: 'Last week\'s meals have been copied to this week.' });
              setShowSuccessModal(true);
            } catch (error: any) {
              console.error('Error copying last week:', error);
              const msg = error?.response?.data?.error || 'Failed to copy last week\'s meals';
              Alert.alert('Error', msg);
              HapticPatterns.error();
            } finally {
              setDuplicating(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyDay = async (sourceDate: string, targetDate: string) => {
    setDuplicating(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      await mealPlanApi.duplicateMeals({ mode: 'day', targetStartDate: startDate, sourceDate, targetDate });
      await loadMealPlan();
      HapticPatterns.success();
      setShowDuplicateModal(false);
      setSuccessMessage({ title: 'Day Copied!', message: 'Meals have been copied to the target day.' });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error copying day:', error);
      const msg = error?.response?.data?.error || 'Failed to copy day\'s meals';
      Alert.alert('Error', msg);
      HapticPatterns.error();
    } finally {
      setDuplicating(false);
    }
  };

  const handleCopyMealToDays = async (sourceMealId: string, targetDates: string[], targetMealType?: string) => {
    setDuplicating(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      await mealPlanApi.duplicateMeals({ mode: 'meal', targetStartDate: startDate, sourceMealId, targetDates, targetMealType });
      await loadMealPlan();
      HapticPatterns.success();
      setShowDuplicateModal(false);
      setSuccessMessage({ title: 'Meal Copied!', message: `Meal copied to ${targetDates.length} day${targetDates.length > 1 ? 's' : ''}.` });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error copying meal:', error);
      const msg = error?.response?.data?.error || 'Failed to copy meal';
      Alert.alert('Error', msg);
      HapticPatterns.error();
    } finally {
      setDuplicating(false);
    }
  };

  // ─── Recurring Meal Handlers ─────────────────────────────────────────

  const handleSetRecurring = (meal: any) => {
    setRecurringMeal(meal);
    setRecurringModalVisible(true);
  };

  const loadRecurringRules = async () => {
    try {
      const response = await mealPlanApi.getRecurringMeals();
      setRecurringRules(response.data);
    } catch (error) {
      console.error('Error loading recurring rules:', error);
    }
  };

  const handleSaveRecurringRule = async (data: any) => {
    try {
      if (data.id) {
        // Update existing rule
        const { id, ...updateData } = data;
        const response = await mealPlanApi.updateRecurringMeal(id, updateData);
        setRecurringRules(prev => prev.map(r => r.id === id ? response.data : r));
      } else {
        // Create new rule
        const response = await mealPlanApi.createRecurringMeal(data);
        setRecurringRules(prev => [response.data, ...prev]);
      }
      HapticPatterns.success();
      setRecurringModalVisible(false);
      setSuccessMessage({
        title: data.id ? 'Rule Updated!' : 'Recurring Meal Set!',
        message: data.id ? 'Your recurring meal rule has been updated.' : 'This meal will be auto-added to your plan on the selected days.',
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error saving recurring rule:', error);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to save recurring meal rule');
    }
  };

  const handleDeleteRecurringRule = (ruleId: string) => {
    const doDelete = async () => {
      try {
        await mealPlanApi.deleteRecurringMeal(ruleId);
        setRecurringRules(prev => prev.filter(r => r.id !== ruleId));
        HapticPatterns.success();
      } catch (error) {
        console.error('Error deleting recurring rule:', error);
        HapticPatterns.error();
        Alert.alert('Error', 'Failed to delete recurring meal rule');
      }
    };
    doDelete();
  };

  const handleToggleRecurringActive = (ruleId: string, isActive: boolean) => {
    const doToggle = async () => {
      try {
        await mealPlanApi.updateRecurringMeal(ruleId, { isActive });
        setRecurringRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive } : r));
      } catch (error) {
        console.error('Error toggling recurring rule:', error);
        HapticPatterns.error();
      }
    };
    doToggle();
  };

  const handleApplyRecurring = async () => {
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const response = await mealPlanApi.applyRecurringMeals(startDate);
      if (response.data.created > 0) {
        await loadMealPlan();
      }
    } catch (error) {
      console.error('Error applying recurring meals:', error);
    }
  };

  // ─── "Plan My Week" — streamlined one-tap flow ──────────────────────
  const handlePlanMyWeek = async (mode: 'cut' | 'maintain' | 'build') => {
    if (generatingPlan) return;
    setGeneratingPlan(true);

    try {
      const recommendations = calculateRecommendedMealsAndSnacks(targetMacros.calories);
      const weekStart = weekDates[0];
      const startDateStr = weekStart.toISOString().split('T')[0];

      const mealsPerDay: string[] = [];
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      for (let i = 0; i < Math.min(recommendations.meals, mealTypes.length); i++) {
        mealsPerDay.push(mealTypes[i]);
      }
      for (let i = 0; i < recommendations.snacks; i++) {
        mealsPerDay.push('snack');
      }

      const response = await mealPlanApi.generateMealPlan({
        days: 7,
        startDate: startDateStr,
        mealsPerDay,
        maxTotalPrepTime: 60,
        planningMode: mode,
      });

      if (response.data?.success) {
        HapticPatterns.success();
        const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
        setSuccessMessage({
          title: 'Your Week is Planned!',
          message: `${modeLabel} mode — all 7 days ready.`,
        });
        setShowSuccessModal(true);
        await loadMealPlan();
      } else {
        throw new Error(response.data?.error || 'Plan generation failed');
      }
    } catch (error: any) {
      console.error('Error in Plan My Week:', error.message);
      Alert.alert('Generation Failed', 'Could not generate your meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─── Regenerate a single day ──────────────────────────────────────────
  const handleRegenerateDay = (date: Date) => {
    // Find the active meal plan ID from the weekly plan
    const mealPlanId = weeklyPlan?.mealPlanId || weeklyPlan?.id;
    if (!mealPlanId) {
      Alert.alert('No Plan', 'Generate a weekly plan first before regenerating a day.');
      return;
    }

    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    Alert.alert(
      'Regenerate Day',
      `Replace all meals for ${dateStr} with new AI-generated meals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setGeneratingPlan(true);
            try {
              const isoDate = date.toISOString().split('T')[0];
              await mealPlanApi.regenerateDay({ mealPlanId, date: isoDate });
              HapticPatterns.success();
              await loadMealPlan();
              setSuccessMessage({
                title: 'Day Regenerated!',
                message: `Fresh meals for ${dateStr}.`,
              });
              setShowSuccessModal(true);
            } catch (error: any) {
              console.error('Error regenerating day:', error.message);
              Alert.alert('Regeneration Failed', 'Could not regenerate this day. Please try again.');
            } finally {
              setGeneratingPlan(false);
            }
          },
        },
      ]
    );
  };

  return {
    handleGenerateWeeklyPlan,
    saveMealsToBackend,
    generateWeeklyViaServer,
    handleOptimizeCost,
    handleRefresh,
    handleDateSelect,
    handleAddRecipe,
    handleAddRecipeToMeal,
    handleAddMealToHour,
    handleMoveMeal,
    handleReorderMeal,
    handleRemoveMeal,
    updateDailyMacros,
    loadWeeklyNutrition,
    handleTimePickerConfirm,
    getRemainingMacros,
    calculateRecommendedMealsAndSnacks,
    handleGenerateFullDay,
    handleConfirmMealSnackSelection,
    generateFullDayWithSelection,
    handleGenerateRemainingMeals,
    loadTemplates,
    handleSaveAsTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
    handleCopyLastWeek,
    handleCopyDay,
    handleCopyMealToDays,
    handleSetRecurring,
    loadRecurringRules,
    handleSaveRecurringRule,
    handleDeleteRecurringRule,
    handleToggleRecurringActive,
    handleApplyRecurring,
    handlePlanMyWeek,
    handleRegenerateDay,
  };
}
