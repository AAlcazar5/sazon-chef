import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import PulsingLoader from '../../components/ui/PulsingLoader';
import SuccessModal from '../../components/ui/SuccessModal';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import Toast from '../../components/ui/Toast';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import MealCardSkeleton from '../../components/meal-plan/MealCardSkeleton';
import WeeklyCalendarSkeleton from '../../components/meal-plan/WeeklyCalendarSkeleton';
import DraggableMealCard from '../../components/meal-plan/DraggableMealCard';
import AnimatedHourHeader from '../../components/meal-plan/AnimatedHourHeader';
import CostAnalysisSection from '../../components/meal-plan/CostAnalysisSection';
import MealSnackSelectorModal from '../../components/meal-plan/MealSnackSelectorModal';
import DayMealsModal from '../../components/meal-plan/DayMealsModal';
import MealNotesModal from '../../components/meal-plan/MealNotesModal';
import { View, Text, ScrollView, Alert, Dimensions, TextInput, Modal, Animated, Image, Switch, RefreshControl, Platform } from 'react-native';
import AnimatedProgressBar from '../../components/ui/AnimatedProgressBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { MealPlanEmptyStates } from '../../constants/EmptyStates';
import { buttonAccessibility, iconButtonAccessibility, inputAccessibility, switchAccessibility } from '../../utils/accessibility';
import { useColorScheme } from 'nativewind';
import { useApi } from '../../hooks/useApi';
import { useMealPlanData } from '../../hooks/useMealPlanData';
import { useMealCompletion } from '../../hooks/useMealCompletion';
import { useGenerationState } from '../../hooks/useGenerationState';
import { useMealSwap } from '../../hooks/useMealSwap';
import { useCostTracking } from '../../hooks/useCostTracking';
import { useNutritionTracking } from '../../hooks/useNutritionTracking';
import { mealPlanApi, aiRecipeApi, shoppingListApi, userApi, costTrackingApi, mealPrepApi } from '../../lib/api';
import type { WeeklyPlan, DailySuggestion } from '../../types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming, runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Generate 24 hours array
const generateHours = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const hour = i;
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayTime = `${displayHour}:00 ${period}`;
    
    hours.push({
      hour,
      timeString,
      displayTime,
      isMealTime: [7, 12, 18].includes(hour), // breakfast, lunch, dinner
      label: hour === 7 ? 'Breakfast' : hour === 12 ? 'Lunch' : hour === 18 ? 'Dinner' : null
    });
  }
  return hours;
};

