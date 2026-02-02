// frontend/components/home/MealPrepModeHeader.tsx
// Header banner displayed when meal prep mode is active

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';

/**
 * Header banner displayed when meal prep mode is active
 * Shows a prominent indicator that meal prep recipes are being shown
 */
export default function MealPrepModeHeader() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-4 pt-4 pb-2">
      <View
        className={`rounded-xl p-4 border ${isDark ? 'border-orange-800' : 'border-orange-200'}`}
        style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
      >
        <View className="flex-row items-center mb-2">
          <Text className="text-2xl mr-2">🍱</Text>
          <Text
            className="text-lg font-semibold"
            style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}
          >
            Meal Prep Mode Active
          </Text>
        </View>
        <Text
          className="text-sm"
          style={{ color: isDark ? DarkColors.primary : Colors.primary }}
        >
          Showing recipes suitable for batch cooking, freezing, and weekly meal prep
        </Text>
      </View>
    </View>
  );
}
