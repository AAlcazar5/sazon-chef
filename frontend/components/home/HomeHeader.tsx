// frontend/components/home/HomeHeader.tsx
// Header component for home screen

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { LogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';
import type { MealPeriod } from '../../hooks/useTimeAwareMode';

export type ViewMode = 'grid' | 'list';

interface HomeHeaderProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Called when view mode changes */
  onToggleViewMode: (mode: ViewMode) => void;
  /** Current meal period */
  currentMealPeriod: MealPeriod;
  /** Whether time-aware mode is enabled */
  timeAwareMode: boolean;
  /** Called when time-aware mode is toggled */
  onToggleTimeAwareMode: () => void;
  /** Called when the mascot logo is pressed — scrolls to top */
  onMascotPress: () => void;
}

/**
 * Header component for the home screen
 * Includes logo, branding, time-aware indicator, and view mode toggle
 */
export default function HomeHeader({
  viewMode,
  onToggleViewMode,
  currentMealPeriod,
  timeAwareMode,
  onToggleTimeAwareMode,
  onMascotPress,
}: HomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700"
      style={{ minHeight: 56 }}
    >
      <View className="flex-row items-center justify-between" style={{ height: 28 }}>
        {/* Logo and Branding */}
        <View className="flex-row items-center flex-1">
          <HapticTouchableOpacity
            onPress={onMascotPress}
            activeOpacity={0.7}
          >
            <LogoMascot size="xsmall" />
          </HapticTouchableOpacity>
          <Text
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            style={{ marginLeft: -2, lineHeight: 28 }}
            accessibilityRole="header"
          >
            Sazon Chef
          </Text>
        </View>

        {/* Time-Aware Mode Indicator */}
        <HapticTouchableOpacity
          onPress={onToggleTimeAwareMode}
          className={`flex-row items-center px-2 py-1 rounded-lg mr-2 ${
            timeAwareMode ? '' : 'bg-gray-100 dark:bg-gray-700'
          }`}
          style={
            timeAwareMode
              ? {
                  backgroundColor: isDark
                    ? `${Colors.primary}33`
                    : `${Colors.primary}22`,
                }
              : undefined
          }
          accessibilityLabel={`${currentMealPeriod.label} time suggestions ${
            timeAwareMode ? 'enabled' : 'disabled'
          }`}
        >
          <Text className="text-sm">{currentMealPeriod.emoji}</Text>
          <Text
            className={`text-xs font-medium ml-1 ${
              timeAwareMode
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {currentMealPeriod.label}
          </Text>
        </HapticTouchableOpacity>

        {/* View Mode Toggle */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <HapticTouchableOpacity
              onPress={() => onToggleViewMode('list')}
              className={`px-3 py-1.5 rounded ${viewMode === 'list' ? '' : ''}`}
              style={
                viewMode === 'list'
                  ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary }
                  : undefined
              }
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'list' ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'}
              />
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={() => onToggleViewMode('grid')}
              className={`px-3 py-1.5 rounded ${viewMode === 'grid' ? '' : ''}`}
              style={
                viewMode === 'grid'
                  ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary }
                  : undefined
              }
            >
              <Ionicons
                name="grid"
                size={18}
                color={viewMode === 'grid' ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'}
              />
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
