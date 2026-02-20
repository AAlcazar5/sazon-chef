// frontend/components/profile/MacroGoalsCard.tsx
// Macro goals display card

import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserProfile } from '../../types';

interface MacroGoalsCardProps {
  profile: UserProfile | null;
  macroGoals: any | null;
}

export default function MacroGoalsCard({ profile, macroGoals }: MacroGoalsCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const goals = profile?.macroGoals || macroGoals;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenDark }}>
            <Icon name={Icons.MACRO_GOALS} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : '#FFFFFF'} accessibilityLabel="Macro goals" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Macro Goals</Text>
        </View>
        <HapticTouchableOpacity onPress={() => router.push('/edit-macro-goals')}>
          <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
        </HapticTouchableOpacity>
      </View>

      {goals ? (
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-200">Calories</Text>
            <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.calories} cal</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-200">Protein</Text>
            <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.protein}g</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-200">Carbs</Text>
            <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.carbs}g</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-200">Fat</Text>
            <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.fat}g</Text>
          </View>
        </View>
      ) : (
        <HapticTouchableOpacity
          onPress={() => router.push('/edit-macro-goals')}
          className="p-3 rounded-lg border"
          style={{
            backgroundColor: isDark ? `${Colors.tertiaryGreenLight}1A` : Colors.tertiaryGreenDark,
            borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreenDark,
          }}
        >
          <View className="flex-row items-center">
            <Icon name={Icons.MACRO_GOALS} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : '#FFFFFF'} accessibilityLabel="Macro goals" />
            <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.tertiaryGreen : '#FFFFFF' }}>
              Set up your macro goals
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.tertiaryGreen : '#FFFFFF' }}>
            Get personalized recipe recommendations based on your nutrition goals
          </Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}
