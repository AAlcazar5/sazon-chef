// frontend/components/meal-plan/WeekMacroBar.tsx
// Compact 7-day macro summary at the top of the meal plan view.
// Shows: Protein / Carbs / Fat / Fiber / Calories — fiber is the 5th macro.

import { View, Text } from 'react-native';
import { useState } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';

interface MacroTarget {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

interface WeekMacroBarProps {
  /** Weekly totals from all planned meals */
  weeklyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  /** Daily targets (will be multiplied by 7 for weekly comparison) */
  dailyTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  /** Number of days in the plan (default 7) */
  days?: number;
}

function getStatusColor(ratio: number, isDark: boolean): string {
  // Green: on target ±10%, Yellow: slightly off, Red: significantly off
  if (ratio >= 0.9 && ratio <= 1.1) return isDark ? '#34D399' : '#059669'; // green
  if (ratio >= 0.7 && ratio <= 1.3) return isDark ? '#FBBF24' : '#D97706'; // yellow
  return isDark ? '#F87171' : '#DC2626'; // red
}

const FIBER_EXPLAINER =
  'Fiber feeds your gut microbiome, slows sugar absorption, and is linked to lower colon cancer risk. Most adults get less than half the recommended amount.';

export default function WeekMacroBar({
  weeklyTotals,
  dailyTargets = { calories: 2000, protein: 150, carbs: 200, fat: 67, fiber: 30 },
  days = 7,
}: WeekMacroBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);

  const weeklyTargets = {
    calories: dailyTargets.calories * days,
    protein: dailyTargets.protein * days,
    carbs: dailyTargets.carbs * days,
    fat: dailyTargets.fat * days,
    fiber: dailyTargets.fiber * days,
  };

  const macros: MacroTarget[] = [
    { label: 'Protein', current: weeklyTotals.protein, target: weeklyTargets.protein, unit: 'g', color: '#8B5CF6' },
    { label: 'Carbs', current: weeklyTotals.carbs, target: weeklyTargets.carbs, unit: 'g', color: '#F59E0B' },
    { label: 'Fat', current: weeklyTotals.fat, target: weeklyTargets.fat, unit: 'g', color: '#EF4444' },
    { label: 'Fiber', current: weeklyTotals.fiber, target: weeklyTargets.fiber, unit: 'g', color: '#10B981' },
    { label: 'Cal', current: weeklyTotals.calories, target: weeklyTargets.calories, unit: '', color: '#3B82F6' },
  ];

  return (
    <View
      className="mx-4 mt-3 mb-2 rounded-2xl p-3"
      style={{ backgroundColor: isDark ? DarkColors.card : Colors.surface }}
    >
      <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2.5">
        Weekly Nutrition
      </Text>
      <View className="flex-row" style={{ gap: 6 }}>
        {macros.map((m) => {
          const ratio = m.target > 0 ? m.current / m.target : 0;
          const pct = Math.min(100, Math.round(ratio * 100));
          const statusColor = getStatusColor(ratio, isDark);
          const isFiber = m.label === 'Fiber';
          const isExpanded = expandedMacro === m.label;

          return (
            <HapticTouchableOpacity
              key={m.label}
              onPress={() => setExpandedMacro(isExpanded ? null : m.label)}
              style={{ flex: 1, alignItems: 'center' }}
              hapticStyle="light"
              pressedScale={0.95}
              accessibilityLabel={`${m.label}: ${Math.round(m.current)}${m.unit} of ${Math.round(m.target)}${m.unit}`}
            >
              {/* Progress bar */}
              <View
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: statusColor,
                  }}
                />
              </View>

              {/* Label */}
              <Text
                className="mt-1"
                style={{
                  fontSize: 10,
                  fontWeight: isFiber ? '700' : '600',
                  color: isFiber ? statusColor : (isDark ? '#9CA3AF' : '#6B7280'),
                }}
              >
                {m.label}
              </Text>

              {/* Value */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isDark ? '#E5E7EB' : '#1F2937',
                  marginTop: 1,
                }}
              >
                {Math.round(m.current / days)}{m.unit}
              </Text>

              <Text
                style={{
                  fontSize: 9,
                  color: isDark ? '#6B7280' : '#9CA3AF',
                }}
              >
                /{Math.round(m.target / days)}{m.unit}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>

      {/* Expanded explainer (fiber-specific) */}
      {expandedMacro === 'Fiber' && (
        <View
          className="mt-3 rounded-xl p-3"
          style={{ backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }}
        >
          <Text style={{ fontSize: 12, lineHeight: 18, color: isDark ? '#A7F3D0' : '#065F46' }}>
            {FIBER_EXPLAINER}
          </Text>
        </View>
      )}
    </View>
  );
}
