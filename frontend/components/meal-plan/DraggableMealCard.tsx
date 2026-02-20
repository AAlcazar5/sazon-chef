// frontend/components/meal-plan/DraggableMealCard.tsx
// Draggable meal card with swipe actions and completion tracking

import React, { useEffect } from 'react';
import { View, Text, Image, Switch } from 'react-native';
import { optimizedImageUrl } from '../../utils/imageUtils';
import { useColorScheme } from 'nativewind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface DraggableMealCardProps {
  meal: any;
  hour: number;
  mealIndex: number;
  isDark: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSnack?: boolean;
  onDragStart: () => void;
  onDragEnd: (targetHour: number) => void;
  onDragOver: (targetHour: number) => void;
  onPress: () => void;
  onLongPress: () => void;
  isCompleted?: boolean;
  hasNotes?: boolean;
  notesText?: string;
  onToggleComplete?: (mealId: string, isCompleted: boolean) => void;
  onOpenNotes?: (mealId: string) => void;
  onGetSwapSuggestions?: (mealId: string, meal: any) => void;
  swapSuggestions?: any[];
  isSwapExpanded?: boolean;
  isLoadingSwap?: boolean;
  onSwapMeal?: (mealId: string, newRecipe: any, currentMeal: any) => void;
  onSetRecurring?: (meal: any) => void;
}

/**
 * Draggable meal card component with swipe actions
 * Supports drag-and-drop, swipe to complete/delete, and inline swap suggestions
 */
function DraggableMealCard({
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
  swapSuggestions = [],
  isSwapExpanded,
  isLoadingSwap,
  onSwapMeal,
  onSetRecurring,
}: DraggableMealCardProps) {
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
      const swipeThreshold = 50;

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
      const swipeThreshold = 80;

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
      shadowColor: isDragging ? '#000000' : 'transparent',
      shadowOffset: { width: 0, height: isDragging ? 8 : 0 },
      shadowOpacity: isDragging ? 0.3 : 0,
      shadowRadius: isDragging ? 12 : 0,
      elevation: isDragging ? 16 : 0,
    };
  });

  // Swipe action background styles
  const swipeCompleteStyle = useAnimatedStyle(() => {
    const bgOpacity = swipeAction.value === 'complete' ? swipeProgress.value * 0.3 : 0;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
      opacity: bgOpacity,
      borderRadius: 8,
    };
  });

  const swipeDeleteStyle = useAnimatedStyle(() => {
    const bgOpacity = swipeAction.value === 'delete' ? swipeProgress.value * 0.3 : 0;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
      opacity: bgOpacity,
      borderRadius: 8,
    };
  });

  // Swipe action icon styles
  const swipeCompleteIconStyle = useAnimatedStyle(() => {
    const iconScale = swipeAction.value === 'complete' ? swipeProgress.value : 0;
    const translateIconX = swipeAction.value === 'complete' ? (1 - swipeProgress.value) * -50 : 0;
    return {
      position: 'absolute',
      right: 20,
      top: '50%',
      transform: [{ translateY: -12 }, { translateX: translateIconX }, { scale: iconScale }],
      opacity: swipeProgress.value,
    };
  });

  const swipeDeleteIconStyle = useAnimatedStyle(() => {
    const iconScale = swipeAction.value === 'delete' ? swipeProgress.value : 0;
    const translateIconX = swipeAction.value === 'delete' ? (1 - swipeProgress.value) * 50 : 0;
    return {
      position: 'absolute',
      left: 20,
      top: '50%',
      transform: [{ translateY: -12 }, { translateX: translateIconX }, { scale: iconScale }],
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
              ? isDark
                ? `${Colors.secondaryRedLight}33`
                : Colors.secondaryRedLight
              : isDark
              ? `${Colors.primaryLight}33`
              : Colors.primaryLight,
            borderColor: isDragOver
              ? isSnack
                ? isDark
                  ? DarkColors.secondaryRed
                  : Colors.secondaryRed
                : isDark
                ? DarkColors.primary
                : Colors.primary
              : isCompleted
              ? isDark
                ? DarkColors.tertiaryGreen
                : Colors.tertiaryGreen
              : isSnack
              ? isDark
                ? DarkColors.secondaryRedDark
                : Colors.secondaryRedDark
              : isDark
              ? DarkColors.primaryDark
              : Colors.primaryDark,
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
          <Icon name={Icons.CHECKMARK_CIRCLE} size={24} color="#FFFFFF" accessibilityLabel="Complete" />
        </Reanimated.View>
        <Reanimated.View style={swipeDeleteIconStyle} pointerEvents="none">
          <Icon name={Icons.DELETE_OUTLINE} size={24} color="#FFFFFF" accessibilityLabel="Delete" />
        </Reanimated.View>

        <HapticTouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
          {/* Recipe Image */}
          {meal.imageUrl && (
            <View className="mb-3 rounded-lg overflow-hidden" style={{ height: 120 }}>
              <Image
                source={{ uri: optimizedImageUrl(meal.imageUrl) }}
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
                {meal.isFromRecurring && (
                  <Icon
                    name={Icons.SYNC_OUTLINE}
                    size={14}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                    accessibilityLabel="Recurring meal"
                    style={{ marginLeft: 6 }}
                  />
                )}
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
                    <Icon
                      name={Icons.TIME_OUTLINE}
                      size={IconSizes.XS}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      accessibilityLabel="Prep time"
                    />
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
                <Text
                  className="text-lg font-bold"
                  style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                >
                  {meal.carbs}g
                </Text>
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
                    <HapticTouchableOpacity onPress={() => onOpenNotes(meal.mealPlanMealId)} className="mr-2">
                      <Icon
                        name={hasNotes ? Icons.NOTE : Icons.NOTE_OUTLINE}
                        size={16}
                        color={hasNotes ? (isDark ? DarkColors.primary : Colors.primary) : '#9CA3AF'}
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
                        color={isSwapExpanded ? (isDark ? DarkColors.primary : Colors.primary) : '#9CA3AF'}
                        accessibilityLabel="Swap meal"
                      />
                    </HapticTouchableOpacity>
                  )}
                  {onSetRecurring && (
                    <HapticTouchableOpacity
                      onPress={() => onSetRecurring(meal)}
                      className="mr-2"
                    >
                      <Icon
                        name={Icons.REFRESH}
                        size={16}
                        color="#9CA3AF"
                        accessibilityLabel="Set as recurring"
                      />
                    </HapticTouchableOpacity>
                  )}
                </>
              )}
              <Text className="text-xs font-medium mr-1" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                View Recipe
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">• Long press to remove • Drag to move</Text>
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
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notes</Text>
                </View>
                {onOpenNotes && meal.mealPlanMealId && (
                  <HapticTouchableOpacity onPress={() => onOpenNotes(meal.mealPlanMealId)}>
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Edit
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>
              <Text className="text-xs text-gray-600 dark:text-gray-300 leading-4" numberOfLines={3}>
                {notesText}
              </Text>
            </View>
          )}

          {/* Inline Swap Suggestions */}
          {isSwapExpanded && meal.mealPlanMealId && (
            <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">Swap Suggestions</Text>
                {isLoadingSwap && <PulsingLoader size={12} color={isDark ? DarkColors.primary : Colors.primary} />}
              </View>
              {isLoadingSwap ? (
                <Text className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">Loading suggestions...</Text>
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
}


export default React.memo(DraggableMealCard);
