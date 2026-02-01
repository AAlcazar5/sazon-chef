import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import PulsingLoader from '../../components/ui/PulsingLoader';
import SuccessModal from '../../components/ui/SuccessModal';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import Toast from '../../components/ui/Toast';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import MealCardSkeleton from '../../components/meal-plan/MealCardSkeleton';
import WeeklyCalendarSkeleton from '../../components/meal-plan/WeeklyCalendarSkeleton';
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
import { mealPlanApi, aiRecipeApi, shoppingListApi, userApi, costTrackingApi, mealPrepApi } from '../../lib/api';
import type { WeeklyPlan, DailySuggestion } from '../../types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming, runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Draggable Meal Card Component
interface DraggableMealCardProps {
  meal: any;
  hour: number;
  mealIndex: number;
  isDark: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSnack?: boolean; // Whether this is a snack/dessert
  onDragStart: () => void;
  onDragEnd: (targetHour: number) => void;
  onDragOver: (targetHour: number) => void;
  onPress: () => void;
  onLongPress: () => void;
  isCompleted?: boolean;
  hasNotes?: boolean;
  notesText?: string; // Preview of notes text
  onToggleComplete?: (mealId: string, isCompleted: boolean) => void;
  onOpenNotes?: (mealId: string) => void;
  onGetSwapSuggestions?: (mealId: string, meal: any) => void;
  swapSuggestions?: any[];
  isSwapExpanded?: boolean;
  isLoadingSwap?: boolean;
  onSwapMeal?: (mealId: string, newRecipe: any, currentMeal: any) => void;
}

