// frontend/components/home/SurpriseMeModal.tsx
// Pre-roulette filter modal for "Surprise Me With..." options

import { useState } from 'react';
import { View, Text, Modal, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';

export interface SurpriseFilters {
  cuisine?: string;
  mealType?: string;
  maxCookTime?: number;
}

const CUISINES = [
  { key: 'any', label: 'Any' },
  { key: 'Italian', label: 'Italian' },
  { key: 'Mexican', label: 'Mexican' },
  { key: 'Asian', label: 'Asian' },
  { key: 'Indian', label: 'Indian' },
  { key: 'Mediterranean', label: 'Mediterranean' },
  { key: 'American', label: 'American' },
  { key: 'Japanese', label: 'Japanese' },
  { key: 'Thai', label: 'Thai' },
  { key: 'Chinese', label: 'Chinese' },
];

const MEAL_TYPES = [
  { key: 'any', label: 'Any', icon: '🍽️' },
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snack', icon: '🍎' },
];

const COOK_TIMES = [
  { key: 'any', label: 'Any', value: undefined as number | undefined },
  { key: 'quick', label: '<15 min', value: 15 },
  { key: 'easy', label: '<30 min', value: 30 },
  { key: 'standard', label: '<60 min', value: 60 },
];

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export default function SurpriseMeModal({
  visible,
  onClose,
  onSurprise,
}: {
  visible: boolean;
  onClose: () => void;
  onSurprise: (filters: SurpriseFilters) => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [cuisine, setCuisine] = useState('any');
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [cookTime, setCookTime] = useState('any');

  const handleSurprise = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const filters: SurpriseFilters = {};
    if (cuisine !== 'any') filters.cuisine = cuisine;
    if (mealType !== 'any') filters.mealType = mealType;
    const selectedCookTime = COOK_TIMES.find(ct => ct.key === cookTime);
    if (selectedCookTime?.value) filters.maxCookTime = selectedCookTime.value;
    onSurprise(filters);
  };

  const chipStyle = (selected: boolean) => ({
    backgroundColor: selected
      ? (isDark ? DarkColors.primary : Colors.primary)
      : (isDark ? '#374151' : '#F3F4F6'),
  });

  const chipTextStyle = (selected: boolean) => ({
    color: selected ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          className="mx-6 rounded-2xl p-6"
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            width: Dimensions.get('window').width - 48,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">🎰</Text>
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Surprise Me With...
              </Text>
            </View>
            <HapticTouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </HapticTouchableOpacity>
          </View>

          {/* Cuisine */}
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Cuisine
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row" style={{ gap: 8 }}>
              {CUISINES.map(({ key, label }) => (
                <HapticTouchableOpacity
                  key={key}
                  onPress={() => setCuisine(key)}
                  className="px-4 py-2 rounded-full"
                  style={chipStyle(cuisine === key)}
                  accessibilityLabel={`${label} cuisine`}
                  accessibilityState={{ selected: cuisine === key }}
                >
                  <Text className="text-sm font-semibold" style={chipTextStyle(cuisine === key)}>
                    {label}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Meal Type */}
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Meal Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row" style={{ gap: 8 }}>
              {MEAL_TYPES.map(({ key, label, icon }) => (
                <HapticTouchableOpacity
                  key={key}
                  onPress={() => setMealType(key)}
                  className="px-4 py-2 rounded-full"
                  style={chipStyle(mealType === key)}
                  accessibilityLabel={`${label} meal type`}
                  accessibilityState={{ selected: mealType === key }}
                >
                  <Text className="text-sm font-semibold" style={chipTextStyle(mealType === key)}>
                    {icon} {label}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Cook Time */}
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Cook Time
          </Text>
          <View className="flex-row mb-6" style={{ gap: 8 }}>
            {COOK_TIMES.map(({ key, label }) => (
              <HapticTouchableOpacity
                key={key}
                onPress={() => setCookTime(key)}
                className="flex-1 py-2.5 rounded-full items-center"
                style={chipStyle(cookTime === key)}
                accessibilityLabel={`${label} cook time`}
                accessibilityState={{ selected: cookTime === key }}
              >
                <Text className="text-xs font-semibold" style={chipTextStyle(cookTime === key)}>
                  {label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>

          {/* Surprise Me Button */}
          <HapticTouchableOpacity
            onPress={handleSurprise}
            className="py-4 rounded-xl items-center"
            style={{
              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
            }}
            accessibilityLabel="Surprise me with recipes"
          >
            <Text className="font-bold text-lg text-white">
              Surprise Me!
            </Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
