// frontend/components/meal-plan/CompactMealView.tsx
// Compact view grouping meals by type (breakfast, lunch, dinner, snacks)

import React, { useCallback } from 'react';
import { View, Text, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, Easing, FadeInDown } from 'react-native-reanimated';
import { optimizedImageUrl } from '../../utils/imageUtils';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { MealPlanEmptyStates } from '../../constants/EmptyStates';
import SurpriseBadge from './SurpriseBadge';
import type { GroupedMeals } from '../../hooks/useMealPlanUI';

interface CompactMealViewProps {
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Grouped meals by type */
  groupedMeals: GroupedMeals;
  /** Whether a plan is being generated */
  generatingPlan: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Format time from hour and minute */
  formatTime: (hour: number, minute: number) => string;
  /** Add meal to a specific hour */
  onAddMealToHour: (hour: number) => void;
  /** Remove a meal */
  onRemoveMeal: (hour: number, mealIndex: number) => void;
  /** Generate full day meals */
  onGenerateFullDay: () => void;
  /** Set of recipe IDs the user has cooked before */
  cookedRecipeIds?: Set<string>;
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', defaultHour: 7 },
  { key: 'lunch', label: 'Lunch', icon: '☀️', defaultHour: 12 },
  { key: 'dinner', label: 'Dinner', icon: '🌙', defaultHour: 18 },
  { key: 'snacks', label: 'Snacks', icon: '🍎', defaultHour: 15 },
];

function getMealTypeColor(key: string, isDark: boolean): string {
  switch (key) {
    case 'breakfast': return isDark ? DarkColors.primary : Colors.primary;
    case 'lunch': return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
    case 'dinner': return isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen;
    case 'snacks': return isDark ? DarkColors.accent : Colors.accent;
    default: return isDark ? DarkColors.primary : Colors.primary;
  }
}

function CompactMealView({
  hourlyMeals,
  groupedMeals,
  generatingPlan,
  isDark,
  formatTime,
  onAddMealToHour,
  onRemoveMeal,
  onGenerateFullDay,
  cookedRecipeIds,
}: CompactMealViewProps) {
  return (
    <View className="px-4 mb-4" style={{ width: '100%' }}>
      <View className="space-y-3">
        {MEAL_TYPES.map((mealType) => {
          const meals = groupedMeals[mealType.key as keyof GroupedMeals];
          const color = getMealTypeColor(mealType.key, isDark);
          if (meals.length === 0) return null;

          const typeIndex = MEAL_TYPES.findIndex(t => t.key === mealType.key);

          return (
            <Animated.View
              key={mealType.key}
              entering={FadeInDown.delay(typeIndex * 100).springify().damping(14).stiffness(200)}
              style={[{
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderRadius: 20,
                padding: 20,
                marginBottom: 12,
              }, Shadows.MD]}
            >
              <View className="flex-row items-center mb-3">
                <Text style={{ fontSize: 22, marginRight: 8 }}>{mealType.icon}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', flex: 1, color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                  {mealType.label}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => onAddMealToHour(mealType.defaultHour)}
                  style={[{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 100,
                    backgroundColor: color,
                  }, Shadows.SM]}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>+ Add</Text>
                </HapticTouchableOpacity>
              </View>
              <View style={{ gap: 10 }}>
                {meals.map((meal, index) => {
                  const hour = meal.hour;
                  const mealIndex = hourlyMeals[hour]?.findIndex(m => m.id === meal.id) || 0;

                  return (
                    <HapticTouchableOpacity
                      key={`${mealType.key}-${index}`}
                      onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                      onLongPress={() => onRemoveMeal(hour, mealIndex)}
                      style={[{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: isDark ? DarkColors.cardRaised : Colors.surface,
                      }]}
                    >
                      {meal.imageUrl ? (
                        <Image
                          source={{ uri: optimizedImageUrl(meal.imageUrl) }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            marginRight: 12,
                            backgroundColor: isDark ? '#374151' : '#E5E7EB',
                          }}
                        />
                      ) : (
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          marginRight: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#374151' : '#E5E7EB',
                        }}>
                          <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.SM} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View className="flex-row items-center">
                          <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                            {meal.name || meal.title}
                          </Text>
                          {cookedRecipeIds && (
                            <View style={{ marginLeft: 6 }}>
                              <SurpriseBadge recipeId={meal.id} cookedRecipeIds={cookedRecipeIds} isDark={isDark} />
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2, opacity: 0.6 }}>
                          {formatTime(hour, 0)} • {meal.calories} cal
                        </Text>
                      </View>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          );
        })}

        {Object.values(groupedMeals).flat().length === 0 && (
          <View style={[{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 20, padding: 24 }, Shadows.MD]}>
            <AnimatedEmptyState
              config={MealPlanEmptyStates.emptyDay}
              title=""
              actionLabel="Create Full Day"
              onAction={() => {
                if (!generatingPlan) {
                  onGenerateFullDay();
                }
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}


export default React.memo(CompactMealView);
