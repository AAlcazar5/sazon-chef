// frontend/components/meal-plan/DraggableMealCard.tsx
// Draggable meal card with swipe actions and completion tracking

import React, { useEffect } from 'react';
import { View, Text, Image, Switch, Alert } from 'react-native';
import { optimizedImageUrl } from '../../utils/imageUtils';
import { useColorScheme } from 'nativewind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Shadows } from '../../constants/Shadows';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../../lib/api';
import { HapticPatterns } from '../../constants/Haptics';
import SurpriseBadge from './SurpriseBadge';

const MEAL_TYPE_PILL: Record<string, { label: string; tint: string; tintDark: string; accent: string }> = {
  breakfast: { label: 'Breakfast', tint: Pastel.golden, tintDark: PastelDark.golden, accent: Accent.golden },
  lunch:     { label: 'Lunch', tint: Pastel.sage, tintDark: PastelDark.sage, accent: Accent.sage },
  dinner:    { label: 'Dinner', tint: Pastel.peach, tintDark: PastelDark.peach, accent: Accent.peach },
  snack:     { label: 'Snack', tint: Pastel.sky, tintDark: PastelDark.sky, accent: Accent.sky },
  dessert:   { label: 'Dessert', tint: Pastel.blush, tintDark: PastelDark.blush, accent: Accent.blush },
};

// Richer pastel rotation — used to give each meal card a distinct surface
// regardless of meal type so the timeline reads as a varied palette.
const PASTEL_ROTATION_LIGHT = [
  '#FFE9A8', // butter
  '#C9E8CC', // sage
  '#FFD9B3', // peach
  '#BCDFFB', // sky
  '#F8C8D8', // blush
  '#E0D4F7', // lavender
  '#FFD3B6', // apricot
  '#C7F0E0', // mint
  '#FCE8C7', // honey
  '#E2C8F2', // orchid
];
const PASTEL_ROTATION_DARK = [
  'rgba(255,213,79,0.20)',
  'rgba(129,199,132,0.20)',
  'rgba(255,183,77,0.20)',
  'rgba(100,181,246,0.20)',
  'rgba(240,98,146,0.20)',
  'rgba(206,147,216,0.20)',
  'rgba(255,160,80,0.20)',
  'rgba(72,201,170,0.20)',
  'rgba(255,200,100,0.20)',
  'rgba(180,140,220,0.20)',
];

