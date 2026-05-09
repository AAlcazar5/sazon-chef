// frontend/components/meal-plan/RecurringMealModal.tsx
// Modal for creating/editing a recurring meal rule

import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import RecurringModalShell from './RecurringModalShell';
import type { RecurringMeal } from '../../types';
import { t } from '../../lib/i18n';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
];

interface RecurringMealModalProps {
  visible: boolean;
  onClose: () => void;
  /** Source meal to pre-fill from (create mode) */
  meal?: any;
  /** Existing rule to edit (edit mode) */
  existingRule?: RecurringMeal;
  /** Called with rule data on save */
  onSave: (data: {
    id?: string;
    mealType: string;
    daysOfWeek: string;
    recipeId?: string;
    title?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }) => void;
}

export default function RecurringMealModal({
  visible,
  onClose,
  meal,
  existingRule,
  onSave,
}: RecurringMealModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [mealType, setMealType] = useState('breakfast');

  // Initialize from existing rule or meal
  useEffect(() => {
    if (visible) {
      if (existingRule) {
        setSelectedDays(new Set(existingRule.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10))));
        setMealType(existingRule.mealType);
      } else if (meal) {
        // Pre-select current day of week
        const today = new Date().getDay();
        setSelectedDays(new Set([today]));
        // Infer meal type from meal data
        const inferredType = meal.mealType || 'breakfast';
        setMealType(inferredType);
      } else {
        setSelectedDays(new Set());
        setMealType('breakfast');
      }
    }
  }, [visible, existingRule, meal]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const selectWeekdays = () => setSelectedDays(new Set([1, 2, 3, 4, 5]));
  const selectWeekends = () => setSelectedDays(new Set([0, 6]));
  const selectEveryDay = () => setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]));

  const handleSave = () => {
    if (selectedDays.size === 0) return;

    const daysOfWeek = Array.from(selectedDays).sort().join(',');
    const data: any = {
      mealType,
      daysOfWeek,
    };

    if (existingRule) {
      data.id = existingRule.id;
    }

    // Attach recipe/custom data
    if (existingRule?.recipeId) {
      data.recipeId = existingRule.recipeId;
    } else if (meal?.id) {
      data.recipeId = meal.id;
    }

    if (existingRule?.title || meal?.name || meal?.customName) {
      data.title = existingRule?.title || meal?.customName || meal?.name;
    }

    // Attach macros
    const source = existingRule?.recipe || existingRule || meal;
    if (source) {
      if (source.calories) data.calories = source.calories;
      if (source.protein) data.protein = source.protein;
      if (source.carbs) data.carbs = source.carbs;
      if (source.fat) data.fat = source.fat;
    }

    onSave(data);
  };

  const mealTitle = existingRule?.recipe?.title || existingRule?.title || meal?.name || meal?.customName || 'Custom Meal';
  const isEditing = !!existingRule;

  return (
    <RecurringModalShell
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Recurring Meal' : 'Set as Recurring'}
      subtitle={mealTitle}
    >
            {/* Meal Type Selector */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('mealPlan.recurring.mealType')}</Text>
            <View className="flex-row mb-4" style={{ gap: 8 }}>
              {MEAL_TYPE_OPTIONS.map((opt) => {
                const isSelected = mealType === opt.value;
                return (
                  <HapticTouchableOpacity
                    key={opt.value}
                    onPress={() => setMealType(opt.value)}
                    className="flex-1 py-2 rounded-lg items-center border"
                    style={{
                      backgroundColor: isSelected
                        ? isDark ? `${Colors.primaryLight}33` : Colors.primaryLight
                        : isDark ? 'rgba(255,255,255,0.04)' : Colors.surface,
                      borderColor: isSelected
                        ? isDark ? DarkColors.primary : Colors.primary
                        : isDark ? '#374151' : '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{
                        color: isSelected
                          ? isDark ? DarkColors.primary : Colors.primary
                          : isDark ? '#9CA3AF' : '#6B7280',
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>

            {/* Day Selector */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('mealPlan.recurring.repeatOn')}</Text>
            <View className="flex-row justify-between mb-3">
              {DAY_LABELS.map((label, index) => {
                const isSelected = selectedDays.has(index);
                return (
                  <HapticTouchableOpacity
                    key={index}
                    onPress={() => toggleDay(index)}
                    className="items-center justify-center rounded-full"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: isSelected
                        ? isDark ? DarkColors.primary : Colors.primary
                        : isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: isSelected
                          ? '#FFFFFF'
                          : isDark ? '#9CA3AF' : '#6B7280',
                      }}
                    >
                      {label}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>

            {/* Shortcut Buttons */}
            <View className="flex-row mb-4" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={selectWeekdays}
                className="flex-1 py-1.5 rounded-full items-center "
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('mealPlan.recurring.weekdays')}</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={selectWeekends}
                className="flex-1 py-1.5 rounded-full items-center "
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('mealPlan.recurring.weekends')}</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={selectEveryDay}
                className="flex-1 py-1.5 rounded-full items-center "
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('mealPlan.recurring.everyDay')}</Text>
              </HapticTouchableOpacity>
            </View>

            {/* Save Button */}
            <HapticTouchableOpacity
              onPress={handleSave}
              disabled={selectedDays.size === 0}
              className="py-3 rounded-lg items-center flex-row justify-center"
              style={{
                backgroundColor: selectedDays.size === 0
                  ? isDark ? '#374151' : '#D1D5DB'
                  : isDark ? DarkColors.primary : Colors.primary,
              }}
            >
              <Icon
                name={Icons.REFRESH}
                size={IconSizes.SM}
                color={selectedDays.size === 0 ? '#9CA3AF' : '#FFFFFF'}
                accessibilityLabel="Save"
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: selectedDays.size === 0 ? '#9CA3AF' : '#FFFFFF' }}
              >
                {isEditing ? 'Update Rule' : 'Set Recurring'}
              </Text>
            </HapticTouchableOpacity>
    </RecurringModalShell>
  );
}
