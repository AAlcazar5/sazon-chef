// frontend/components/home/IngredientSpotlightCard.tsx
// Weekly rotating ingredient spotlight card for the home feed.
// One card per week, deterministically keyed to ISO week number.

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { getWeeklySpotlight } from '../../constants/IngredientSpotlights';

interface IngredientSpotlightCardProps {
  /** Called when the user taps the card — should filter recipes by ingredient */
  onSearch: (query: string) => void;
}

export default function IngredientSpotlightCard({ onSearch }: IngredientSpotlightCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const spotlight = getWeeklySpotlight();

  return (
    <View className="mx-4 mt-4">
      <HapticTouchableOpacity
        onPress={() => {
          HapticPatterns.buttonPress();
          onSearch(spotlight.searchFilter);
        }}
        style={{
          borderRadius: 16,
          padding: 16,
          backgroundColor: isDark ? '#1F2937' : '#FFFBEB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
        accessibilityLabel={`This week's ingredient: ${spotlight.ingredient}`}
      >
        <View className="flex-row items-center mb-2">
          <Icon
            name={Icons.NUTRITION_OUTLINE as any}
            size={IconSizes.SM}
            color={isDark ? DarkColors.primary : Colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            This Week
          </Text>
        </View>

        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {spotlight.ingredient}
        </Text>

        <Text className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-5">
          {spotlight.tagline}
        </Text>

        {/* Micro-badges */}
        {(spotlight.fiberHighlight || spotlight.omega3Highlight) && (
          <View className="flex-row mt-2.5" style={{ gap: 6 }}>
            {spotlight.fiberHighlight && (
              <View
                style={{
                  backgroundColor: isDark ? '#065F46' : '#D1FAE5',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#6EE7B7' : '#065F46' }}>
                  High fiber
                </Text>
              </View>
            )}
            {spotlight.omega3Highlight && (
              <View
                style={{
                  backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E40AF' }}>
                  Rich in Omega-3s
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="flex-row items-center mt-3">
          <Text
            className="text-sm font-medium"
            style={{ color: isDark ? DarkColors.primary : Colors.primary }}
          >
            See recipes
          </Text>
          <Icon
            name={Icons.CHEVRON_FORWARD as any}
            size={14}
            color={isDark ? DarkColors.primary : Colors.primary}
            style={{ marginLeft: 4 }}
          />
        </View>
      </HapticTouchableOpacity>
    </View>
  );
}
