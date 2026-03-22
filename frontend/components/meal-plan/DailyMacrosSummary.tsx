// frontend/components/meal-plan/DailyMacrosSummary.tsx
// Expandable daily macros summary with progress bars

import React from 'react';
import { View, Text } from 'react-native';
import { CountingNumber } from '../ui/AnimatedStatCounter';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import MacroRingGrid from '../ui/MacroRingGrid';
import FrostedCard from '../ui/FrostedCard';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
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
        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
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
        <FrostedCard style={{ padding: 20 }}>
          <MacroRingGrid
            macros={dailyMacros}
            targets={targetMacros}
            ringSize={52}
          />
        </FrostedCard>
      ) : (
        <View style={[{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 20, padding: 20 }, Shadows.MD]}>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Calories</Text>
                <CountingNumber value={dailyMacros.calories} suffix={`/${targetMacros.calories}`} delay={0} style={{ fontSize: 16, fontWeight: '600', ...getMacroColor(dailyMacros.calories, targetMacros.calories) }} />
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Protein</Text>
                <CountingNumber value={dailyMacros.protein} suffix={`g/${targetMacros.protein}g`} delay={100} style={{ fontSize: 16, fontWeight: '600', ...getMacroColor(dailyMacros.protein, targetMacros.protein) }} />
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Carbs</Text>
                <CountingNumber value={dailyMacros.carbs} suffix={`g/${targetMacros.carbs}g`} delay={200} style={{ fontSize: 16, fontWeight: '600', ...getMacroColor(dailyMacros.carbs, targetMacros.carbs) }} />
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Fat</Text>
                <CountingNumber value={dailyMacros.fat} suffix={`g/${targetMacros.fat}g`} delay={300} style={{ fontSize: 16, fontWeight: '600', ...getMacroColor(dailyMacros.fat, targetMacros.fat) }} />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}


export default React.memo(DailyMacrosSummary);