function hashToIndex(input: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

interface DraggableMealCardProps {
  meal: any;
  hour: number;
  mealIndex: number;
  /** Total number of meals in this hour slot (for reorder bounds) */
  totalMealsInHour?: number;
  isDark: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSnack?: boolean;
  onDragStart: () => void;
  onDragEnd: (targetHour: number) => void;
  onDragOver: (targetHour: number) => void;
  onPress: () => void;
  onLongPress: () => void;
  /** Reorder within the same hour slot */
  onReorder?: (fromIndex: number, toIndex: number) => void;
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
  cookedRecipeIds?: Set<string>;
}

/**
 * Draggable meal card component with swipe actions
 * Supports drag-and-drop, swipe to complete/delete, and inline swap suggestions
 */
function DraggableMealCard({
  meal,
  hour,
  mealIndex,
  totalMealsInHour = 1,
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
  onReorder,
  onToggleComplete,
  onOpenNotes,
  onGetSwapSuggestions,
  swapSuggestions = [],
  isSwapExpanded,
  isLoadingSwap,
  onSwapMeal,
  onSetRecurring,
  cookedRecipeIds,
}: DraggableMealCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Entrance animation — slides up + fades in on mount, staggered by mealIndex
  const entranceY = useSharedValue(24);
  const entranceOpacity = useSharedValue(0);

  useEffect(() => {
    const delay = mealIndex * 60;
    entranceOpacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
    entranceY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 120 }));
  }, []);

  const entranceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceY.value }],
  }));

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
          // Vertical drag - determine if reorder within hour or cross-hour move
          const hourHeight = 80;
          const hourOffset = Math.round(translateY.value / hourHeight);
          const targetHour = Math.max(0, Math.min(23, hour + hourOffset));

          // If small drag and multiple meals in slot, treat as reorder
          if (targetHour === hour && onReorder && totalMealsInHour > 1) {
            const itemHeight = 160; // approximate card height
            const indexOffset = Math.round(translateY.value / itemHeight);
            if (indexOffset !== 0) {
              const toIndex = Math.max(0, Math.min(totalMealsInHour - 1, mealIndex + indexOffset));
              if (toIndex !== mealIndex) {
                runOnJS(onReorder)(mealIndex, toIndex);
              }
            }
          } else {
            runOnJS(onDragEnd)(targetHour);
          }
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
    <Reanimated.View style={entranceAnimatedStyle}>
    <GestureDetector gesture={panGesture}>
      <Reanimated.View
        style={[
          {
            marginBottom: 12,
            borderRadius: 22,
            padding: 16,
            borderWidth: isDragOver ? 2 : 0,
            backgroundColor: (() => {
              const seed = String(meal.id ?? `${hour}-${mealIndex}-${meal.name ?? ''}`);
              const idx = hashToIndex(seed, PASTEL_ROTATION_LIGHT.length);
              return isDark ? PASTEL_ROTATION_DARK[idx] : PASTEL_ROTATION_LIGHT[idx];
            })(),
            borderColor: isDragOver
              ? isSnack
                ? isDark
                  ? DarkColors.secondaryRed
                  : Colors.secondaryRed
                : isDark
                ? DarkColors.primary
                : Colors.primary
              : 'transparent',
            overflow: 'hidden',
            ...Shadows.SM,
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

          {/* Meal type pill */}
          {meal.mealType && MEAL_TYPE_PILL[meal.mealType] && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: isDark ? MEAL_TYPE_PILL[meal.mealType].tintDark : MEAL_TYPE_PILL[meal.mealType].tint,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 6,
            }}>
              <Text style={{
                fontSize: 10,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: MEAL_TYPE_PILL[meal.mealType].accent,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {MEAL_TYPE_PILL[meal.mealType].label}
              </Text>
            </View>
          )}

          {/* Recipe Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? '#F9FAFB' : '#0F172A' }}>{meal.name}</Text>
                {cookedRecipeIds && (
                  <View style={{ marginLeft: 6 }}>
                    <SurpriseBadge recipeId={meal.id} cookedRecipeIds={cookedRecipeIds} isDark={isDark} />
                  </View>
                )}
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
                {meal.cookTime && (
                  <View className="flex-row items-center">
                    <Icon
                      name={Icons.TIME_OUTLINE}
                      size={IconSizes.XS}
                      color={isDark ? '#D1D5DB' : '#374151'}
                      accessibilityLabel="Prep time"
                    />
                    <Text style={{ marginLeft: 4, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: isDark ? '#D1D5DB' : '#374151' }}>
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

          {/* Macro Breakdown — calories + protein/carbs/fat/fiber */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: isDark ? 'rgba(17,24,39,0.55)' : '#FFFFFF',
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 8,
            marginBottom: 12,
            ...Shadows.SM,
          }}>
            {[
              { label: 'CAL',  value: `${meal.calories ?? 0}`,        color: isDark ? '#F9FAFB' : '#0F172A' },
              { label: 'PRO',  value: `${meal.protein ?? 0}g`,        color: '#1D4ED8' },
              { label: 'CARB', value: `${meal.carbs ?? 0}g`,          color: '#047857' },
              { label: 'FAT',  value: `${meal.fat ?? 0}g`,            color: '#6D28D9' },
              { label: 'FIB',  value: `${meal.fiber ?? 0}g`,          color: '#0F766E' },
            ].map((m) => (
              <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: m.color }}>
                  {m.value}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? '#D1D5DB' : '#374151', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 3 }}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Feedback row — bookmark · dislike · like */}
          <FeedbackRow recipeId={meal.id} isDark={isDark} />

          {/* Additional Info */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-4">
              {meal.difficulty && (
                <View className="flex-row items-center">
                  <Icon name={Icons.STAR_OUTLINE} size={12} color={isDark ? '#E5E7EB' : '#1F2937'} accessibilityLabel="Difficulty" />
                  <Text style={{ marginLeft: 4, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? '#E5E7EB' : '#1F2937', textTransform: 'capitalize' }}>{meal.difficulty}</Text>
                </View>
              )}
              {meal.cuisine && (
                <View className="flex-row items-center">
                  <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? '#E5E7EB' : '#1F2937', textTransform: 'capitalize' }}>{meal.cuisine}</Text>
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
              <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? '#F9FAFB' : '#0F172A', marginRight: 12 }}>
                View Recipe
              </Text>
              <HapticTouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Remove this meal?',
                    `Take "${meal.name}" off your plan?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => onLongPress() },
                    ]
                  );
                }}
                accessibilityLabel="Remove meal"
                hitSlop={8}
                style={{ marginRight: 10, padding: 2 }}
              >
                <Icon
                  name={Icons.DELETE_OUTLINE}
                  size={16}
                  color={isDark ? '#F87171' : '#B91C1C'}
                  accessibilityLabel="Remove meal"
                />
              </HapticTouchableOpacity>
              <Icon
                name={Icons.MENU}
                size={14}
                color={isDark ? '#D1D5DB' : '#374151'}
                accessibilityLabel="Drag to move"
              />
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
                      className="bg-surface dark:bg-card-dark rounded-lg p-3 border"
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
    </Reanimated.View>
  );
}


function FeedbackRow({ recipeId, isDark }: { recipeId: string; isDark: boolean }) {
  const [saved, setSaved] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [disliked, setDisliked] = React.useState(false);
  const [busy, setBusy] = React.useState<'save' | 'like' | 'dislike' | null>(null);

  if (!recipeId) return null;

  const handleSave = async () => {
    if (busy) return;
    setBusy('save');
    HapticPatterns.buttonPress();
    try {
      if (saved) {
        await recipeApi.unsaveRecipe(recipeId);
        setSaved(false);
      } else {
        await recipeApi.saveRecipe(recipeId);
        setSaved(true);
      }
    } catch {
      // silent — user-facing toast handled by callers if needed
    } finally {
      setBusy(null);
    }
  };

  const handleLike = async () => {
    if (busy) return;
    setBusy('like');
    HapticPatterns.like();
    try {
      await recipeApi.likeRecipe(recipeId);
      setLiked((v) => !v);
      if (disliked) setDisliked(false);
    } catch {
      // silent
    } finally {
      setBusy(null);
    }
  };

  const handleDislike = async () => {
    if (busy) return;
    setBusy('dislike');
    HapticPatterns.dislike();
    try {
      await recipeApi.dislikeRecipe(recipeId);
      setDisliked((v) => !v);
      if (liked) setLiked(false);
    } catch {
      // silent
    } finally {
      setBusy(null);
    }
  };

  const button = (active: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: active
      ? (isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF')
      : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)'),
  });

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <HapticTouchableOpacity
        onPress={handleSave}
        accessibilityLabel={saved ? 'Remove from cookbook' : 'Save to cookbook'}
        style={button(saved)}
      >
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={16}
          color={saved ? '#fa7e12' : (isDark ? '#E5E7EB' : '#374151')}
        />
      </HapticTouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <HapticTouchableOpacity
          onPress={handleDislike}
          accessibilityLabel={disliked ? 'Remove dislike' : 'Not for me'}
          style={button(disliked)}
        >
          <Ionicons
            name={disliked ? 'thumbs-down' : 'thumbs-down-outline'}
            size={16}
            color={disliked ? '#EF4444' : (isDark ? '#E5E7EB' : '#374151')}
          />
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          onPress={handleLike}
          accessibilityLabel={liked ? 'Remove like' : 'Love it'}
          style={button(liked)}
        >
          <Ionicons
            name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={liked ? '#16A34A' : (isDark ? '#E5E7EB' : '#374151')}
          />
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(DraggableMealCard);
