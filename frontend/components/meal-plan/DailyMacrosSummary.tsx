// frontend/components/meal-plan/DailyMacrosSummary.tsx
// Expandable daily macros summary with progress bars

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMacrosSummaryProps {
  /** Current daily macro values */
  dailyMacros: MacroData;
  /** Target macro values */
  targetMacros: MacroData;
  /** Formatted date string */
  formattedDate: string;
  /** Whether macros section is expanded */
  macrosExpanded: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Toggle macros expanded state */
  onToggleExpanded: () => void;
  /** Get macro color based on progress */
  getMacroColor: (current: number, target: number) => { color: string };
}

function MacroProgressBar({ current, target, color, isDark }: { current: number; target: number; color: string; isDark: boolean }) {
  return (
    <View className="relative w-full" style={{ height: 8, marginTop: 4, overflow: 'visible' }}>
      <View
        className="absolute rounded-full"
        style={{
          width: '100%',
          height: 8,
          backgroundColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 999
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          height: 8,
          width: current >= target ? '100%' : `${(current / target) * 100}%`,
          backgroundColor: color,
          borderRadius: 999
        }}
      />
      {current > target && (
        <View
          className="absolute rounded-full"
          style={{
            height: 8,
            width: `${Math.min(((current - target) / target) * 100, 30)}%`,
            backgroundColor: color,
            borderRadius: 999,
            left: '100%',
            opacity: 0.7
          }}
        />
      )}
    </View>
  );
}

function DailyMacrosSummary({
  dailyMacros,
  targetMacros,
  formattedDate,
  macrosExpanded,
  isDark,
  onToggleExpanded,
  getMacroColor,
}: DailyMacrosSummaryProps) {
  return (
    <View className="px-4 mb-4">
      <HapticTouchableOpacity
        onPress={() => {
          HapticPatterns.buttonPress();
          onToggleExpanded();
        }}
        className="flex-row items-center justify-between mb-3"
      >
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Daily Macros - {formattedDate}
        </Text>
        <Icon
          name={macrosExpanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
          size={IconSizes.MD}
          color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
          accessibilityLabel={macrosExpanded ? "Collapse macros" : "Expand macros"}
        />
      </HapticTouchableOpacity>

      {macrosExpanded ? (
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between" style={{ gap: 8 }}>
            <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
              <Text className="text-sm text-gray-500 dark:text-gray-200">Calories</Text>
              <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.calories, targetMacros.calories)}>
                {dailyMacros.calories}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.calories}</Text>
              <MacroProgressBar current={dailyMacros.calories} target={targetMacros.calories} color={isDark ? DarkColors.primary : Colors.primary} isDark={isDark} />
            </View>

            <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
              <Text className="text-sm text-gray-500 dark:text-gray-200">Protein</Text>
              <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.protein, targetMacros.protein)}>
                {dailyMacros.protein}g
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.protein}g</Text>
              <MacroProgressBar current={dailyMacros.protein} target={targetMacros.protein} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} isDark={isDark} />
            </View>

            <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
              <Text className="text-sm text-gray-500 dark:text-gray-200">Carbs</Text>
              <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.carbs, targetMacros.carbs)}>
                {dailyMacros.carbs}g
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.carbs}g</Text>
              <MacroProgressBar current={dailyMacros.carbs} target={targetMacros.carbs} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} isDark={isDark} />
            </View>

            <View className="flex-1 items-center" style={{ marginHorizontal: 4 }}>
              <Text className="text-sm text-gray-500 dark:text-gray-200">Fat</Text>
              <Text className="text-lg font-bold" style={getMacroColor(dailyMacros.fat, targetMacros.fat)}>
                {dailyMacros.fat}g
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-200">/ {targetMacros.fat}g</Text>
              <MacroProgressBar current={dailyMacros.fat} target={targetMacros.fat} color={isDark ? DarkColors.accent : Colors.accent} isDark={isDark} />
            </View>
          </View>
        </View>
      ) : (
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Calories</Text>
                <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.calories, targetMacros.calories)}>
                  {dailyMacros.calories}/{targetMacros.calories}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Protein</Text>
                <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.protein, targetMacros.protein)}>
                  {dailyMacros.protein}g/{targetMacros.protein}g
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Carbs</Text>
                <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.carbs, targetMacros.carbs)}>
                  {dailyMacros.carbs}g/{targetMacros.carbs}g
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Fat</Text>
                <Text className="text-base font-semibold" style={getMacroColor(dailyMacros.fat, targetMacros.fat)}>
                  {dailyMacros.fat}g/{targetMacros.fat}g
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}


export default React.memo(DailyMacrosSummary);
