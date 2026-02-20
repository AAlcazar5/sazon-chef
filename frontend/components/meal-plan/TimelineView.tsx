// frontend/components/meal-plan/TimelineView.tsx
// 24-hour timeline view for meal plan

import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import AnimatedHourHeader from './AnimatedHourHeader';
import DraggableMealCard from './DraggableMealCard';
import type { HourData, MealTypeFilter, DragState } from '../../hooks/useMealPlanUI';

interface TimelineViewProps {
  /** 24-hour data array */
  hours: HourData[];
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Current meal type filter */
  mealTypeFilter: MealTypeFilter;
  /** Current drag state */
  draggingMeal: DragState | null;
  /** Hour being dragged over */
  dragOverHour: number | null;
  /** Meal completion status map */
  mealCompletionStatus: Record<string, boolean>;
  /** Meal notes map */
  mealNotes: Record<string, string>;
  /** Expanded swap meal ID */
  expandedSwapMealId: string | null;
  /** Loading swap suggestions meal ID */
  loadingSwapSuggestions: string | null;
  /** Swap suggestions per meal */
  mealSwapSuggestions: Record<string, any[]>;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Add meal to a specific hour */
  onAddMealToHour: (hour: number) => void;
  /** Start dragging a meal */
  onDragStart: (state: DragState) => void;
  /** End drag and drop meal */
  onDragEnd: () => void;
  /** Set drag over hour */
  onDragOver: (hour: number | null) => void;
  /** Move meal from one hour to another */
  onMoveMeal: (fromHour: number, mealIndex: number, toHour: number) => void;
  /** Remove a meal */
  onRemoveMeal: (hour: number, mealIndex: number) => void;
  /** Toggle meal completion */
  onToggleComplete: (mealId: string, isCompleted: boolean) => void;
  /** Open notes for a meal */
  onOpenNotes: (mealId: string) => void;
  /** Get swap suggestions */
  onGetSwapSuggestions: (mealId: string, meal: any) => void;
  /** Swap a meal */
  onSwapMeal: (mealId: string, newRecipe: any, currentMeal: any) => void;
  /** Set meal as recurring */
  onSetRecurring?: (meal: any) => void;
}