const DraggableMealCard = ({
  meal,
  hour,
  mealIndex,
  isDark,
  isDragging,
  isDragOver,
  isSnack = false,
  isCompleted = false,
  hasNotes = false,
  notesText,
  onDragStart,
  onDragEnd,
  onDragOver,
  onPress,
  onLongPress,
  onToggleComplete,
  onOpenNotes,
  onGetSwapSuggestions,
  swapSuggestions,
  isSwapExpanded,
  isLoadingSwap,
  onSwapMeal,
}: DraggableMealCardProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  
  // Celebration animation for checkmark
  const checkmarkScale = useSharedValue(isCompleted ? 1 : 0);
  const checkmarkOpacity = useSharedValue(isCompleted ? 1 : 0);
  const celebrationScale = useSharedValue(1);
  
  // Animate checkmark when completion status changes
  useEffect(() => {
    if (isCompleted) {
      // Celebration animation sequence
      checkmarkScale.value = withSpring(1.3, { damping: 8, stiffness: 200 }, () => {
        checkmarkScale.value = withSpring(1, { damping: 10, stiffness: 150 });
      });
      checkmarkOpacity.value = withTiming(1, { duration: 200 });
      celebrationScale.value = withSpring(1.05, { damping: 8, stiffness: 150 }, () => {
        celebrationScale.value = withSpring(1, { damping: 10, stiffness: 150 });
      });
    } else {
      checkmarkScale.value = withTiming(0, { duration: 150 });
      checkmarkOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isCompleted]);
  
  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkmarkScale.value }],
      opacity: checkmarkOpacity.value,
    };
  });
  
  const celebrationAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: celebrationScale.value }],
    };
  });

  // Swipe action state
  const swipeAction = useSharedValue<'none' | 'complete' | 'delete'>('none');
  const swipeProgress = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      swipeAction.value = 'none';
      swipeProgress.value = 0;
    })
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const swipeThreshold = 50; // Minimum distance to trigger swipe
      
      // Determine if this is a horizontal swipe or vertical drag
      if (absX > swipeThreshold && absX > absY * 1.5) {
        // Horizontal swipe detected
        translateX.value = startX.value + event.translationX;
        translateY.value = startY.value; // Keep Y position fixed during swipe
        
        // Determine swipe direction and action
        if (event.translationX > 0) {
          // Swipe right - complete
          swipeAction.value = 'complete';
          swipeProgress.value = Math.min(event.translationX / 100, 1);
        } else {
          // Swipe left - delete
          swipeAction.value = 'delete';
          swipeProgress.value = Math.min(Math.abs(event.translationX) / 100, 1);
        }
      } else if (absY > swipeThreshold || absX < swipeThreshold) {
        // Vertical drag - continue with existing drag behavior
        if (swipeAction.value === 'none') {
          runOnJS(onDragStart)();
          scale.value = withSpring(1.08);
          opacity.value = withSpring(0.9);
        }
        
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
      
      // Detect which hour we're over during active drag
        const hourHeight = 80; // Base height per hour slot
        const hourOffset = Math.round(translateY.value / hourHeight);
        const detectedHour = Math.max(0, Math.min(23, hour + hourOffset));
      
        // Always update drag over state for visual feedback
        if (detectedHour >= 0 && detectedHour < 24) {
        runOnJS(onDragOver)(detectedHour);
      }
      }
    })
    .onEnd((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const swipeThreshold = 80; // Minimum distance to trigger swipe action
      
      // Check if swipe action should be triggered
      if (swipeAction.value === 'complete' && event.translationX > swipeThreshold) {
        // Swipe right completed - mark as complete
        if (onToggleComplete && meal.mealPlanMealId) {
          runOnJS(onToggleComplete)(meal.mealPlanMealId, !isCompleted);
        }
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        swipeAction.value = 'none';
        swipeProgress.value = 0;
      } else if (swipeAction.value === 'delete' && Math.abs(event.translationX) > swipeThreshold) {
        // Swipe left completed - delete meal
        runOnJS(onLongPress)();
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        swipeAction.value = 'none';
        swipeProgress.value = 0;
      } else {
        // Not enough swipe distance or vertical drag - handle normally
        if (swipeAction.value === 'none') {
          // Vertical drag - use the final translation to determine target hour
          const hourHeight = 80;
          const hourOffset = Math.round(translateY.value / hourHeight);
          const targetHour = Math.max(0, Math.min(23, hour + hourOffset));
      runOnJS(onDragEnd)(targetHour);
        }
        
        // Spring back to original position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
        swipeAction.value = 'none';
        swipeProgress.value = 0;
      }
      
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      zIndex: isDragging ? 1000 : 1,
      shadowColor: isDragging ? (isDark ? '#000000' : '#000000') : 'transparent',
      shadowOffset: { width: 0, height: isDragging ? 8 : 0 },
      shadowOpacity: isDragging ? 0.3 : 0,
      shadowRadius: isDragging ? 12 : 0,
      elevation: isDragging ? 16 : 0,
    };
  });
  
  // Swipe action background styles
  const swipeCompleteStyle = useAnimatedStyle(() => {
    const opacity = swipeAction.value === 'complete' ? swipeProgress.value * 0.3 : 0;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
      opacity,
      borderRadius: 8,
    };
  });
  
  const swipeDeleteStyle = useAnimatedStyle(() => {
    const opacity = swipeAction.value === 'delete' ? swipeProgress.value * 0.3 : 0;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
      opacity,
      borderRadius: 8,
    };
  });
  
  // Swipe action icon styles
  const swipeCompleteIconStyle = useAnimatedStyle(() => {
    const scale = swipeAction.value === 'complete' ? swipeProgress.value : 0;
    const translateX = swipeAction.value === 'complete' ? (1 - swipeProgress.value) * -50 : 0;
    return {
      position: 'absolute',
      right: 20,
      top: '50%',
      transform: [
        { translateY: -12 },
        { translateX },
        { scale },
      ],
      opacity: swipeProgress.value,
    };
  });
  
  const swipeDeleteIconStyle = useAnimatedStyle(() => {
    const scale = swipeAction.value === 'delete' ? swipeProgress.value : 0;
    const translateX = swipeAction.value === 'delete' ? (1 - swipeProgress.value) * 50 : 0;
    return {
      position: 'absolute',
      left: 20,
      top: '50%',
      transform: [
        { translateY: -12 },
        { translateX },
        { scale },
      ],
      opacity: swipeProgress.value,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Reanimated.View
        style={[
          {
            marginBottom: 12,
            borderRadius: 8,
            padding: 16,
            borderWidth: 2,
            backgroundColor: isSnack 
              ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
              : (isDark ? `${Colors.primaryLight}33` : Colors.primaryLight),
            borderColor: isDragOver 
              ? (isSnack 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.primary : Colors.primary))
              : isCompleted
              ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
              : (isSnack
                  ? (isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark)
                  : (isDark ? DarkColors.primaryDark : Colors.primaryDark)),
            overflow: 'hidden',
          },
          animatedStyle,
          isCompleted ? celebrationAnimatedStyle : undefined,
        ]}
      >
        {/* Swipe action backgrounds */}
        <Reanimated.View style={swipeCompleteStyle} pointerEvents="none" />
        <Reanimated.View style={swipeDeleteStyle} pointerEvents="none" />
        
        {/* Swipe action icons */}
        <Reanimated.View style={swipeCompleteIconStyle} pointerEvents="none">
          <Icon 
            name={Icons.CHECKMARK_CIRCLE} 
            size={24} 
            color="#FFFFFF" 
            accessibilityLabel="Complete"
          />
        </Reanimated.View>
        <Reanimated.View style={swipeDeleteIconStyle} pointerEvents="none">
          <Icon 
            name={Icons.DELETE_OUTLINE} 
            size={24} 
            color="#FFFFFF" 
            accessibilityLabel="Delete"
          />
        </Reanimated.View>
        <HapticTouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.7}
        >
          {/* Recipe Image */}
          {meal.imageUrl && (
            <View className="mb-3 rounded-lg overflow-hidden" style={{ height: 120 }}>
              <Image
                source={{ uri: meal.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessibilityLabel={`${meal.name} image`}
              />
            </View>
          )}

          {/* Recipe Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{meal.name}</Text>
                <Reanimated.View style={checkmarkAnimatedStyle}>
                  {isCompleted && (
                    <Icon 
                      name={Icons.CHECKMARK_CIRCLE} 
                      size={16} 
                      color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} 
                      accessibilityLabel="Completed"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Reanimated.View>
              </View>
              <View className="flex-row items-center space-x-3">
              <Text className="text-sm text-gray-600 dark:text-gray-100">{meal.calories} calories</Text>
                {meal.cookTime && (
                  <View className="flex-row items-center">
                    <Icon name={Icons.TIME_OUTLINE} size={IconSizes.XS} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Prep time" />
                    <Text className="text-sm text-gray-600 dark:text-gray-100 ml-1">
                      {meal.cookTime < 60 
                        ? `${meal.cookTime} min`
                        : `${Math.floor(meal.cookTime / 60)}h ${meal.cookTime % 60 > 0 ? `${meal.cookTime % 60}min` : ''}`.trim()}
                    </Text>
            </View>
                )}
              </View>
            </View>
            <View className="flex-row items-center space-x-2">
              {meal.mealPlanMealId && onToggleComplete && (
                <Switch
                  value={isCompleted}
                  onValueChange={(value) => onToggleComplete(meal.mealPlanMealId, value)}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                  thumbColor="#FFFFFF"
                />
              )}
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.XS} color="#9CA3AF" accessibilityLabel="View recipe" />
            </View>
          </View>

          {/* Macro Breakdown */}
          <View className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-100 mb-2">Nutritional Info</Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-lg font-bold text-blue-600 dark:text-blue-400">{meal.protein}g</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-200">Protein</Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>{meal.carbs}g</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-200">Carbs</Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-purple-600 dark:text-purple-400">{meal.fat}g</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-200">Fat</Text>
              </View>
            </View>
          </View>
          
          {/* Additional Info */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-4">
              {meal.difficulty && (
                <View className="flex-row items-center">
                  <Icon name={Icons.STAR_OUTLINE} size={12} color="#6B7280" accessibilityLabel="Difficulty" />
                  <Text className="text-xs text-gray-600 dark:text-gray-100 ml-1 capitalize">{meal.difficulty}</Text>
                </View>
              )}
              {meal.cuisine && (
                <View className="flex-row items-center">
                  <Text className="text-xs text-gray-600 dark:text-gray-100 capitalize">{meal.cuisine}</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center flex-wrap">
              {meal.mealPlanMealId && (
                <>
                  {onOpenNotes && (
                    <HapticTouchableOpacity
                      onPress={() => onOpenNotes(meal.mealPlanMealId)}
                      className="mr-2"
                    >
                      <Icon 
                        name={hasNotes ? Icons.NOTE : Icons.NOTE_OUTLINE} 
                        size={16} 
                        color={hasNotes ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                        accessibilityLabel="Add notes"
                      />
                    </HapticTouchableOpacity>
                  )}
                  {onGetSwapSuggestions && (
                    <HapticTouchableOpacity
                      onPress={() => onGetSwapSuggestions(meal.mealPlanMealId, meal)}
                      className="mr-2"
                    >
                      <Icon 
                        name={Icons.SWAP_HORIZONTAL} 
                        size={16} 
                        color={isSwapExpanded ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                        accessibilityLabel="Swap meal"
                      />
                    </HapticTouchableOpacity>
                  )}
                </>
              )}
              <Text className="text-xs font-medium mr-1" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                View Recipe
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">
                • Long press to remove • Drag to move
              </Text>
            </View>
          </View>

          {/* Notes Preview */}
          {hasNotes && notesText && !isSwapExpanded && (
            <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center space-x-2">
                  <Icon 
                    name={Icons.NOTE} 
                    size={14} 
                    color={isDark ? DarkColors.primary : Colors.primary} 
                    accessibilityLabel="Notes"
                  />
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Notes
                  </Text>
                </View>
                {onOpenNotes && meal.mealPlanMealId && (
                  <HapticTouchableOpacity
                    onPress={() => onOpenNotes(meal.mealPlanMealId)}
                  >
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Edit
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>
              <Text 
                className="text-xs text-gray-600 dark:text-gray-300 leading-4" 
                numberOfLines={3}
              >
                {notesText}
              </Text>
            </View>
          )}

          {/* Inline Swap Suggestions */}
          {isSwapExpanded && meal.mealPlanMealId && (
            <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Swap Suggestions
                </Text>
                {isLoadingSwap && (
                  <PulsingLoader size={12} color={isDark ? DarkColors.primary : Colors.primary} />
                )}
              </View>
              {isLoadingSwap ? (
                <Text className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  Loading suggestions...
                </Text>
              ) : swapSuggestions.length > 0 ? (
                <View className="space-y-2">
                  {swapSuggestions.slice(0, 3).map((suggestion: any, index: number) => (
                    <HapticTouchableOpacity
                      key={index}
                      onPress={() => {
                        if (onSwapMeal) {
                          onSwapMeal(meal.mealPlanMealId, suggestion, meal);
                        }
                      }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border"
                      style={{
                        borderColor: isDark ? DarkColors.primaryDark : Colors.primaryDark,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 mr-2">
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
                            {suggestion.recipe?.title || suggestion.recipe?.name}
                          </Text>
                          {suggestion.reason && (
                            <Text className="text-xs text-gray-600 dark:text-gray-300 mt-0.5" numberOfLines={1}>
                              {suggestion.reason}
                            </Text>
                          )}
                          <View className="flex-row items-center space-x-3 mt-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {suggestion.recipe?.calories || 0} cal
                            </Text>
                            {suggestion.recipe?.cookTime && (
                              <Text className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.recipe.cookTime < 60 
                                  ? `${suggestion.recipe.cookTime} min`
                                  : `${Math.floor(suggestion.recipe.cookTime / 60)}h ${suggestion.recipe.cookTime % 60 > 0 ? `${suggestion.recipe.cookTime % 60}min` : ''}`.trim()}
                              </Text>
                            )}
                          </View>
                        </View>
                        <HapticTouchableOpacity
                          onPress={() => {
                            if (onSwapMeal) {
                              onSwapMeal(meal.mealPlanMealId, suggestion, meal);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                          }}
                        >
                          <Text className="text-xs font-semibold text-white">Swap</Text>
                        </HapticTouchableOpacity>
                      </View>
                    </HapticTouchableOpacity>
                  ))}
                  {swapSuggestions.length > 3 && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                      +{swapSuggestions.length - 3} more suggestions
                    </Text>
                  )}
                </View>
              ) : (
                <Text className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  No swap suggestions available
                </Text>
              )}
            </View>
          )}
        </HapticTouchableOpacity>
      </Reanimated.View>
    </GestureDetector>
  );
};

// Animated Hour Header Component
interface AnimatedHourHeaderProps {
  hourData: any;
  hourlyMeals: { [key: number]: any[] };
  isDark: boolean;
  isDragOver: boolean;
  onAddMeal: (hour: number) => void;
}

const AnimatedHourHeader = ({
  hourData,
  hourlyMeals,
  isDark,
  isDragOver,
  onAddMeal,
}: AnimatedHourHeaderProps) => {
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(0);
  const backgroundColor = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isDragOver) {
      scale.value = withSpring(1.03);
      borderWidth.value = withSpring(3);
      backgroundColor.value = withSpring(1);
      opacity.value = withSpring(1);
      // Continuous pulsing animation
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 600 }),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1);
      borderWidth.value = withSpring(0);
      backgroundColor.value = withSpring(0);
      opacity.value = withSpring(1);
      pulseScale.value = withSpring(1);
    }
  }, [isDragOver, scale, borderWidth, backgroundColor, pulseScale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = backgroundColor.value === 1
      ? (isDark ? `${Colors.primaryLight}40` : `${Colors.primaryLight}80`)
      : undefined;
    
    return {
      transform: [{ scale: scale.value * pulseScale.value }],
      borderWidth: borderWidth.value,
      borderColor: borderWidth.value > 0
        ? (isDark ? DarkColors.primary : Colors.primary)
        : 'transparent',
      borderStyle: borderWidth.value > 0 ? 'dashed' : 'solid',
      backgroundColor: bgColor,
      opacity: opacity.value,
      shadowColor: borderWidth.value > 0 ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: borderWidth.value > 0 ? 0.3 : 0,
      shadowRadius: 8,
      elevation: borderWidth.value > 0 ? 8 : 0,
    };
  });

  const dropZoneStyle = useAnimatedStyle(() => {
    if (isDragOver && (!hourlyMeals[hourData.hour] || hourlyMeals[hourData.hour].length === 0)) {
      return {
        opacity: withSpring(1),
        transform: [{ scale: withSpring(1) }],
      };
    }
    return {
      opacity: withSpring(0),
      transform: [{ scale: withSpring(0.8) }],
    };
  });

  return (
    <Reanimated.View 
      className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative"
      style={animatedStyle}
    >
      {/* Drop Zone Indicator */}
      {isDragOver && (
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 8,
              backgroundColor: isDark ? `${Colors.primary}20` : `${Colors.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            },
            dropZoneStyle,
          ]}
          pointerEvents="none"
        >
          <View className="flex-row items-center">
            <Icon 
              name={Icons.ADD_CIRCLE_OUTLINE} 
              size={IconSizes.LG} 
              color={isDark ? DarkColors.primary : Colors.primary} 
              accessibilityLabel="Drop zone" 
            />
            <Text 
              className="ml-2 font-semibold"
              style={{ color: isDark ? DarkColors.primary : Colors.primary }}
            >
              Drop here
            </Text>
          </View>
        </Reanimated.View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-16" style={{ flexShrink: 0 }}>
            <Text 
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {hourData.displayTime}
            </Text>
          </View>
                      
          <View className="flex-1 ml-3">
            {hourlyMeals[hourData.hour] && hourlyMeals[hourData.hour].length > 0 ? (
              <Text className="text-sm text-gray-600 dark:text-gray-100">
                {hourlyMeals[hourData.hour].length} meal{hourlyMeals[hourData.hour].length > 1 ? 's' : ''} planned
              </Text>
            ) : (
              <Text className="text-sm text-gray-400 dark:text-gray-200">No meals planned</Text>
            )}
          </View>
        </View>

        <HapticTouchableOpacity 
          onPress={() => onAddMeal(hourData.hour)}
          className="p-2 ml-2"
        >
          <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Add meal to this hour" />
        </HapticTouchableOpacity>
      </View>
    </Reanimated.View>
  );
};

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

// Separate component for Cost Analysis to avoid inline complexity
function CostAnalysisSection({
  costAnalysis,
  loadingCostAnalysis,
  shoppingListSavings,
  maxWeeklyBudget,
  isDark,
  onOptimize,
}: {
  costAnalysis: any;
  loadingCostAnalysis: boolean;
  shoppingListSavings: any;
  maxWeeklyBudget: number | null;
  isDark: boolean;
  onOptimize: () => void;
}) {
  // No cost analysis data - show empty or loading state
  if (!costAnalysis || typeof costAnalysis !== 'object' || Array.isArray(costAnalysis)) {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: isDark ? DarkColors.primary : Colors.primary }}>
        {loadingCostAnalysis ? (
          <View style={{ gap: 12 }}>
            <SkeletonLoader width="60%" height={16} borderRadius={4} isDark={isDark} />
            <SkeletonLoader width="100%" height={12} borderRadius={4} isDark={isDark} />
            <SkeletonLoader width="80%" height={12} borderRadius={4} isDark={isDark} />
          </View>
        ) : (
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {"Add recipes to your meal plan to see cost analysis"}
          </Text>
        )}
      </View>
    );
  }

  // Has cost analysis data - show full analysis
  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: isDark ? DarkColors.primary : Colors.primary }}>
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Total Weekly Cost"}</Text>
          <Text className="text-2xl font-bold" style={{ color: costAnalysis.budgetExceeded ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen) }}>
            {`$${costAnalysis.totalCost ? costAnalysis.totalCost.toFixed(2) : '0.00'}`}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Per Day"}</Text>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {`$${costAnalysis.costPerDay ? costAnalysis.costPerDay.toFixed(2) : '0.00'}`}
          </Text>
        </View>
      </View>

      {costAnalysis.budgetExceeded ? (
        <View className="rounded-lg p-3 mb-3 border" style={{ backgroundColor: isDark ? '#EF444433' : Colors.secondaryRedLight, borderColor: isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark }}>
          <View className="flex-row items-center mb-1">
            <Icon name={Icons.WARNING_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Budget exceeded warning" />
            <Text className="font-semibold ml-2" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
              {`Over Budget by $${costAnalysis.budgetExceeded.toFixed(2)}`}
            </Text>
          </View>
          <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
            {"Consider cheaper recipe alternatives to stay within budget."}
          </Text>
        </View>
      ) : null}

      {costAnalysis.budgetRemaining && costAnalysis.budgetRemaining > 0 ? (
        <View className="rounded-lg p-3 mb-3 border" style={{ backgroundColor: isDark ? '#10B98133' : Colors.tertiaryGreenLight, borderColor: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
          <View className="flex-row items-center">
            <Icon name={Icons.CHECKMARK_CIRCLE_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Budget remaining" />
            <Text className="font-semibold ml-2" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
              {`$${costAnalysis.budgetRemaining.toFixed(2)} remaining in budget`}
            </Text>
          </View>
        </View>
      ) : null}

      {costAnalysis.recommendations && Array.isArray(costAnalysis.recommendations) && costAnalysis.recommendations.length > 0 ? (
        <View className="mt-2">
          {costAnalysis.recommendations.map((rec: string, idx: number) => (
            <Text key={idx} className="text-sm text-gray-600 dark:text-gray-100 mb-1">
              {`• ${rec}`}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Cost by Meal Type */}
      {costAnalysis.costByMealType ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {"Cost by Meal Type"}
          </Text>
          {[
            { key: 'breakfast', label: 'Breakfast', color: isDark ? DarkColors.primary : Colors.primary },
            { key: 'lunch', label: 'Lunch', color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed },
            { key: 'dinner', label: 'Dinner', color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen },
            { key: 'snacks', label: 'Snacks', color: isDark ? DarkColors.accent : Colors.accent },
          ].map((mealType) => {
            const cost = costAnalysis.costByMealType[mealType.key] || 0;
            const percentage = costAnalysis.totalCost > 0 ? (cost / costAnalysis.totalCost) * 100 : 0;
            const allCosts = Object.values(costAnalysis.costByMealType || {}) as number[];
            const maxCost = allCosts.length > 0 ? Math.max(...allCosts) : 0;
            const barWidth = maxCost > 0 ? (cost / maxCost) * 100 : 0;
            
            return (
              <View key={mealType.key} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm text-gray-700 dark:text-gray-300">{mealType.label}</Text>
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {`$${cost.toFixed(2)} (${percentage.toFixed(0)}%)`}
                  </Text>
                </View>
                <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: mealType.color,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Budget Progress */}
      {maxWeeklyBudget ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {"Weekly Budget"}
            </Text>
            <Text className="text-sm font-semibold" style={{ 
              color: costAnalysis.budgetExceeded 
                ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
            }}>
              {`$${costAnalysis.totalCost ? costAnalysis.totalCost.toFixed(2) : '0.00'} / $${maxWeeklyBudget.toFixed(2)}`}
            </Text>
          </View>
          <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min((costAnalysis.totalCost / maxWeeklyBudget) * 100, 100)}%`,
                backgroundColor: costAnalysis.budgetExceeded
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen),
              }}
            />
          </View>
        </View>
      ) : null}

      <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Cost per meal"}</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {`$${costAnalysis.costPerMeal ? costAnalysis.costPerMeal.toFixed(2) : '0.00'}`}
          </Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Meals planned"}</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {`${costAnalysis.mealsCount || 0} meals`}
          </Text>
        </View>
      </View>

      {/* Per-Meal Costs */}
      {costAnalysis.mealCosts && costAnalysis.mealCosts.length > 0 ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {"Per-Meal Costs"}
          </Text>
          <View style={{ gap: 8 }}>
            {costAnalysis.mealCosts
              .sort((a: any, b: any) => b.cost - a.cost)
              .slice(0, 10)
              .map((meal: any, index: number) => {
                const mealTypeColors: Record<string, string> = {
                  breakfast: isDark ? DarkColors.primary : Colors.primary,
                  lunch: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                  dinner: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                  snacks: isDark ? DarkColors.accent : Colors.accent,
                };
                const mealTypeColor = mealTypeColors[meal.mealType] || '#9CA3AF';
                const allMealCosts = costAnalysis.mealCosts.map((m: any) => m.cost);
                const maxCost = allMealCosts.length > 0 ? Math.max(...allMealCosts) : 0;
                const barWidth = maxCost > 0 ? (meal.cost / maxCost) * 100 : 0;
                
                return (
                  <View key={index} className="flex-row items-center">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs text-gray-700 dark:text-gray-300 flex-1" numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-2">
                          {`$${meal.cost.toFixed(2)}`}
                        </Text>
                      </View>
                      <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: mealTypeColor,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            {costAnalysis.mealCosts.length > 10 ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {"Showing top 10 most expensive meals"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Savings Suggestions */}
      {shoppingListSavings && shoppingListSavings.savings > 0 ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Icon name={Icons.STORE_OUTLINE} size={IconSizes.XS} color="#10B981" accessibilityLabel="Best store" />
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">{"Best Store"}</Text>
            </View>
            <View className="px-2 py-1 rounded" style={{ backgroundColor: isDark ? '#10B98133' : Colors.tertiaryGreenLight }}>
              <Text className="font-semibold text-xs" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
                {`Save $${shoppingListSavings.savings.toFixed(2)}`}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-700 dark:text-gray-100">
            {`Shop at ${shoppingListSavings.store || 'this store'}${shoppingListSavings.location ? ` (${shoppingListSavings.location})` : ''} to save ${shoppingListSavings.savingsPercent ? shoppingListSavings.savingsPercent.toFixed(0) : '0'}%`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

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
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Drag and drop state
  const [draggingMeal, setDraggingMeal] = useState<{ hour: number; mealIndex: number; meal: any } | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  
  // AI Generation state
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showMealSnackSelector, setShowMealSnackSelector] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState(3);
  const [selectedSnacks, setSelectedSnacks] = useState(1);
  const [maxTotalPrepTime, setMaxTotalPrepTime] = useState(60); // Default: 60 minutes (1 hour)
  const [maxWeeklyBudget, setMaxWeeklyBudget] = useState<number | null>(null); // Weekly budget in dollars
  const [generationType, setGenerationType] = useState<'fullDay' | 'weekly' | null>(null);
  const [showDayMealsModal, setShowDayMealsModal] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  
  // Shopping list generation state
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  
  // Quick action badge state
  const [showShoppingListSuccessModal, setShowShoppingListSuccessModal] = useState(false);
  const [shoppingListSuccessMessage, setShoppingListSuccessMessage] = useState({ title: '', message: '' });
  const [showShoppingListNameModal, setShowShoppingListNameModal] = useState(false);
  const [shoppingListName, setShoppingListName] = useState('');
  
  // Cost analysis state
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loadingCostAnalysis, setLoadingCostAnalysis] = useState(false);
  const [shoppingListSavings, setShoppingListSavings] = useState<any>(null);
  const [loadingSavings, setLoadingSavings] = useState(false);
  
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
  
  // Meal enhancement state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealName, setEditingMealName] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapSuggestions, setSwapSuggestions] = useState<any[]>([]);
  const [selectedMealForSwap, setSelectedMealForSwap] = useState<any | null>(null);
  const [expandedSwapMealId, setExpandedSwapMealId] = useState<string | null>(null);
  const [loadingSwapSuggestions, setLoadingSwapSuggestions] = useState<string | null>(null);
  const [mealSwapSuggestions, setMealSwapSuggestions] = useState<Record<string, any[]>>({});
  const [weeklyNutrition, setWeeklyNutrition] = useState<any | null>(null);
  const [loadingWeeklyNutrition, setLoadingWeeklyNutrition] = useState(false);
  
  // Target macros (from user profile)
  const [targetMacros, setTargetMacros] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67
  });

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



  // Load cost analysis for current meal plan
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
      // Since we don't have a saved meal plan, we'll calculate from recipe IDs
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
          // Create a simple cost analysis object
          const daysCount = 7; // Assume weekly
          const mealsCount = recipeIds.length;
          
          // Calculate per-meal costs and breakdown by meal type
          const mealCosts: Array<{ name: string; cost: number; mealType: string; hour: number }> = [];
          const costByMealType: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
          
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
            mealCosts, // Per-meal costs
            costByMealType, // Cost breakdown by meal type
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

  // Celebration toast state
  const [showCelebrationToast, setShowCelebrationToast] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Handle meal completion toggle
  const handleToggleMealCompletion = async (mealId: string, isCompleted: boolean) => {
    try {
      await mealPlanApi.updateMealCompletion(mealId, isCompleted);
      setMealCompletionStatus(prev => ({
        ...prev,
        [mealId]: isCompleted
      }));
      
      if (isCompleted) {
        // Find the meal name for celebration message
        // Check hourlyMeals first (24-hour view)
        let meal = Object.values(hourlyMeals)
          .flat()
          .find(m => m.mealPlanMealId === mealId);
        
        // If not found, check weeklyPlan (compact/collapsible views)
        if (!meal && weeklyPlan?.weeklyPlan) {
          const allMeals: any[] = [];
          Object.values(weeklyPlan.weeklyPlan).forEach((day: any) => {
            if (day?.meals) {
              if (day.meals.breakfast?.recipe) allMeals.push(day.meals.breakfast.recipe);
              if (day.meals.lunch?.recipe) allMeals.push(day.meals.lunch.recipe);
              if (day.meals.dinner?.recipe) allMeals.push(day.meals.dinner.recipe);
              if (day.meals.snacks) {
                day.meals.snacks.forEach((snack: any) => {
                  if (snack?.recipe) allMeals.push(snack.recipe);
                });
              }
            }
          });
          meal = allMeals.find(m => m.mealPlanMealId === mealId);
        }
        
        const mealName = meal?.name || meal?.title || 'Meal';
        
        // Show celebration
        setCelebrationMessage(`🎉 ${mealName} completed!`);
        setShowCelebrationToast(true);
        
        // Auto-hide toast after 2 seconds
        setTimeout(() => {
          setShowCelebrationToast(false);
        }, 2000);
      }
      
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating meal completion:', error);
      Alert.alert('Error', 'Failed to update meal completion status');
    }
  };

  // Handle meal notes
  const handleOpenNotes = (mealId: string) => {
    // Find the meal to get its name
    let mealName = '';
    Object.values(hourlyMeals).forEach((meals) => {
      const meal = meals.find(m => m.mealPlanMealId === mealId);
      if (meal) {
        mealName = meal.name || meal.title || 'Meal';
      }
    });
    
    setEditingMealId(mealId);
    setEditingMealName(mealName);
    setEditingNotes(mealNotes[mealId] || '');
    setShowNotesModal(true);
  };
  
  // Quick formatting helpers
  const insertBulletPoint = () => {
    const cursorPos = editingNotes.length;
    setEditingNotes(prev => prev + '\n• ');
  };
  
  const insertTemplate = (template: string) => {
    setEditingNotes(prev => prev + (prev ? '\n\n' : '') + template);
  };
  
  const quickTemplates = [
    { label: 'Taste Notes', text: 'Taste: \n• \n• ' },
    { label: 'Modifications', text: 'Modifications:\n• \n• ' },
    { label: 'Prep Tips', text: 'Prep Tips:\n• \n• ' },
    { label: 'Rating', text: 'Rating: ⭐⭐⭐⭐⭐\n\nNotes: ' },
  ];

  const handleSaveNotes = async () => {
    if (!editingMealId) return;

    try {
      await mealPlanApi.updateMealNotes(editingMealId, editingNotes);
      setMealNotes(prev => ({
        ...prev,
        [editingMealId]: editingNotes
      }));
      setShowNotesModal(false);
      setEditingMealId(null);
      setEditingMealName('');
      setEditingNotes('');
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error saving meal notes:', error);
      Alert.alert('Error', 'Failed to save meal notes');
    }
  };
  
  const handleCloseNotesModal = () => {
    setShowNotesModal(false);
    setEditingMealId(null);
    setEditingMealName('');
    setEditingNotes('');
  };

  // Handle meal swap suggestions - inline version
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

  // Handle one-tap meal swap
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
          const mealType = foundMeal.mealType || (foundHour === 7 ? 'breakfast' : foundHour === 12 ? 'lunch' : foundHour === 18 ? 'dinner' : 'snack');
          
          // Remove old meal and add new recipe
          // Note: We'll need to implement this properly when backend supports it
          // For now, we'll update local state and the backend will sync on next load
        } catch (error) {
          console.error('Error updating meal in backend:', error);
          // Continue anyway - local state is updated
        }
      }
      
      // Collapse swap suggestions
      setExpandedSwapMealId(null);
      
      // Clear swap suggestions for this meal
      setMealSwapSuggestions(prev => {
        const updated = { ...prev };
        delete updated[mealId];
        return updated;
      });
      
      // Show success feedback
      HapticPatterns.success();
      setCelebrationMessage(`✅ Swapped to ${newRecipe.recipe?.title || newRecipe.recipe?.name || 'new meal'}`);
      setShowCelebrationToast(true);
      setTimeout(() => {
        setShowCelebrationToast(false);
      }, 2000);
      
      // Reload cost analysis
      loadCostAnalysis();
      
    } catch (error: any) {
      console.error('Error swapping meal:', error);
      Alert.alert('Error', 'Failed to swap meal');
    }
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
      <Modal
        visible={showMealSnackSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowMealSnackSelector(false);
          setGenerationType(null);
        }}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Select Meals & Snacks
            </Text>
            <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? `${Colors.primaryLight}20` : Colors.primaryLight }}>
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                💡 Recommended for {targetMacros.calories} calories/day:
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {calculateRecommendedMealsAndSnacks(targetMacros.calories).meals} meals, {calculateRecommendedMealsAndSnacks(targetMacros.calories).snacks} snacks
              </Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Choose how many meals and snacks to create for {generationType === 'fullDay' ? 'today' : 'each day this week'}. You can adjust these values.
            </Text>

            {/* Meals Selector */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
                Number of Meals
              </Text>
              <View className="flex-row justify-between">
                {[0, 1, 2, 3, 4].map((count) => (
                  <HapticTouchableOpacity
                    key={count}
                    onPress={() => setSelectedMeals(count)}
                    className={`flex-1 mx-1 py-4 rounded-lg border-2 ${
                      selectedMeals === count
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                    style={
                      selectedMeals === count
                        ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center text-lg font-semibold ${
                        selectedMeals === count
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      style={
                        selectedMeals === count
                          ? { color: isDark ? DarkColors.primary : Colors.primary }
                          : undefined
                      }
                    >
                      {count}
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </View>
            </View>

            {/* Snacks Selector */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
                Number of Snacks/Dessert
              </Text>
              <View className="flex-row justify-between">
                {[0, 1, 2, 3, 4].map((count) => (
                  <HapticTouchableOpacity
                    key={count}
                    onPress={() => setSelectedSnacks(count)}
                    className={`flex-1 mx-1 py-4 rounded-lg border-2 ${
                      selectedSnacks === count
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                    style={
                      selectedSnacks === count
                        ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center text-lg font-semibold ${
                        selectedSnacks === count
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      style={
                        selectedSnacks === count
                          ? { color: isDark ? DarkColors.primary : Colors.primary }
                          : undefined
                      }
                    >
                      {count}
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </View>
            </View>

            {/* Total Prep Time Selector */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
                Max Total Prep Time
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Keep total meal prep time under this limit for {generationType === 'fullDay' ? 'today' : 'each day'}
              </Text>
              <View className="flex-row justify-between flex-wrap">
                {[30, 45, 60, 90, 120].map((minutes) => (
                  <HapticTouchableOpacity
                    key={minutes}
                    onPress={() => setMaxTotalPrepTime(minutes)}
                    className={`flex-1 mx-1 py-3 rounded-lg border-2 mb-2 ${
                      maxTotalPrepTime === minutes
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                    style={
                      maxTotalPrepTime === minutes
                        ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        maxTotalPrepTime === minutes
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      style={
                        maxTotalPrepTime === minutes
                          ? { color: isDark ? DarkColors.primary : Colors.primary }
                          : undefined
                      }
                    >
                      {minutes} min
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </View>
            </View>

            {/* Weekly Budget Selector */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
                Max Weekly Budget
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Keep total meal plan cost under this amount for {generationType === 'fullDay' ? 'today' : 'the week'}
              </Text>
              <View className="flex-row justify-between flex-wrap">
                {[50, 75, 100, 150, 200, 250].map((amount) => (
                  <HapticTouchableOpacity
                    key={amount}
                    onPress={() => setMaxWeeklyBudget(amount)}
                    className={`flex-1 mx-1 py-3 rounded-lg border-2 mb-2 ${
                      maxWeeklyBudget === amount
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                    style={
                      maxWeeklyBudget === amount
                        ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        maxWeeklyBudget === amount
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      style={
                        maxWeeklyBudget === amount
                          ? { color: isDark ? DarkColors.primary : Colors.primary }
                          : undefined
                      }
                    >
                      ${amount}
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </View>
              <HapticTouchableOpacity
                onPress={() => setMaxWeeklyBudget(null)}
                className="mt-2 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                <Text className="text-center text-sm text-gray-600 dark:text-gray-400">
                  No Budget Limit
                </Text>
              </HapticTouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => {
                  setShowMealSnackSelector(false);
                  setGenerationType(null);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              
              <HapticTouchableOpacity
                onPress={handleConfirmMealSnackSelection}
                className="flex-1 py-3 px-4 rounded-lg"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-medium text-center">Create</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
      <Modal
        visible={showNotesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseNotesModal}
      >
        <View className="flex-1 bg-black bg-opacity-50">
          <View className="flex-1 justify-end">
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[85%]">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Meal Notes
                  </Text>
                  {editingMealName && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {editingMealName}
                    </Text>
                  )}
                </View>
                <HapticTouchableOpacity 
                  onPress={handleCloseNotesModal}
                  className="p-2"
                >
                  <Icon 
                    name={Icons.CLOSE} 
                    size={IconSizes.LG} 
                    color={isDark ? DarkColors.text.primary : Colors.text.primary} 
                    accessibilityLabel="Close"
                  />
                </HapticTouchableOpacity>
              </View>
              
              {/* Quick Templates */}
              <View className="px-6 pt-4 pb-2">
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Quick Templates
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" nestedScrollEnabled={true}>
                  <View className="flex-row space-x-2">
                    {quickTemplates.map((template, index) => (
                      <HapticTouchableOpacity
                        key={index}
                        onPress={() => {
                          HapticPatterns.buttonPress();
                          insertTemplate(template.text);
                        }}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }}
                      >
                        <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                          {template.label}
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              
              {/* Text Input */}
              <View className="px-6 pb-4">
                <TextInput
                  value={editingNotes}
                  onChangeText={setEditingNotes}
                  placeholder="Add notes about this meal... (e.g., taste, modifications, prep tips)"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  multiline
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-900 dark:text-gray-100"
                  style={{ 
                    minHeight: 200,
                    maxHeight: 300,
                    textAlignVertical: 'top',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    fontSize: FontSize.base,
                    lineHeight: 22,
                    color: isDark ? DarkColors.text.primary : Colors.text.primary
                  }}
                />
                
                {/* Character Count & Formatting Tools */}
                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row items-center space-x-3">
                    <HapticTouchableOpacity
                      onPress={() => {
                        HapticPatterns.buttonPress();
                        insertBulletPoint();
                      }}
                      className="px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                        • Bullet
                      </Text>
                    </HapticTouchableOpacity>
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {editingNotes.length} characters
                  </Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                <View className="flex-row space-x-3">
                  <HapticTouchableOpacity 
                    onPress={handleCloseNotesModal}
                    className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                  </HapticTouchableOpacity>
                  
                  <HapticTouchableOpacity 
                    onPress={handleSaveNotes}
                    className="flex-1 py-3 px-4 rounded-lg"
                    style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                  >
                    <Text className="text-white font-medium text-center">Save Notes</Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
      {showDayMealsModal && selectedDayForModal && (
        <Modal
          visible={showDayMealsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowDayMealsModal(false);
            setSelectedDayForModal(null);
          }}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden w-full" style={{ maxHeight: '80%', maxWidth: '100%' }}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {"📅 Day's Meals at a Glance"}
                    </Text>
                    <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedDayForModal instanceof Date 
                        ? selectedDayForModal.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                        : 'Selected Day'}
                    </Text>
                    {selectedDayForModal instanceof Date && isToday(selectedDayForModal) && (
                      <View className="mt-1">
                        <View className="px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: isDark ? '#EF444433' : Colors.secondaryRedLight }}>
                          <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                            {"Today"}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <HapticTouchableOpacity 
                    onPress={() => {
                      setShowDayMealsModal(false);
                      setSelectedDayForModal(null);
                    }}
                    className="p-2 -mr-2"
                  >
                    <Icon 
                      name={Icons.CLOSE} 
                      size={IconSizes.LG} 
                      color={isDark ? DarkColors.text.primary : Colors.text.primary} 
                      accessibilityLabel="Close"
                    />
                  </HapticTouchableOpacity>
                </View>
                
                {/* Meals Content - Uses same approach as getMealsForDate */}
                <ScrollView
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {(() => {
                    if (!selectedDayForModal || !(selectedDayForModal instanceof Date)) {
                      return (
                        <View className="py-8 items-center">
                          <Text className="text-gray-500 dark:text-gray-400 text-center">
                            {"Invalid date selected"}
                          </Text>
                        </View>
                      );
                    }
                    
                    // Use the same approach as getMealsForDate
                    const dateStr = selectedDayForModal.toISOString().split('T')[0];
                    const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
                    const allMeals: Array<any> = [];
                    
                    // Extract meals - match the calendar's counting logic (check if meal exists, then get recipe)
                    if (dayMeals.breakfast) {
                      // Try nested recipe first, then direct structure
                      const recipe = dayMeals.breakfast.recipe || dayMeals.breakfast;
                      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
                        allMeals.push({
                          id: recipe.id,
                          mealType: 'Breakfast',
                          name: recipe.title || recipe.name || 'Breakfast',
                          calories: recipe.calories,
                          cookTime: recipe.cookTime,
                          isCompleted: dayMeals.breakfast.isCompleted || false,
                        });
                      }
                    }
                    
                    if (dayMeals.lunch) {
                      const recipe = dayMeals.lunch.recipe || dayMeals.lunch;
                      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
                        allMeals.push({
                          id: recipe.id,
                          mealType: 'Lunch',
                          name: recipe.title || recipe.name || 'Lunch',
                          calories: recipe.calories,
                          cookTime: recipe.cookTime,
                          isCompleted: dayMeals.lunch.isCompleted || false,
                        });
                      }
                    }
                    
                    if (dayMeals.dinner) {
                      const recipe = dayMeals.dinner.recipe || dayMeals.dinner;
                      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
                        allMeals.push({
                          id: recipe.id,
                          mealType: 'Dinner',
                          name: recipe.title || recipe.name || 'Dinner',
                          calories: recipe.calories,
                          cookTime: recipe.cookTime,
                          isCompleted: dayMeals.dinner.isCompleted || false,
                        });
                      }
                    }
                    
                    if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
                      dayMeals.snacks.forEach((snack: any) => {
                        const recipe = snack?.recipe || snack;
                        if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
                          allMeals.push({
                            id: recipe.id,
                            mealType: 'Snack',
                            name: recipe.title || recipe.name || 'Snack',
                            calories: recipe.calories,
                            cookTime: recipe.cookTime,
                            isCompleted: snack.isCompleted || false,
                          });
                        }
                      });
                    }

                    if (allMeals.length === 0) {
                      return (
                        <View className="py-8 items-center px-4">
                          <Text className="text-gray-500 dark:text-gray-400 text-center mb-2">
                            {"No meals planned for this day"}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            {`Date: ${dateStr}`}
                          </Text>
                          {weeklyPlan && (
                            <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                              {`Weekly plan has ${Object.keys(weeklyPlan.weeklyPlan || {}).length} days`}
                            </Text>
                          )}
                        </View>
                      );
                    }

                    return (
                      <View>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {`${allMeals.length} meal${allMeals.length !== 1 ? 's' : ''} planned`}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {allMeals.map((meal, index) => {
                            const mealColors: Record<string, { bg: string; text: string }> = {
                              'Breakfast': { bg: isDark ? '#FF914D33' : Colors.primaryLight, text: isDark ? DarkColors.primary : Colors.primary },
                              'Lunch': { bg: isDark ? '#10B98133' : Colors.tertiaryGreenLight, text: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen },
                              'Dinner': { bg: isDark ? '#EF444433' : Colors.secondaryRedLight, text: isDark ? DarkColors.secondaryRed : Colors.secondaryRed },
                              'Snack': { bg: isDark ? '#374151' : '#F3F4F6', text: isDark ? '#9CA3AF' : '#4B5563' },
                            };
                            const colors = mealColors[meal.mealType] || mealColors['Snack'];
                            const isEven = index % 2 === 0;
                            
                            return (
                              <HapticTouchableOpacity
                                key={`modal-meal-${meal.id || index}`}
                                onPress={() => {
                                  if (meal.id) {
                                    HapticPatterns.buttonPress();
                                    router.push(`/modal?id=${meal.id}&source=meal-plan`);
                                    setShowDayMealsModal(false);
                                    setSelectedDayForModal(null);
                                  }
                                }}
                                activeOpacity={0.7}
                                style={{ 
                                  width: '47%',
                                  padding: 14,
                                  borderRadius: 12,
                                  backgroundColor: colors.bg,
                                  marginRight: isEven ? '6%' : 0,
                                  marginBottom: 12,
                                }}
                              >
                                <Text className="text-xs font-semibold mb-1" style={{ color: colors.text }}>
                                  {meal.mealType}
                                </Text>
                                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2" numberOfLines={2}>
                                  {meal.name}
                                </Text>
                                <View className="flex-row items-center">
                                  {meal.calories && (
                                    <Text className="text-xs text-gray-600 dark:text-gray-400 mr-2">
                                      {`${meal.calories} cal`}
                                    </Text>
                                  )}
                                  {meal.cookTime && (
                                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                                      {meal.cookTime < 60 ? `${meal.cookTime}m` : `${Math.floor(meal.cookTime / 60)}h ${meal.cookTime % 60}m`}
                                    </Text>
                                  )}
                                </View>
                                {meal.isCompleted && (
                                  <View style={{ position: 'absolute', top: 8, right: 8 }}>
                                    <Icon name={Icons.CHECKMARK_CIRCLE} size={16} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} />
                                  </View>
                                )}
                                {meal.id && (
                                  <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
                                    <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.XS} color={colors.text} accessibilityLabel="View recipe" />
                                  </View>
                                )}
                              </HapticTouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}
                </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
