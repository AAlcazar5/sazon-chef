// frontend/components/meal-plan/RecurringMealModal.tsx
// Modal for creating/editing a recurring meal rule

import { View, Text, Modal, ScrollView, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';
import type { RecurringMeal } from '../../types';

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
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

      // Animate in
      scale.setValue(0.8);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, existingRule, meal, scale, opacity]);

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/50 justify-center items-center px-4" style={{ opacity }}>
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        <Animated.View
          className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-lg"
          style={{ transform: [{ scale }] }}
        >
          {/* Header */}
          <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Recurring Meal' : 'Set as Recurring'}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={1}>
                {mealTitle}
              </Text>
            </View>
            <HapticTouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
            >
              <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close" />
            </HapticTouchableOpacity>
          </View>

          <ScrollView className="p-4">
            {/* Meal Type Selector */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meal Type</Text>
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
                        : isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
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
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repeat On</Text>
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
                className="flex-1 py-1.5 rounded-full items-center border border-gray-200 dark:border-gray-600"
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">Weekdays</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={selectWeekends}
                className="flex-1 py-1.5 rounded-full items-center border border-gray-200 dark:border-gray-600"
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">Weekends</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={selectEveryDay}
                className="flex-1 py-1.5 rounded-full items-center border border-gray-200 dark:border-gray-600"
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">Every Day</Text>
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
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
