// frontend/components/ui/MoodSelector.tsx
// Mood-based recipe recommendations selector (Home Page 2.0)

import { View, Text, Modal, ScrollView, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { Duration, Spring } from '../../constants/Animations';

export interface Mood {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

// Predefined moods with recipe characteristics mapping
export const MOODS: Mood[] = [
  {
    id: 'lazy',
    label: 'Lazy',
    emoji: '😴',
    description: 'Quick & minimal effort',
    color: '#6B7280', // gray
  },
  {
    id: 'healthy',
    label: 'Healthy',
    emoji: '🥗',
    description: 'Nutritious & balanced',
    color: '#10B981', // green
  },
  {
    id: 'adventurous',
    label: 'Adventurous',
    emoji: '🌍',
    description: 'New cuisines & flavors',
    color: '#8B5CF6', // purple
  },
  {
    id: 'indulgent',
    label: 'Indulgent',
    emoji: '🍰',
    description: 'Rich & comforting',
    color: '#EC4899', // pink
  },
  {
    id: 'comfort',
    label: 'Comfort',
    emoji: '🍲',
    description: 'Hearty & familiar',
    color: '#F59E0B', // amber
  },
  {
    id: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    description: 'High protein & power',
    color: '#EF4444', // red
  },
];

// Mood to recipe filter criteria mapping
export const MOOD_CRITERIA: Record<string, {
  maxCookTime?: number;
  minProtein?: number;
  maxCalories?: number;
  cuisines?: string[];
  excludeCuisines?: string[];
  healthGrades?: string[];
  preferComplex?: boolean;
  preferSimple?: boolean;
}> = {
  lazy: {
    maxCookTime: 20,
    preferSimple: true,
  },
  healthy: {
    maxCalories: 500,
    minProtein: 20,
    healthGrades: ['A', 'B'],
  },
  adventurous: {
    cuisines: ['Thai', 'Indian', 'Japanese', 'Korean', 'Vietnamese', 'Ethiopian', 'Moroccan'],
    preferComplex: true,
  },
  indulgent: {
    excludeCuisines: [],
    // No calorie restrictions for indulgent
  },
  comfort: {
    cuisines: ['American', 'Italian', 'Mexican', 'French'],
  },
  energetic: {
    minProtein: 30,
    maxCookTime: 30,
  },
};

interface MoodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectMood: (mood: Mood) => void;
  selectedMood: Mood | null;
}

export default function MoodSelector({
  visible,
  onClose,
  onSelectMood,
  selectedMood,
}: MoodSelectorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(400);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
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
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleMoodSelect = (mood: Mood) => {
    HapticPatterns.buttonPressPrimary();
    onSelectMood(mood);
    onClose();
  };

  const handleClearMood = () => {
    HapticPatterns.buttonPress();
    onSelectMood(null as any);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity }}
      >
        <HapticTouchableOpacity
          className="flex-1"
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View
          className="bg-white dark:bg-gray-800 rounded-t-3xl"
          style={{
            transform: [{ translateY }],
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Header */}
          <View className="px-6 pt-6 pb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                I'm feeling...
              </Text>
              <HapticTouchableOpacity onPress={onClose}>
                <Text className="text-gray-500 dark:text-gray-400 text-base">Cancel</Text>
              </HapticTouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Select your mood to get personalized recipe suggestions
            </Text>
          </View>

          {/* Mood Grid */}
          <ScrollView
            className="px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View className="flex-row flex-wrap justify-between">
              {MOODS.map((mood) => {
                const isSelected = selectedMood?.id === mood.id;
                return (
                  <HapticTouchableOpacity
                    key={mood.id}
                    onPress={() => handleMoodSelect(mood)}
                    className="mb-3 rounded-2xl p-4 border-2"
                    style={{
                      width: '48%',
                      backgroundColor: isSelected
                        ? `${mood.color}22`
                        : isDark ? '#1F2937' : '#F9FAFB',
                      borderColor: isSelected ? mood.color : 'transparent',
                    }}
                  >
                    <Text className="text-3xl mb-2">{mood.emoji}</Text>
                    <Text
                      className="text-base font-semibold mb-1"
                      style={{ color: isSelected ? mood.color : (isDark ? '#F3F4F6' : '#1F2937') }}
                    >
                      {mood.label}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {mood.description}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>

            {/* Clear Selection */}
            {selectedMood && (
              <HapticTouchableOpacity
                onPress={handleClearMood}
                className="mt-2 py-3 rounded-xl border border-gray-300 dark:border-gray-600"
              >
                <Text className="text-center text-gray-600 dark:text-gray-300 font-medium">
                  Clear Mood Filter
                </Text>
              </HapticTouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Compact mood chip for displaying selected mood in header
export function MoodChip({
  mood,
  onPress,
  onClear,
}: {
  mood: Mood | null;
  onPress: () => void;
  onClear?: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!mood) {
    return (
      <HapticTouchableOpacity
        onPress={onPress}
        className="flex-row items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700"
      >
        <Text className="text-sm">🎭</Text>
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-300 ml-1.5">
          Mood
        </Text>
      </HapticTouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center">
      <HapticTouchableOpacity
        onPress={onPress}
        className="flex-row items-center px-3 py-1.5 rounded-full"
        style={{ backgroundColor: `${mood.color}22` }}
      >
        <Text className="text-sm">{mood.emoji}</Text>
        <Text
          className="text-xs font-medium ml-1.5"
          style={{ color: mood.color }}
        >
          {mood.label}
        </Text>
      </HapticTouchableOpacity>
      {onClear && (
        <HapticTouchableOpacity
          onPress={onClear}
          className="ml-1 p-1"
        >
          <Text className="text-gray-400 text-xs">✕</Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}