export default function MealPlanScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { recipeId, recipeTitle, scaledServings } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isMountedRef = useRef(false);

  // Map meal types to hours
  const mealTypeToHour: Record<string, number> = {
    breakfast: 7,
    lunch: 12,
    dinner: 18,
    snack: 15, // 3 PM snack
  };

  // Use meal plan data hook
  const {
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
  } = useMealPlanData({
    selectedDate,
    isMountedRef,
    mealTypeToHour,
  });

  // Use meal completion hook
  const {
    showNotesModal,
    editingMealId,
    editingMealName,
    editingNotes,
    showCelebrationToast,
    celebrationMessage,
    quickTemplates,
    handleToggleMealCompletion,
    handleOpenNotes,
    handleSaveNotes,
    handleCloseNotesModal,
    insertBulletPoint,
    insertTemplate,
    setEditingNotes,
    setShowCelebrationToast,
  } = useMealCompletion({
    hourlyMeals,
    weeklyPlan,
    mealCompletionStatus,
    mealNotes,
    setMealCompletionStatus,
    setMealNotes,
  });

  // Use generation state hook
  const {
    generatingPlan,
    showMealSnackSelector,
    selectedMeals,
    selectedSnacks,
    maxTotalPrepTime,
    maxWeeklyBudget,
    generationType,
    showDayMealsModal,
    selectedDayForModal,
    generatingShoppingList,
    showSuccessModal,
    successMessage,
    showShoppingListSuccessModal,
    shoppingListSuccessMessage,
    showShoppingListNameModal,
    shoppingListName,
    setGeneratingPlan,
    setShowMealSnackSelector,
    setSelectedMeals,
    setSelectedSnacks,
    setMaxTotalPrepTime,
    setMaxWeeklyBudget,
    setGenerationType,
    setShowDayMealsModal,
    setSelectedDayForModal,
    setGeneratingShoppingList,
    setShowSuccessModal,
    setSuccessMessage,
    setShowShoppingListSuccessModal,
    setShoppingListSuccessMessage,
    setShowShoppingListNameModal,
    setShoppingListName,
  } = useGenerationState();

  // Use meal swap hook
  const {
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
  } = useMealSwap({
    hourlyMeals,
    selectedDate,
    setHourlyMeals,
    setDailyMacros,
    setTotalPrepTime,
  });

  // Use cost tracking hook
  const {
    costAnalysis,
    loadingCostAnalysis,
    shoppingListSavings,
    loadingSavings,
    loadCostAnalysis,
    setCostAnalysis,
    setLoadingCostAnalysis,
    setShoppingListSavings,
    setLoadingSavings,
  } = useCostTracking({
    hourlyMeals,
  });

  // Use nutrition tracking hook
  const {
    weeklyNutrition,
    loadingWeeklyNutrition,
    targetMacros,
    setWeeklyNutrition,
    setLoadingWeeklyNutrition,
    setTargetMacros,
  } = useNutritionTracking();

  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Drag and drop state
  const [draggingMeal, setDraggingMeal] = useState<{ hour: number; mealIndex: number; meal: any } | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  
  
  // View mode state
  const [viewMode, setViewMode] = useState<'24hour' | 'compact' | 'collapsible'>('24hour');
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snacks'>('all');
  const [showViewModePicker, setShowViewModePicker] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  
  // Macros section collapse state
  const [macrosExpanded, setMacrosExpanded] = useState(true);
  
  // ScrollView ref and scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  

  const hours = generateHours();

  // Helper function to group meals by approximate meal type based on hour
  const groupMealsByType = (hourlyMeals: { [key: number]: any[] }) => {
    const grouped: { breakfast: any[], lunch: any[], dinner: any[], snacks: any[], other: any[] } = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      other: []
    };

    Object.entries(hourlyMeals).forEach(([hourStr, meals]) => {
      const hour = parseInt(hourStr);
      meals.forEach(meal => {
        if (hour >= 5 && hour < 11) {
          grouped.breakfast.push({ ...meal, hour });
        } else if (hour >= 11 && hour < 15) {
          grouped.lunch.push({ ...meal, hour });
        } else if (hour >= 15 && hour < 21) {
          grouped.dinner.push({ ...meal, hour });
        } else if (hour >= 21 || hour < 5) {
          grouped.snacks.push({ ...meal, hour });
        } else {
          grouped.other.push({ ...meal, hour });
        }
      });
    });

    return grouped;
  };




  // Generate weekly meal plan
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

  // Save meals to backend
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

  const generateWeeklyWithSelection = async () => {
    try {
      // Reset daily macros before generating (only show selected day's meals)
      setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      
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
        let total: any = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        
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

  // Optimize meal plan cost
  const handleOptimizeCost = async () => {
    try {
      
      // Get user preferences for budget
      const prefsResponse = await userApi.getPreferences();
      const preferences = prefsResponse.data;
      
      const maxWeeklyBudget = preferences?.maxDailyFoodBudget;
      const maxMealCost = preferences?.maxMealCost;

      // For now, show an alert with optimization suggestions
      // In the future, we can implement actual recipe substitutions
      let message = '';
      if (maxWeeklyBudget && costAnalysis && costAnalysis.totalCost > maxWeeklyBudget) {
        const exceeded = costAnalysis.budgetExceeded?.toFixed(2) || '0.00';
        message = `Your meal plan costs $${costAnalysis.totalCost.toFixed(2)}, which exceeds your weekly budget of $${maxWeeklyBudget.toFixed(2)} by $${exceeded}.\n\nConsider:\n• Choosing cheaper recipe alternatives\n• Reducing portion sizes\n• Substituting expensive ingredients`;
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

  const handleRefresh = async () => {
    await refreshMealPlan();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // TODO: Load specific day's meal plan
  };

  const handleAddRecipe = () => {
    router.push('/cookbook');
  };

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
              fat: prev.fat - (meal.fat || 0)
            }));
          },
        },
      ]
    );
  };

  const updateDailyMacros = (newMeal: any) => {
    setDailyMacros(prev => ({
      calories: prev.calories + (newMeal.calories || 0),
      protein: prev.protein + (newMeal.protein || 0),
      carbs: prev.carbs + (newMeal.carbs || 0),
      fat: prev.fat + (newMeal.fat || 0)
    }));
    // Update total prep time
    setTotalPrepTime(prev => prev + (newMeal.cookTime || 0));
  };

  // Load weekly nutrition summary
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

  const getMacroProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getMacroColor = (current: number, target: number) => {
    const progress = getMacroProgress(current, target);
    if (progress >= 100) return { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed };
    if (progress >= 80) return { color: isDark ? DarkColors.primary : Colors.primary };
    return { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen };
  };


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

  const formatTime = (hour: number, minute: number) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const handleManualTimeInput = (input: string) => {
    setManualTimeInput(input);
    
    // Parse time input (supports formats like "2:30", "14:30", "2:30 PM", etc.)
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = input.match(timeRegex);
    
    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3]?.toUpperCase();
      
      // Handle 12-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      // Validate hour and minute
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        setSelectedHour(hour);
        setSelectedMinute(minute);
      }
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  };

  // Update manual input when picker values change
  useEffect(() => {
    if (showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  }, [selectedHour, selectedMinute, showManualInput]);

  // Wheel Picker Component
  const WheelPicker = ({ 
    data, 
    selectedValue, 
    onValueChange, 
    width: pickerWidth = 80 
  }: {
    data: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    width?: number;
  }) => {
    const itemHeight = 45;
    const visibleItems = 3;
    const totalHeight = itemHeight * visibleItems;
    const scrollViewRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    // Calculate initial scroll position based on selected value
    const selectedIndex = data.indexOf(selectedValue);
    const initialScrollY = selectedIndex * itemHeight;

    // Set initial scroll position when component mounts
    useEffect(() => {
      if (scrollViewRef.current) {
        const newIndex = data.indexOf(selectedValue);
        const newScrollY = newIndex * itemHeight;
        scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
      }
    }, []);

    // Update scroll position when selectedValue changes externally
    useEffect(() => {
      if (!isScrolling && scrollViewRef.current) {
        const newIndex = data.indexOf(selectedValue);
        const newScrollY = newIndex * itemHeight;
        scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
      }
    }, [selectedValue, data, itemHeight, isScrolling]);

    return (
      <View style={{ 
        height: totalHeight, 
        width: pickerWidth, 
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB'
      }}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          nestedScrollEnabled={true}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onMomentumScrollEnd={(event) => {
            setIsScrolling(false);
            const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
            if (data[index] !== undefined && data[index] !== selectedValue) {
              onValueChange(data[index]);
            }
          }}
          contentContainerStyle={{
            paddingTop: itemHeight,
            paddingBottom: itemHeight,
          }}
        >
          {data.map((value, index) => (
            <HapticTouchableOpacity
              key={index}
              onPress={() => {
                onValueChange(value);
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ y: index * itemHeight, animated: true });
                }
              }}
              style={{
                height: itemHeight,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: selectedValue === value ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                borderRadius: 6,
                marginHorizontal: 2,
                marginVertical: 1,
              }}
            >
              <Text
                style={{
                  fontSize: FontSize.xl,
                  fontWeight: selectedValue === value ? 'bold' : '600',
                  color: selectedValue === value ? 'white' : '#374151',
                }}
              >
                {value.toString().padStart(2, '0')}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Calculate remaining macros from existing meals
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

  // Calculate recommended meals and snacks based on calorie target
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

  // Generate full day meal plan (all 4 meals)
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
        await generateWeeklyWithSelection();
      }
    } catch (error) {
      setGeneratingPlan(false);
    }
  };

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

  // Generate remaining meals based on what's already planned
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
                let totalAdded = { calories: 0, protein: 0, carbs: 0, fat: 0 };

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
                        cookTime: recipe.cookTime,
                        difficulty: recipe.difficulty,
                        imageUrl: recipe.imageUrl,
                      },
                    ];
                    totalAdded.calories += recipe.calories;
                    totalAdded.protein += recipe.protein;
                    totalAdded.carbs += recipe.carbs;
                    totalAdded.fat += recipe.fat;
                  }
                });

                setHourlyMeals(newHourlyMeals);

                // Update daily macros
                setDailyMacros(prev => ({
                  calories: prev.calories + totalAdded.calories,
                  protein: prev.protein + totalAdded.protein,
                  carbs: prev.carbs + totalAdded.carbs,
                  fat: prev.fat + totalAdded.fat,
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

  // Generate shopping list from meal plan
  const handleGenerateShoppingList = async () => {
    if (generatingShoppingList) return;

    // Show modal to get shopping list name
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
        // Check multiple possible error indicators (API interceptor transforms errors)
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
          });
        }
      } catch (error) {
        console.error('Error loading macro goals:', error);
        // Keep default values if loading fails
      }
    };
    loadTargetMacros();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadMealPlan();
    
    // If we have a scaled recipe from meal prep, show prompt to add to meal plan
    if (recipeId && recipeTitle && scaledServings) {
      Alert.alert(
        'Add Scaled Recipe to Meal Plan',
        `Add "${recipeTitle}" (${scaledServings} servings) to your meal plan?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Meal Plan',
            onPress: () => {
              setShowTimePickerModal(true);
            },
          },
        ]
      );
    } else if (recipeId && recipeTitle) {
      // Regular recipe to add
      setShowTimePickerModal(true);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [recipeId, recipeTitle, scaledServings]);

  // Reload meals when selected date changes
  useEffect(() => {
    // Only load if component is mounted
    if (isMountedRef.current) {
      loadMealPlan();
    }
  }, [selectedDate]);
  
  // Restore scroll position after expandedDays changes (for collapsible view)
  useLayoutEffect(() => {
    if (viewMode === 'collapsible' && scrollViewRef.current) {
      const savedScrollY = scrollPositionRef.current;
      scrollViewRef.current.scrollTo({ 
        y: savedScrollY, 
        animated: false 
      });
    }
  }, [expandedDays, viewMode]);

  // Reload cost analysis when meals change
  useEffect(() => {
    if (Object.keys(hourlyMeals).length > 0) {
      loadCostAnalysis();
    } else {
      setCostAnalysis(null);
    }
  }, [hourlyMeals]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    HapticPatterns.buttonPress();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <View className="w-8" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meal Plan</Text>
          <View className="w-8" />
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: Spacing.lg }} nestedScrollEnabled={true}>
          {/* Weekly Calendar Skeleton */}
          <WeeklyCalendarSkeleton />
          
          {/* Daily Macros Skeleton */}
          <View className="px-4 mb-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
              <View className="space-y-2">
                <View>
                  <View className="flex-row justify-between mb-1">
                    <SkeletonLoader width={60} height={12} borderRadius={4} />
                    <SkeletonLoader width={40} height={12} borderRadius={4} />
        </View>
                  <SkeletonLoader width="100%" height={8} borderRadius={4} />
                </View>
                <View>
                  <View className="flex-row justify-between mb-1">
                    <SkeletonLoader width={60} height={12} borderRadius={4} />
                    <SkeletonLoader width={40} height={12} borderRadius={4} />
                  </View>
                  <SkeletonLoader width="85%" height={8} borderRadius={4} />
                </View>
                <View>
                  <View className="flex-row justify-between mb-1">
                    <SkeletonLoader width={60} height={12} borderRadius={4} />
                    <SkeletonLoader width={40} height={12} borderRadius={4} />
                  </View>
                  <SkeletonLoader width="70%" height={8} borderRadius={4} />
                </View>
              </View>
            </View>
          </View>
          
          {/* Meal Cards Skeleton */}
          <View className="px-4">
            <SkeletonLoader width="30%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((i) => (
              <MealCardSkeleton key={i} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 56 }}>
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>🍽️</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>Meal Plan</Text>
          </View>
          <View className="flex-row items-center" style={{ height: 28 }}>
            <Text className="text-base font-semibold text-gray-700 dark:text-gray-200 mr-2" numberOfLines={1} style={{ lineHeight: 20 }}>
              {formatDateRange(weekDates[0], weekDates[6])}
            </Text>
            {!isToday(selectedDate) && (
              <HapticTouchableOpacity
                onPress={handleJumpToToday}
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: isDark ? `${Colors.primary}33` : Colors.primaryLight, height: 28, justifyContent: 'center' }}
              >
                <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.primary : Colors.primary, lineHeight: 16 }}>
                  Today
                </Text>
              </HapticTouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Quick Actions - Badge Row */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Header */}
        <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Quick Actions Menu</Text>
        </View>
        
        {/* Quick Action Badges */}
        <View className="px-4 pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            style={{ flexGrow: 0 }}
            nestedScrollEnabled={true}
          >
            <View className="flex-row items-center" style={{ gap: 8, flexWrap: 'nowrap' }}>
              {/* Create Full Day */}
              <HapticTouchableOpacity
                onPress={() => {
                  if (!generatingPlan) {
                    handleGenerateFullDay();
                  }
                }}
                disabled={generatingPlan}
                className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
              >
                <Text className="text-base">🤖</Text>
                <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                  {generatingPlan ? 'Creating...' : 'Create Full Day'}
                </Text>
              </HapticTouchableOpacity>

              {/* Create Remaining Meals */}
              <HapticTouchableOpacity
                onPress={() => {
                  if (!generatingPlan) {
                    handleGenerateRemainingMeals();
                  }
                }}
                disabled={generatingPlan}
                className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
              >
                <Text className="text-base">🍽️</Text>
                <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                  Remaining Meals
                </Text>
              </HapticTouchableOpacity>

              {/* Create Weekly Plan */}
              <HapticTouchableOpacity
                onPress={() => {
                  if (!generatingPlan) {
                    handleGenerateWeeklyPlan();
                  }
                }}
                disabled={generatingPlan}
                className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
              >
                <Text className="text-base">📅</Text>
                <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                  {generatingPlan ? 'Creating...' : 'Weekly Plan'}
                </Text>
              </HapticTouchableOpacity>

              {/* Create Shopping List */}
              <HapticTouchableOpacity
                onPress={() => {
                  setShowShoppingListNameModal(true);
                }}
                disabled={generatingShoppingList}
                className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingShoppingList ? 'opacity-50' : ''}`}
              >
                <Text className="text-base">🛒</Text>
                <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                  {generatingShoppingList ? 'Creating...' : 'Shopping List'}
                </Text>
              </HapticTouchableOpacity>

              {/* Clear All Meals */}
              <HapticTouchableOpacity
                onPress={() => {
                  HapticPatterns.buttonPress();
                  Alert.alert('Clear Day', 'Clear all meals for this day?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        setHourlyMeals({});
                        setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
                      },
                    },
                  ]);
                }}
                className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
              >
                <Text className="text-base">🗑️</Text>
                <Text className="text-sm font-semibold ml-1.5" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                  Clear All
                </Text>
              </HapticTouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
        nestedScrollEnabled={true}
        onScroll={(event) => {
          scrollPositionRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? DarkColors.primary : Colors.primary}
            colors={[isDark ? DarkColors.primary : Colors.primary]}
          />
        }
      >
        {/* Weekly Nutrition Summary */}
        {weeklyNutrition && (
          <View className="px-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Weekly Nutrition Summary
            </Text>
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm text-gray-600 dark:text-gray-200">
                  {weeklyNutrition.period.days} days
                </Text>
                <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                  {weeklyNutrition.completed.completionRate.toFixed(0)}% Complete
                </Text>
              </View>

              {/* Calories Progress Chart */}
              {weeklyNutrition.goals && (
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Weekly Calories</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {weeklyNutrition.totals.calories.toLocaleString()} / {weeklyNutrition.goals.weeklyCalories.toLocaleString()}
                    </Text>
                  </View>
                  <View className="relative w-full" style={{ height: 12, borderRadius: 6, overflow: 'hidden' }}>
                    <View 
                      className="absolute rounded-full"
                      style={{ 
                        width: '100%', 
                        height: 12, 
                        backgroundColor: isDark ? '#374151' : '#E5E7EB',
                        borderRadius: 6
                      }} 
                    />
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 12,
                        width: `${Math.min((weeklyNutrition.totals.calories / weeklyNutrition.goals.weeklyCalories) * 100, 100)}%`,
                        backgroundColor: weeklyNutrition.totals.calories > weeklyNutrition.goals.weeklyCalories
                          ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                          : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen),
                        borderRadius: 6
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Daily Average Calories Chart */}
              {weeklyNutrition.goals && (
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Daily Average</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {weeklyNutrition.averages.dailyCalories.toFixed(0)} / {weeklyNutrition.goals.dailyCalories}
                    </Text>
                  </View>
                  <View className="relative w-full" style={{ height: 12, borderRadius: 6, overflow: 'hidden' }}>
                    <View 
                      className="absolute rounded-full"
                      style={{ 
                        width: '100%', 
                        height: 12, 
                        backgroundColor: isDark ? '#374151' : '#E5E7EB',
                        borderRadius: 6
                      }} 
                    />
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 12,
                        width: `${Math.min((weeklyNutrition.averages.dailyCalories / weeklyNutrition.goals.dailyCalories) * 100, 100)}%`,
                        backgroundColor: weeklyNutrition.averages.dailyCalories > weeklyNutrition.goals.dailyCalories
                          ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                          : (isDark ? DarkColors.primary : Colors.primary),
                        borderRadius: 6
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Macro Breakdown Chart */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-3">Macro Breakdown</Text>
                <View className="flex-row justify-between space-x-2">
                  {/* Protein */}
                  <View className="flex-1 items-center">
                    <View className="relative w-full mb-2" style={{ height: 80 }}>
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg"
                        style={{ 
                          height: `${Math.min((weeklyNutrition.totals.protein / (weeklyNutrition.goals?.weeklyProtein || weeklyNutrition.totals.protein * 1.2)) * 100, 100)}%`,
                          backgroundColor: '#3B82F6',
                          borderRadius: 4
                        }}
                      />
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                        style={{ 
                          height: '100%',
                          backgroundColor: '#3B82F6',
                          borderRadius: 4
                        }}
                      />
                    </View>
                    <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {weeklyNutrition.totals.protein.toFixed(0)}g
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Protein</Text>
                  </View>

                  {/* Carbs */}
                  <View className="flex-1 items-center">
                    <View className="relative w-full mb-2" style={{ height: 80 }}>
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg"
                        style={{ 
                          height: `${Math.min((weeklyNutrition.totals.carbs / (weeklyNutrition.goals?.weeklyCarbs || weeklyNutrition.totals.carbs * 1.2)) * 100, 100)}%`,
                          backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                          borderRadius: 4
                        }}
                      />
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                        style={{ 
                          height: '100%',
                          backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                          borderRadius: 4
                        }}
                      />
                    </View>
                    <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                      {weeklyNutrition.totals.carbs.toFixed(0)}g
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Carbs</Text>
                  </View>

                  {/* Fat */}
                  <View className="flex-1 items-center">
                    <View className="relative w-full mb-2" style={{ height: 80 }}>
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg"
                        style={{ 
                          height: `${Math.min((weeklyNutrition.totals.fat / (weeklyNutrition.goals?.weeklyFat || weeklyNutrition.totals.fat * 1.2)) * 100, 100)}%`,
                          backgroundColor: '#8B5CF6',
                          borderRadius: 4
                        }}
                      />
                      <View 
                        className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                        style={{ 
                          height: '100%',
                          backgroundColor: '#8B5CF6',
                          borderRadius: 4
                        }}
                      />
                    </View>
                    <Text className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {weeklyNutrition.totals.fat.toFixed(0)}g
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Fat</Text>
                  </View>
                </View>
              </View>

              {/* Completion Progress Chart */}
              <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Meal Completion</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {weeklyNutrition.completed.mealsCompleted} / {weeklyNutrition.completed.totalMeals}
                  </Text>
                </View>
                <View className="relative w-full" style={{ height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <View 
                    className="absolute rounded-full"
                    style={{ 
                      width: '100%', 
                      height: 8, 
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 4
                    }} 
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 8,
                      width: `${weeklyNutrition.completed.completionRate}%`,
                      backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                      borderRadius: 4
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}


        {/* Weekly Calendar View */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Meal Plan</Text>
            <View className="flex-row items-center space-x-2">
        <HapticTouchableOpacity 
                onPress={() => {
                  HapticPatterns.buttonPress();
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedDate(newDate);
                }}
          className="p-2"
        >
                <Icon name={Icons.CHEVRON_BACK} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Previous week" />
        </HapticTouchableOpacity>
        <HapticTouchableOpacity 
                onPress={() => {
                  HapticPatterns.buttonPress();
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate);
                }}
          className="p-2"
        >
                <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Next week" />
        </HapticTouchableOpacity>
            </View>
      </View>

          {/* Week Dates */}
          <View className="flex-row mb-2">
            {weekDates.map((date, index) => {
              const dateIsSelected = isSelected(date);
              const isTodayDate = isToday(date);
              const dateStr = date.toISOString().split('T')[0];
              const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
              
              // Count total meals (breakfast, lunch, dinner, snacks) - including completed
              let mealsCount = 0;
              if (dayMeals.breakfast) mealsCount++;
              if (dayMeals.lunch) mealsCount++;
              if (dayMeals.dinner) mealsCount++;
              if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
                mealsCount += dayMeals.snacks.length;
              }
              
              // Check if day has passed
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);
              const dayHasPassed = checkDate < today;
              
              const mealPrepSessions = weeklyPlan?.weeklyPlan?.[dateStr]?.mealPrepSessions || [];
              const hasMealPrep = mealPrepSessions.length > 0;
              
              return (
                <HapticTouchableOpacity
                  key={index}
                  onPress={() => {
                    try {
                      HapticPatterns.buttonPress();
                      setSelectedDate(new Date(date)); // Create a new Date object to ensure it's valid
                      // If the date has meals, show the modal
                      if (mealsCount > 0) {
                        setSelectedDayForModal(new Date(date));
                        setShowDayMealsModal(true);
                      }
                    } catch (error) {
                      console.error('Error selecting date:', error);
                    }
                  }}
                  className={`flex-1 mx-1 rounded-lg p-3 ${
                    dateIsSelected ? '' : 'bg-white dark:bg-gray-800'
                  } ${isTodayDate ? 'border-2' : ''}`}
                  style={{
                    ...(dateIsSelected ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : {}),
                    ...(isTodayDate ? { borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : {})
                  }}
                >
                  <Text className={`text-xs text-center font-medium ${
                    dateIsSelected ? 'text-white' : 'text-gray-500 dark:text-gray-200'
                  }`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text className={`text-lg text-center font-bold mt-1 ${
                    dateIsSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                  }`} style={!dateIsSelected && isTodayDate ? { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}>
                    {date.getDate()}
                  </Text>
                  {mealsCount > 0 && (
                    <View className="mt-1.5 self-center" style={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: dateIsSelected 
                        ? 'rgba(255, 255, 255, 0.95)' 
                        : (isDark ? DarkColors.primary : Colors.primary),
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 7,
                      borderWidth: dateIsSelected ? 2 : 0,
                      borderColor: dateIsSelected ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                    }}>
                      <Text className="font-bold" style={{ 
                        color: dateIsSelected
                          ? (isDark ? DarkColors.primaryDark : Colors.primary)
                          : '#FFFFFF',
                        fontSize: FontSize.sm,
                        fontWeight: '700',
                      }}>
                        {mealsCount}
                      </Text>
                    </View>
                  )}
                  {hasMealPrep && (
                    <View className={`mt-1 rounded-full px-2 py-0.5 ${
                      dateIsSelected ? 'bg-white bg-opacity-30' : ''
                    }`} style={!dateIsSelected ? { backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight } : undefined}>
                      <Text className={`text-xs text-center font-semibold ${
                        dateIsSelected ? 'text-white' : ''
                      }`} style={!dateIsSelected ? { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}>
                        🍱 Prep
                      </Text>
                    </View>
                  )}
                </HapticTouchableOpacity>
              );
            })}
          </View>

        </View>

        {/* Thawing Reminders */}
        {thawingReminders.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              ❄️ Thawing Reminders
            </Text>
            {thawingReminders.slice(0, 3).map((reminder: any, index: number) => {
              const thawDate = new Date(reminder.recommendedThawDate);
              const isToday = thawDate.toDateString() === new Date().toDateString();
              const isTomorrow = thawDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <View key={index} className="rounded-lg p-3 mb-2 border" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight, borderColor: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {reminder.recipe.title}
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : thawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {reminder.reminderMessage}
                  </Text>
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                    ⏰ Thaw {reminder.estimatedThawHours} hours before use
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Meal Prep Sessions for Selected Date */}
        {(() => {
          const dateStr = selectedDate.toISOString().split('T')[0];
          const dayMealPrepSessions = weeklyPlan?.weeklyPlan?.[dateStr]?.mealPrepSessions || [];
          
          if (dayMealPrepSessions.length > 0) {
            return (
              <View className="px-4 mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  🍱 Meal Prep - {formatDate(selectedDate)}
                </Text>
                
                {/* Scheduled Meal Prep Sessions */}
                {dayMealPrepSessions.length > 0 && (
                  <View className="mb-3">
                    {dayMealPrepSessions.map((session: any) => (
                      <View key={session.id} className="rounded-lg p-4 mb-2 border" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight, borderColor: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Meal prep session" />
                            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                              Meal Prep Session
                            </Text>
                          </View>
                          {session.isCompleted && (
                            <View className="px-2 py-1 rounded" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                              <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>Completed</Text>
                            </View>
                          )}
                        </View>
                        {session.scheduledTime && (
                          <Text className="text-sm text-gray-600 dark:text-gray-100 mb-1">
                            ⏰ {session.scheduledTime}
                          </Text>
                        )}
                        {session.duration && (
                          <Text className="text-sm text-gray-600 dark:text-gray-100 mb-1">
                            ⏱️ {session.duration} minutes
                          </Text>
                        )}
                        {session.recipes && session.recipes.length > 0 && (
                          <Text className="text-sm text-gray-600 dark:text-gray-100">
                            📋 {session.recipes.length} recipe{session.recipes.length > 1 ? 's' : ''} to prep
                          </Text>
                        )}
                        {session.notes && (
                          <Text className="text-sm text-gray-600 dark:text-gray-100 mt-1 italic">
                            {session.notes}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
              </View>
            );
          }
          return null;
        })()}

        {/* Total Prep Time Indicator */}
        {totalPrepTime > 0 && (
          <View className="px-4 mb-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Icon name={Icons.COOK_TIME} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Total prep time" />
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                    Total Prep Time
                  </Text>
                </View>
                <Text className="text-lg font-bold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                  {totalPrepTime} min
                </Text>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                Combined cooking time for all meals today
              </Text>
            </View>
          </View>
        )}

        {/* Daily Macros & Summary */}
        <View className="px-4 mb-4">
          <HapticTouchableOpacity
            onPress={() => {
              HapticPatterns.buttonPress();
              setMacrosExpanded(!macrosExpanded);
            }}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Daily Macros - {formatDate(selectedDate)}
          </Text>
            <Icon 
              name={macrosExpanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN} 
              size={IconSizes.MD} 
              color={isDark ? DarkColors.text.secondary : Colors.text.secondary} 
              accessibilityLabel={macrosExpanded ? "Collapse macros" : "Expand macros"} 
            />
          </HapticTouchableOpacity>
          
          {macrosExpanded ? (
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            {/* Macro Breakdown with Progress Bars */}
              <View className="flex-row justify-between" style={{ gap: 8 }}>
              <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
                <Text className="text-sm text-gray-500 dark:text-gray-200">Calories</Text>
                <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.calories, targetMacros.calories)}>
                  {dailyMacros.calories}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.calories}</Text>
                <View className="relative w-full" style={{ height: 8, marginTop: 4, overflow: 'visible' }}>
                  <View 
                    className="absolute rounded-full"
                    style={{ 
                      width: '100%', 
                      height: 8, 
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 999
                    }} 
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 8,
                      width: dailyMacros.calories >= targetMacros.calories ? '100%' : `${(dailyMacros.calories / targetMacros.calories) * 100}%`,
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      borderRadius: 999
                    }}
                  />
                  {dailyMacros.calories > targetMacros.calories && (
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 8,
                        width: `${Math.min(((dailyMacros.calories - targetMacros.calories) / targetMacros.calories) * 100, 30)}%`,
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderRadius: 999,
                        left: '100%',
                        opacity: 0.7
                      }}
                    />
                  )}
                </View>
              </View>

              <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
                <Text className="text-sm text-gray-500 dark:text-gray-200">Protein</Text>
                <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.protein, targetMacros.protein)}>
                  {dailyMacros.protein}g
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.protein}g</Text>
                <View className="relative w-full" style={{ height: 8, marginTop: 4, overflow: 'visible' }}>
                  <View 
                    className="absolute rounded-full"
                    style={{ 
                      width: '100%', 
                      height: 8, 
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 999
                    }} 
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 8,
                      width: dailyMacros.protein >= targetMacros.protein ? '100%' : `${(dailyMacros.protein / targetMacros.protein) * 100}%`,
                      backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                      borderRadius: 999
                    }}
                  />
                  {dailyMacros.protein > targetMacros.protein && (
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 8,
                        width: `${Math.min(((dailyMacros.protein - targetMacros.protein) / targetMacros.protein) * 100, 30)}%`,
                        backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                        borderRadius: 999,
                        left: '100%',
                        opacity: 0.7
                      }}
                    />
                  )}
                </View>
              </View>

              <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
                <Text className="text-sm text-gray-500 dark:text-gray-200">Carbs</Text>
                <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.carbs, targetMacros.carbs)}>
                  {dailyMacros.carbs}g
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.carbs}g</Text>
                <View className="relative w-full" style={{ height: 8, marginTop: 4, overflow: 'visible' }}>
                  <View 
                    className="absolute rounded-full"
                    style={{ 
                      width: '100%', 
                      height: 8, 
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 999
                    }} 
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 8,
                      width: dailyMacros.carbs >= targetMacros.carbs ? '100%' : `${(dailyMacros.carbs / targetMacros.carbs) * 100}%`,
                      backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                      borderRadius: 999
                    }}
                  />
                  {dailyMacros.carbs > targetMacros.carbs && (
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 8,
                        width: `${Math.min(((dailyMacros.carbs - targetMacros.carbs) / targetMacros.carbs) * 100, 30)}%`,
                        backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                        borderRadius: 999,
                        left: '100%',
                        opacity: 0.7
                      }}
                    />
                  )}
                </View>
              </View>

              <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
                <Text className="text-sm text-gray-500 dark:text-gray-200">Fat</Text>
                <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.fat, targetMacros.fat)}>
                  {dailyMacros.fat}g
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.fat}g</Text>
                <View className="relative w-full" style={{ height: 8, marginTop: 4, overflow: 'visible' }}>
                  <View 
                    className="absolute rounded-full"
                    style={{ 
                      width: '100%', 
                      height: 8, 
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 999
                    }} 
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 8,
                      width: dailyMacros.fat >= targetMacros.fat ? '100%' : `${(dailyMacros.fat / targetMacros.fat) * 100}%`,
                      backgroundColor: isDark ? DarkColors.accent : Colors.accent,
                      borderRadius: 999
                    }}
                  />
                  {dailyMacros.fat > targetMacros.fat && (
                    <View
                      className="absolute rounded-full"
                      style={{
                        height: 8,
                        width: `${Math.min(((dailyMacros.fat - targetMacros.fat) / targetMacros.fat) * 100, 30)}%`,
                        backgroundColor: isDark ? DarkColors.accent : Colors.accent,
                        borderRadius: 999,
                        left: '100%',
                        opacity: 0.7
                      }}
                    />
                  )}
                </View>
              </View>
            </View>
          </View>
          ) : (
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center flex-1">
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Calories</Text>
                    <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.calories, targetMacros.calories)}>
                      {dailyMacros.calories}/{targetMacros.calories}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Protein</Text>
                    <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.protein, targetMacros.protein)}>
                      {dailyMacros.protein}g/{targetMacros.protein}g
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Carbs</Text>
                    <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.carbs, targetMacros.carbs)}>
                      {dailyMacros.carbs}g/{targetMacros.carbs}g
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Fat</Text>
                    <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.fat, targetMacros.fat)}>
                      {dailyMacros.fat}g/{targetMacros.fat}g
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>


        {/* View Mode Selector */}
        <View className="px-4 mb-4">
          <HapticTouchableOpacity
            onPress={() => setShowViewModePicker(true)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="View mode" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 dark:text-gray-100 font-medium text-base">
                {viewMode === '24hour' ? '24-Hour Timeline' : viewMode === 'compact' ? 'Compact (Meal Types)' : 'Collapsible Weekly'}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
          </HapticTouchableOpacity>
        </View>

        {/* Conditional Meal Plan Views */}
        {viewMode === '24hour' && (
        <View className="px-4 mb-4" style={{ width: '100%' }}>

          <View>
            {hours.map((hourData, index) => {
              const isDragOver = dragOverHour === hourData.hour && draggingMeal !== null;

                // Filter meals based on mealTypeFilter
                const mealsForHour = hourlyMeals[hourData.hour] || [];
                const filteredMeals = mealTypeFilter === 'all'
                  ? mealsForHour
                  : mealsForHour.filter((meal) => {
                      if (mealTypeFilter === 'snacks') {
                        return meal.mealType === 'snack' || meal.mealType === 'dessert';
                      }
                      return meal.mealType === mealTypeFilter;
                    });

                // Don't render hour if no meals match filter and there are no meals at all (unless it's "all")
                if (mealTypeFilter !== 'all' && filteredMeals.length === 0 && mealsForHour.length === 0) {
                  return null;
                }

              return (
                <View key={index} style={{ marginBottom: 4 }}>
                  {/* Hour Header */}
                  <AnimatedHourHeader
                    hourData={hourData}
                      hourlyMeals={mealTypeFilter === 'all' ? hourlyMeals : { [hourData.hour]: filteredMeals }}
                    isDark={isDark}
                    isDragOver={isDragOver}
                    onAddMeal={handleAddMealToHour}
                  />

                  {/* Drop Zone Indicator - Show when dragging over empty hour */}
                  {draggingMeal !== null && dragOverHour === hourData.hour && (!hourlyMeals[hourData.hour] || hourlyMeals[hourData.hour].length === 0) && (
                    <View className="ml-4 mb-2">
                      <View 
                        className="rounded-lg border-2 border-dashed items-center justify-center py-4"
                        style={{ 
                          borderColor: isDark ? DarkColors.primary : Colors.primary,
                          backgroundColor: isDark ? `${Colors.primaryLight}20` : `${Colors.primaryLight}30`,
                        }}
                      >
                        <Icon 
                          name={Icons.ADD_CIRCLE_OUTLINE} 
                          size={IconSizes.MD} 
                          color={isDark ? DarkColors.primary : Colors.primary} 
                          accessibilityLabel="Drop zone" 
                        />
                        <Text 
                          className="text-sm font-medium mt-1"
                          style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                        >
                          Drop meal here
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Meals for this hour - displayed between hours */}
                  {filteredMeals.length > 0 && (
                  <View className="ml-4 mb-2">
                      {filteredMeals.map((meal, mealIndex) => {
                        // Find the actual index in the original array for proper meal handling
                        const actualMealIndex = mealsForHour.findIndex(m => m.id === meal.id);
                        const isDragging = draggingMeal?.hour === hourData.hour && draggingMeal?.mealIndex === actualMealIndex;
                      const isDragOver = dragOverHour === hourData.hour;
                        const isSnack = meal.mealType === 'snack' || meal.mealType === 'dessert';
                      
                      return (
                        <DraggableMealCard
                          key={`${hourData.hour}-${mealIndex}`}
                          meal={meal}
                          hour={hourData.hour}
                          mealIndex={mealIndex}
                          isDark={isDark}
                          isDragging={isDragging}
                          isDragOver={isDragOver}
                            isSnack={isSnack}
                            onDragStart={() => setDraggingMeal({ hour: hourData.hour, mealIndex: actualMealIndex, meal })}
                          onDragEnd={(targetHour: number) => {
                            if (targetHour !== hourData.hour) {
                                handleMoveMeal(hourData.hour, actualMealIndex, targetHour);
                            }
                            setDraggingMeal(null);
                            setDragOverHour(null);
                          }}
                            onDragOver={(targetHour: number) => {
                              if (targetHour === -1) {
                                setDragOverHour(null);
                              } else if (targetHour >= 0 && targetHour < 24) {
                                setDragOverHour(targetHour);
                              }
                            }}
                          onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                            onLongPress={() => handleRemoveMeal(hourData.hour, actualMealIndex)}
                            isCompleted={meal.mealPlanMealId ? mealCompletionStatus[meal.mealPlanMealId] || false : false}
                            hasNotes={meal.mealPlanMealId ? !!mealNotes[meal.mealPlanMealId] : false}
                            notesText={meal.mealPlanMealId && mealNotes[meal.mealPlanMealId] ? mealNotes[meal.mealPlanMealId] : undefined}
                            onToggleComplete={handleToggleMealCompletion}
                            onOpenNotes={handleOpenNotes}
                            onGetSwapSuggestions={handleGetSwapSuggestions}
                            swapSuggestions={meal.mealPlanMealId ? mealSwapSuggestions[meal.mealPlanMealId] || [] : []}
                            isSwapExpanded={meal.mealPlanMealId ? expandedSwapMealId === meal.mealPlanMealId : false}
                            isLoadingSwap={meal.mealPlanMealId ? loadingSwapSuggestions === meal.mealPlanMealId : false}
                            onSwapMeal={handleSwapMeal}
                        />
                      );
                    })}
                  </View>
                )}
                </View>
              );
            })}
          </View>
        </View>
        )}

        {viewMode === 'compact' && (
        <View className="px-4 mb-4" style={{ width: '100%' }}>
            {(() => {
              const groupedMeals = groupMealsByType(hourlyMeals);
              const mealTypes = [
                { key: 'breakfast', label: 'Breakfast', icon: '🌅', color: isDark ? DarkColors.primary : Colors.primary },
                { key: 'lunch', label: 'Lunch', icon: '☀️', color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed },
                { key: 'dinner', label: 'Dinner', icon: '🌙', color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen },
                { key: 'snacks', label: 'Snacks', icon: '🍎', color: isDark ? DarkColors.accent : Colors.accent },
              ];

              return (
                <View className="space-y-3">
                  {mealTypes.map((mealType) => {
                    const meals = groupedMeals[mealType.key as keyof typeof groupedMeals];
                    if (meals.length === 0) return null;

                    return (
                      <View key={mealType.key} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <View className="flex-row items-center mb-3">
                          <Text className="text-2xl mr-2">{mealType.icon}</Text>
                          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                            {mealType.label}
                          </Text>
              <HapticTouchableOpacity
                            onPress={() => {
                              // Find first available hour for this meal type
                              const defaultHour = mealType.key === 'breakfast' ? 7 : mealType.key === 'lunch' ? 12 : mealType.key === 'dinner' ? 18 : 15;
                              handleAddMealToHour(defaultHour);
                            }}
                            className="px-3 py-1 rounded-lg"
                            style={{ backgroundColor: mealType.color }}
              >
                            <Text className="text-white text-sm font-semibold">+ Add</Text>
              </HapticTouchableOpacity>
          </View>
                        <View className="space-y-2">
                          {meals.map((meal, index) => {
                            const hour = meal.hour;
                            const mealIndex = hourlyMeals[hour]?.findIndex(m => m.id === meal.id) || 0;
                            const isSnack = mealType.key === 'snacks';
                            const backgroundColor = isSnack 
                              ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                              : (isDark ? `${mealType.color}22` : `${mealType.color}11`);
                            const borderColor = isSnack 
                              ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                              : mealType.color;
                            
                            return (
                              <HapticTouchableOpacity
                                key={`${mealType.key}-${index}`}
                                onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                                onLongPress={() => handleRemoveMeal(hour, mealIndex)}
                                className="flex-row items-center p-3 rounded-lg border"
                                style={{ 
                                  backgroundColor,
                                  borderColor
                                }}
                              >
                                {meal.imageUrl ? (
                                  <Image 
                                    source={{ uri: meal.imageUrl }} 
                                    className="w-16 h-16 rounded-lg mr-3"
                                    style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                                  />
                                ) : (
                                  <View className="w-16 h-16 rounded-lg mr-3 items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                                    <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="#9CA3AF" />
                </View>
                                )}
                                <View className="flex-1">
                                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    {meal.name || meal.title}
                                  </Text>
                                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {formatTime(hour, 0)} • {meal.calories} cal
                  </Text>
                </View>
                              </HapticTouchableOpacity>
                            );
                          })}
              </View>
                      </View>
                    );
                  })}
                  
                  {Object.values(groupedMeals).flat().length === 0 && (
                    <View className="bg-white dark:bg-gray-800 rounded-lg p-6">
                      <AnimatedEmptyState
                        config={MealPlanEmptyStates.emptyDay}
                        title=""
                        actionLabel="Create Full Day"
                        onAction={() => {
                          if (!generatingPlan) {
                            handleGenerateFullDay();
                          }
                        }}
                      />
                </View>
              )}
                  </View>
              );
            })()}
                </View>
              )}

        {viewMode === 'collapsible' && (
          <View className="px-4 mb-4" style={{ width: '100%' }}>
            <View className="space-y-3">
              {weekDates.map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const isExpanded = expandedDays.has(dateStr);
                const meals = getMealsForDate(date);
                const isSelected = date.toDateString() === selectedDate.toDateString();
                
                return (
                  <View 
                    key={dateStr}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border"
                    style={{ borderColor: isSelected ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#374151' : '#E5E7EB') }}
                  >
                    <HapticTouchableOpacity
                      onPress={() => {
                        const newExpanded = new Set(expandedDays);
                        if (isExpanded) {
                          newExpanded.delete(dateStr);
                        } else {
                          newExpanded.add(dateStr);
                        }
                        setExpandedDays(newExpanded);
                        
                        // Only update selectedDate if it's actually different to prevent unnecessary reloads
                        if (date.toDateString() !== selectedDate.toDateString()) {
                          setSelectedDate(date);
                        }
                      }}
                      className="flex-row items-center justify-between p-4"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-2">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                          {date.toDateString() === new Date().toDateString() && (
                            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? `${Colors.secondaryRed}33` : Colors.secondaryRedLight }}>
                              <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark }}>Today</Text>
                </View>
                          )}
                        </View>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {meals.length} meal{meals.length !== 1 ? 's' : ''} planned
                  </Text>
                </View>
                      <Icon 
                        name={isExpanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN} 
                        size={IconSizes.MD} 
                        color="#6B7280" 
                        accessibilityLabel={isExpanded ? "Collapse" : "Expand"} 
                      />
                    </HapticTouchableOpacity>
                    
                    {isExpanded && (
                      <View className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                        {meals.length > 0 ? (
                          <View className="space-y-2">
                            {meals.map((meal, index) => {
                              const isSnack = meal.mealType === 'snack' || meal.mealType === 'dessert';
                              const backgroundColor = isSnack
                                ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                                : (isDark ? `${Colors.primaryLight}22` : Colors.primaryLight);
                              const borderColor = isSnack
                                ? (isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark)
                                : (isDark ? DarkColors.primaryDark : Colors.primaryDark);
                              
                              return (
                              <HapticTouchableOpacity
                                key={index}
                                onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                                className="flex-row items-center p-3 rounded-lg border"
                                style={{ 
                                  backgroundColor,
                                  borderColor
                                }}
                              >
                                {meal.imageUrl ? (
                                  <Image 
                                    source={{ uri: meal.imageUrl }} 
                                    className="w-12 h-12 rounded-lg mr-3"
                                    style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                                  />
                                ) : (
                                  <View className="w-12 h-12 rounded-lg mr-3 items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                                    <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.SM} color="#9CA3AF" />
                    </View>
                                )}
                                <View className="flex-1">
                                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {meal.title || meal.name}
                                  </Text>
                                  <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {meal.mealType} • {meal.calories} cal
                      </Text>
                    </View>
                              </HapticTouchableOpacity>
                              );
                            })}
                  </View>
                        ) : (
                          <View className="py-4">
                            <AnimatedEmptyState
                              config={MealPlanEmptyStates.emptyDay}
                              title=""
                            />
                </View>
              )}
            </View>
                    )}
                  </View>
                );
              })}
            </View>
            </View>
          )}

        {/* Cost Analysis */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {"💰 Weekly Cost Analysis"}
            </Text>
            {costAnalysis && costAnalysis.budgetExceeded ? (
              <HapticTouchableOpacity
                onPress={handleOptimizeCost}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-semibold text-sm">{"Optimize"}</Text>
              </HapticTouchableOpacity>
            ) : null}
          </View>
          
          <CostAnalysisSection
            costAnalysis={costAnalysis}
            loadingCostAnalysis={loadingCostAnalysis}
            shoppingListSavings={shoppingListSavings}
            maxWeeklyBudget={maxWeeklyBudget}
            isDark={isDark}
            onOptimize={handleOptimizeCost}
          />
        </View>

      </ScrollView>

      {/* Meal & Snack Selector Modal */}
      <MealSnackSelectorModal
        visible={showMealSnackSelector}
        generationType={generationType}
        selectedMeals={selectedMeals}
        selectedSnacks={selectedSnacks}
        maxTotalPrepTime={maxTotalPrepTime}
        maxWeeklyBudget={maxWeeklyBudget}
        targetMacros={targetMacros}
        isDark={isDark}
        onClose={() => {
          setShowMealSnackSelector(false);
          setGenerationType(null);
        }}
        onConfirm={handleConfirmMealSnackSelection}
        setSelectedMeals={setSelectedMeals}
        setSelectedSnacks={setSelectedSnacks}
        setMaxTotalPrepTime={setMaxTotalPrepTime}
        setMaxWeeklyBudget={setMaxWeeklyBudget}
        calculateRecommendedMealsAndSnacks={calculateRecommendedMealsAndSnacks}
      />

      {/* Time Picker Modal */}
      {showTimePickerModal && recipeId && recipeTitle && (
        <View className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Schedule Recipe
            </Text>
            <Text className="text-gray-600 dark:text-gray-100 mb-4">
              Choose a time for "{recipeTitle}":
            </Text>
            
            {/* Time Display */}
            <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100">Selected Time</Text>
              <HapticTouchableOpacity 
                  onPress={toggleManualInput}
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
              >
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                    {showManualInput ? 'Use Picker' : 'Type Time'}
                  </Text>
              </HapticTouchableOpacity>
              </View>
              
              {showManualInput ? (
                <View className="items-center">
                  <TextInput
                    value={manualTimeInput}
                    onChangeText={handleManualTimeInput}
                    placeholder="2:30 PM"
                    placeholderTextColor="#9CA3AF"
                    className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 w-full"
                    keyboardType="default"
                    autoFocus={true}
                  />
                  <Text className="text-xs text-gray-500 dark:text-gray-200 mt-1">
                    Format: 2:30 PM or 14:30
                  </Text>
                </View>
              ) : (
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatTime(selectedHour, selectedMinute)}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Time Picker Wheels */}
            <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <View className="flex-row justify-center items-center">
                {/* Hour Picker */}
                <View className="items-center mr-6">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Hour</Text>
                  <WheelPicker
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    selectedValue={selectedHour}
                    onValueChange={setSelectedHour}
                    width={90}
                  />
                </View>
                
                {/* Separator */}
                <View className="items-center justify-center">
                  <Text className="text-3xl font-bold text-gray-400 dark:text-gray-200">:</Text>
                </View>
                
                {/* Minute Picker */}
                <View className="items-center ml-6">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Min</Text>
                  <WheelPicker
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    selectedValue={selectedMinute}
                    onValueChange={setSelectedMinute}
                    width={90}
                  />
                </View>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <HapticTouchableOpacity 
                onPress={() => {
                  HapticPatterns.buttonPress();
                  setShowTimePickerModal(false);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              
              <HapticTouchableOpacity 
                onPress={() => {
                  HapticPatterns.buttonPressPrimary();
                  handleTimePickerConfirm();
                }}
                className="flex-1 py-3 px-4 rounded-lg"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-medium text-center">Add Recipe</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Meal Notes Modal - Enhanced */}
      <MealNotesModal
        visible={showNotesModal}
        editingMealName={editingMealName}
        editingNotes={editingNotes}
        quickTemplates={quickTemplates}
        isDark={isDark}
        onClose={handleCloseNotesModal}
        onSave={handleSaveNotes}
        onNotesChange={setEditingNotes}
        onInsertBulletPoint={insertBulletPoint}
        onInsertTemplate={insertTemplate}
      />

      {/* Meal Swap Suggestions Modal */}
      <Modal
        visible={showSwapModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Swap Suggestions
              </Text>
              <HapticTouchableOpacity onPress={() => setShowSwapModal(false)}>
                <Icon name={Icons.CLOSE} size={IconSizes.MD} color={isDark ? DarkColors.text.primary : Colors.text.primary} accessibilityLabel="Close" />
              </HapticTouchableOpacity>
            </View>
            
            {selectedMealForSwap && (
              <View className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-sm text-gray-600 dark:text-gray-200 mb-1">Current meal:</Text>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {selectedMealForSwap.name}
                </Text>
              </View>
            )}

            <ScrollView className="max-h-96" nestedScrollEnabled={true}>
              {swapSuggestions.length > 0 ? (
                swapSuggestions.map((suggestion: any, index: number) => (
                  <HapticTouchableOpacity
                    key={index}
                    onPress={() => {
                      Alert.alert(
                        'Swap Meal',
                        `Replace "${selectedMealForSwap?.name}" with "${suggestion.recipe.title}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Swap',
                            onPress: async () => {
                              // TODO: Implement meal swap functionality
                              Alert.alert('Coming Soon', 'Meal swap functionality will be available soon');
                            }
                          }
                        ]
                      );
                    }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3"
                  >
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {suggestion.recipe.title}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-200 mb-2">
                      {suggestion.reason}
                    </Text>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-xs text-gray-500 dark:text-gray-300">
                        {suggestion.recipe.calories} cal
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-300">
                        {suggestion.recipe.cookTime} min
                      </Text>
                    </View>
                  </HapticTouchableOpacity>
                ))
              ) : (
                <Text className="text-gray-600 dark:text-gray-200 text-center py-4">
                  No swap suggestions available
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day's Meals at a Glance Modal */}
      <DayMealsModal
        visible={showDayMealsModal}
        selectedDay={selectedDayForModal}
        weeklyPlan={weeklyPlan}
        isDark={isDark}
        onClose={() => {
          setShowDayMealsModal(false);
          setSelectedDayForModal(null);
        }}
        isToday={isToday}
      />

      {/* Shopping List Name Modal */}
      <Modal
        visible={showShoppingListNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShoppingListNameModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Name Your Shopping List
            </Text>
            <Text className="text-gray-600 dark:text-gray-100 mb-4 text-sm">
              Enter a name for your shopping list (or leave blank to use default)
            </Text>
            
            <TextInput
              value={shoppingListName}
              onChangeText={setShoppingListName}
              placeholder="e.g., Weekly Groceries, Thanksgiving Shopping"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              autoFocus={true}
              maxLength={100}
            />
            
            <View className="flex-row space-x-3">
              <HapticTouchableOpacity 
                onPress={() => {
                  setShowShoppingListNameModal(false);
                  setShoppingListName('');
                }}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
            
            <HapticTouchableOpacity 
                onPress={handleConfirmShoppingListName}
                disabled={generatingShoppingList}
                className={`flex-1 py-3 px-4 bg-emerald-500 dark:bg-emerald-600 rounded-lg ${generatingShoppingList ? 'opacity-50' : ''} flex-row items-center justify-center`}
            >
                {generatingShoppingList ? (
                  <>
                    <PulsingLoader size={14} color="white" />
                    <Text className="text-white font-medium text-center ml-2">Generating...</Text>
                  </>
                ) : (
                  <Text className="text-white font-medium text-center">Create</Text>
                )}
            </HapticTouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>

      {/* View Mode Picker Modal */}
      <Modal
        visible={showViewModePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowViewModePicker(false)}
      >
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={() => setShowViewModePicker(false)}
          className="flex-1 bg-black/50 justify-center items-center px-4"
        >
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
          >
            <View className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select View Mode</Text>
            </View>
            
            <View>
              {[
                { value: '24hour', label: '24-Hour Timeline', description: 'See all meals organized by time of day' },
                { value: 'compact', label: 'Compact (Meal Types)', description: 'Group meals by breakfast, lunch, dinner, snacks' },
                { value: 'collapsible', label: 'Collapsible Weekly', description: 'See all days at once, expand to view details' },
              ].map((mode) => (
                <HapticTouchableOpacity
                  key={mode.value}
                  onPress={() => {
                    setViewMode(mode.value as '24hour' | 'compact' | 'collapsible');
                    setShowViewModePicker(false);
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                    viewMode === mode.value ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={viewMode === mode.value ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                >
                  <Icon 
                    name={viewMode === mode.value ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={viewMode === mode.value ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                    accessibilityLabel={viewMode === mode.value ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <View className="flex-1">
                    <Text className={`text-base ${viewMode === mode.value ? 'font-semibold' : ''} text-gray-900 dark:text-gray-100`} 
                      style={viewMode === mode.value ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                      {mode.label}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {mode.description}
                    </Text>
                  </View>
                </HapticTouchableOpacity>
              ))}
            </View>
          </HapticTouchableOpacity>
        </HapticTouchableOpacity>
      </Modal>
      </SafeAreaView>
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        expression="celebrating"
        onDismiss={() => setShowSuccessModal(false)}
      />

      {/* Shopping List Success Modal */}
      <SuccessModal
        visible={showShoppingListSuccessModal}
        title={shoppingListSuccessMessage.title}
        message={shoppingListSuccessMessage.message}
        expression="proud"
        onDismiss={() => setShowShoppingListSuccessModal(false)}
        actionLabel="View List"
        onAction={() => {
          router.push('/(tabs)/shopping-list');
        }}
      />

      {/* Celebration Toast */}
      <Toast
        visible={showCelebrationToast}
        message={celebrationMessage}
        type="success"
        duration={2000}
        onClose={() => setShowCelebrationToast(false)}
      />
    </>
  );
}