function TimelineView({
  hours,
  hourlyMeals,
  mealTypeFilter,
  draggingMeal,
  dragOverHour,
  mealCompletionStatus,
  mealNotes,
  expandedSwapMealId,
  loadingSwapSuggestions,
  mealSwapSuggestions,
  isDark,
  onAddMealToHour,
  onDragStart,
  onDragEnd,
  onDragOver,
  onMoveMeal,
  onRemoveMeal,
  onToggleComplete,
  onOpenNotes,
  onGetSwapSuggestions,
  onSwapMeal,
  onSetRecurring,
}: TimelineViewProps) {
  // Memoize filtered hours to avoid recalculating on every render
  const filteredHours = useMemo(() => {
    if (mealTypeFilter === 'all') return hours;
    return hours.filter((hourData) => {
      const mealsForHour = hourlyMeals[hourData.hour] || [];
      return mealsForHour.length > 0;
    });
  }, [hours, hourlyMeals, mealTypeFilter]);

  const keyExtractor = useCallback((item: HourData) => String(item.hour), []);

  const renderHourRow = useCallback(({ item: hourData }: { item: HourData }) => {
    const isDragOverHour = dragOverHour === hourData.hour && draggingMeal !== null;
    const mealsForHour = hourlyMeals[hourData.hour] || [];
    const filteredMeals = mealTypeFilter === 'all'
      ? mealsForHour
      : mealsForHour.filter((meal) => {
          if (mealTypeFilter === 'snacks') {
            return meal.mealType === 'snack' || meal.mealType === 'dessert';
          }
          return meal.mealType === mealTypeFilter;
        });

    if (mealTypeFilter !== 'all' && filteredMeals.length === 0 && mealsForHour.length === 0) {
      return null;
    }

    return (
      <View style={{ marginBottom: 4 }}>
        <AnimatedHourHeader
          hourData={hourData}
          hourlyMeals={mealTypeFilter === 'all' ? hourlyMeals : { [hourData.hour]: filteredMeals }}
          isDark={isDark}
          isDragOver={isDragOverHour}
          onAddMeal={onAddMealToHour}
        />

        {/* Drop Zone Indicator */}
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

        {/* Meals for this hour */}
        {filteredMeals.length > 0 && (
          <View className="ml-4 mb-2">
            {filteredMeals.map((meal, mealIndex) => {
              const actualMealIndex = mealsForHour.findIndex(m => m.id === meal.id);
              const isDragging = draggingMeal?.hour === hourData.hour && draggingMeal?.mealIndex === actualMealIndex;
              const isDragOverCurrent = dragOverHour === hourData.hour;
              const isSnack = meal.mealType === 'snack' || meal.mealType === 'dessert';

              return (
                <DraggableMealCard
                  key={`${hourData.hour}-${mealIndex}`}
                  meal={meal}
                  hour={hourData.hour}
                  mealIndex={mealIndex}
                  isDark={isDark}
                  isDragging={isDragging}
                  isDragOver={isDragOverCurrent}
                  isSnack={isSnack}
                  onDragStart={() => onDragStart({ hour: hourData.hour, mealIndex: actualMealIndex, meal })}
                  onDragEnd={(targetHour: number) => {
                    if (targetHour !== hourData.hour) {
                      onMoveMeal(hourData.hour, actualMealIndex, targetHour);
                    }
                    onDragEnd();
                  }}
                  onDragOver={(targetHour: number) => {
                    if (targetHour === -1) {
                      onDragOver(null);
                    } else if (targetHour >= 0 && targetHour < 24) {
                      onDragOver(targetHour);
                    }
                  }}
                  onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                  onLongPress={() => onRemoveMeal(hourData.hour, actualMealIndex)}
                  isCompleted={meal.mealPlanMealId ? mealCompletionStatus[meal.mealPlanMealId] || false : false}
                  hasNotes={meal.mealPlanMealId ? !!mealNotes[meal.mealPlanMealId] : false}
                  notesText={meal.mealPlanMealId && mealNotes[meal.mealPlanMealId] ? mealNotes[meal.mealPlanMealId] : undefined}
                  onToggleComplete={onToggleComplete}
                  onOpenNotes={onOpenNotes}
                  onGetSwapSuggestions={onGetSwapSuggestions}
                  swapSuggestions={meal.mealPlanMealId ? mealSwapSuggestions[meal.mealPlanMealId] || [] : []}
                  isSwapExpanded={meal.mealPlanMealId ? expandedSwapMealId === meal.mealPlanMealId : false}
                  isLoadingSwap={meal.mealPlanMealId ? loadingSwapSuggestions === meal.mealPlanMealId : false}
                  onSwapMeal={onSwapMeal}
                  onSetRecurring={onSetRecurring}
                />
              );
            })}
          </View>
        )}
      </View>
    );
  }, [
    hourlyMeals, mealTypeFilter, draggingMeal, dragOverHour,
    mealCompletionStatus, mealNotes, expandedSwapMealId,
    loadingSwapSuggestions, mealSwapSuggestions, isDark,
    onAddMealToHour, onDragStart, onDragEnd, onDragOver,
    onMoveMeal, onRemoveMeal, onToggleComplete, onOpenNotes,
    onGetSwapSuggestions, onSwapMeal, onSetRecurring,
  ]);

  return (
    <View className="px-4 mb-4" style={{ width: '100%' }}>
      <FlatList
        data={filteredHours}
        renderItem={renderHourRow}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        removeClippedSubviews={true}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
    </View>
  );
}


export default React.memo(TimelineView);
