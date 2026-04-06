// frontend/components/meal-plan/DailyMacrosSummary.tsx
// Colorful macro widget grid with pastel-tinted cards and calorie progress ring (9L).
// Collapsed: compact 2×2 pastel widget grid. Expanded: full ring grid.

import React, { useState, useMemo } from 'react';
import { View, Text, ViewStyle, LayoutAnimation, Platform, UIManager } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { CountingNumber } from '../ui/AnimatedStatCounter';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import WidgetCard from '../ui/WidgetCard';
import WidgetGrid from '../ui/WidgetGrid';
import ProgressRing from '../ui/ProgressRing';
import { AnimatedLogoMascot } from '../mascot';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent, MACRO_COLORS } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface DailyMacrosSummaryProps {
  dailyMacros: MacroData;
  targetMacros: MacroData;
  formattedDate: string;
  macrosExpanded: boolean;
  isDark: boolean;
  onToggleExpanded: () => void;
  getMacroColor: (current: number, target: number) => { color: string };
  /** Weekly plan data for sparkline charts */
  weeklyPlan?: any;
  /** Week dates for extracting daily values */
  weekDates?: Date[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Extract per-day values for a single macro from the weekly plan */
function extractWeeklyMacroValues(weeklyPlan: any, weekDates: Date[], macroKey: keyof MacroData): number[] {
  return weekDates.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
    let total = 0;

    const addMeal = (meal: any) => {
      if (!meal?.recipe) return;
      total += meal.recipe[macroKey] || 0;
    };

    addMeal(dayData.breakfast);
    addMeal(dayData.lunch);
    addMeal(dayData.dinner);
    if (Array.isArray(dayData.snacks)) {
      dayData.snacks.forEach(addMeal);
    }

    return total;
  });
}

/** Mini sparkline chart for a macro's weekly trend */
function MacroSparkline({
  values,
  accent,
  isDark,
  unit,
}: {
  values: number[];
  accent: string;
  isDark: boolean;
  unit: string;
}) {
  const width = 200;
  const height = 48;
  const padding = 8;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * plotW;
    const y = padding + plotH - (v / max) * plotH;
    return { x, y, value: v };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ marginTop: 8, alignItems: 'center' }} testID="macro-sparkline">
      <Svg width={width} height={height}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots on each data point */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={accent} />
        ))}
      </Svg>
      {/* Day labels + values */}
      <View style={{ flexDirection: 'row', width, paddingHorizontal: padding, justifyContent: 'space-between' }}>
        {values.map((v, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
              {DAY_LABELS[i] || ''}
            </Text>
            <Text style={{ fontSize: 8, color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
              {v > 0 ? `${Math.round(v)}${unit}` : '-'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const MACRO_WIDGET_CONFIG = [
  { key: 'calories' as const, icon: '🔥', label: 'Calories', unit: 'kcal', tint: Pastel.peach, tintDark: PastelDark.peach, accent: Accent.peach },
  { key: 'protein' as const, icon: '🥩', label: 'Protein', unit: 'g', tint: Pastel.sage, tintDark: PastelDark.sage, accent: Accent.sage },
  { key: 'carbs' as const, icon: '🌾', label: 'Carbs', unit: 'g', tint: Pastel.golden, tintDark: PastelDark.golden, accent: Accent.golden },
  { key: 'fat' as const, icon: '🥑', label: 'Fat', unit: 'g', tint: Pastel.lavender, tintDark: PastelDark.lavender, accent: Accent.lavender },
  { key: 'fiber' as const, icon: '🌿', label: 'Fiber', unit: 'g', tint: Pastel.sky, tintDark: PastelDark.sky, accent: Accent.sky },
];

function DailyMacrosSummary({
  dailyMacros,
  targetMacros,
  formattedDate,
  macrosExpanded,
  isDark,
  onToggleExpanded,
  getMacroColor,
  weeklyPlan,
  weekDates,
}: DailyMacrosSummaryProps) {
  const [expandedMacro, setExpandedMacro] = useState<keyof MacroData | null>(null);

  const weeklyMacroData = useMemo(() => {
    if (!weeklyPlan || !weekDates || weekDates.length < 7) return null;
    return {
      protein: extractWeeklyMacroValues(weeklyPlan, weekDates, 'protein'),
      carbs: extractWeeklyMacroValues(weeklyPlan, weekDates, 'carbs'),
      fat: extractWeeklyMacroValues(weeklyPlan, weekDates, 'fat'),
      calories: extractWeeklyMacroValues(weeklyPlan, weekDates, 'calories'),
      fiber: extractWeeklyMacroValues(weeklyPlan, weekDates, 'fiber'),
    };
  }, [weeklyPlan, weekDates]);

  const handleMacroCardPress = (key: keyof MacroData) => {
    if (!weeklyMacroData) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    HapticPatterns.buttonPress();
    setExpandedMacro(prev => prev === key ? null : key);
  };

  const calProgress = targetMacros.calories > 0
    ? dailyMacros.calories / targetMacros.calories
    : 0;

  // Determine mascot expression based on calorie progress
  const mascotExpression = calProgress >= 0.9
    ? 'chef-kiss' as const
    : calProgress >= 0.5
      ? 'happy' as const
      : 'thinking' as const;

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
        <View>
          {/* Calorie progress ring */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ProgressRing
              progress={calProgress}
              size={120}
              strokeWidth={10}
              color={[Accent.peach, '#FB923C']}
              testID="calorie-progress-ring"
            >
              <AnimatedLogoMascot expression={mascotExpression} size="tiny" animationType="idle" />
            </ProgressRing>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 4 }}>
              <CountingNumber
                value={dailyMacros.calories}
                delay={0}
                style={{ fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: isDark ? DarkColors.text.primary : Colors.text.primary }}
              />
              <Text style={{ fontSize: FontSize.sm, color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                / {targetMacros.calories} kcal
              </Text>
            </View>
          </View>

          {/* 2×2 macro widget grid */}
          <WidgetGrid testID="macro-widget-grid">
            {MACRO_WIDGET_CONFIG.map((cfg) => (
              <WidgetCard
                key={cfg.key}
                tint={cfg.tint}
                tintDark={cfg.tintDark}
                icon={cfg.icon}
                statValue={dailyMacros[cfg.key] ?? 0}
                statUnit={cfg.unit}
                label={cfg.label}
                onPress={weeklyMacroData ? () => handleMacroCardPress(cfg.key) : undefined}
                testID={`widget-${cfg.key}`}
              />
            ))}
          </WidgetGrid>

          {/* Sparkline disclosure */}
          {expandedMacro && weeklyMacroData && (
            <View style={[{
              backgroundColor: isDark ? DarkColors.card : Colors.card,
              borderRadius: BorderRadius.card,
              padding: 14,
              marginTop: 12,
            }, Shadows.SM]} testID="sparkline-container">
              <Text style={{
                fontSize: FontSize.sm,
                fontWeight: FontWeight.semibold,
                color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                marginBottom: 4,
              }}>
                {MACRO_WIDGET_CONFIG.find(c => c.key === expandedMacro)?.label} — Weekly Trend
              </Text>
              <MacroSparkline
                values={weeklyMacroData[expandedMacro]}
                accent={MACRO_WIDGET_CONFIG.find(c => c.key === expandedMacro)?.accent || Accent.sage}
                isDark={isDark}
                unit={expandedMacro === 'calories' ? '' : 'g'}
              />
            </View>
          )}
        </View>
      ) : (
        /* Compact collapsed view — pastel mini cards (4-card row + fiber full-width) */
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MACRO_WIDGET_CONFIG.filter(cfg => cfg.key !== 'fiber').map((cfg) => {
              const value = dailyMacros[cfg.key];
              const target = targetMacros[cfg.key];
              return (
                <View
                  key={cfg.key}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? cfg.tintDark : cfg.tint,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    {cfg.label}
                  </Text>
                  <CountingNumber
                    value={value}
                    suffix={cfg.key === 'calories' ? '' : 'g'}
                    delay={0}
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: isDark ? DarkColors.text.primary : Colors.text.primary,
                    }}
                  />
                  <Text style={{ fontSize: 9, color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary, marginTop: 1 }}>
                    / {target}{cfg.key === 'calories' ? '' : 'g'}
                  </Text>
                </View>
              );
            })}
          </View>
          {/* Fiber — full-width compact pill */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
            borderRadius: 14,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>🌿</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                Fiber
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <CountingNumber
                value={dailyMacros.fiber ?? 0}
                suffix="g"
                delay={0}
                style={{ fontSize: 15, fontWeight: '700', color: isDark ? DarkColors.text.primary : Colors.text.primary }}
              />
              <Text style={{ fontSize: 10, color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
                / {targetMacros.fiber ?? 25}g
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default React.memo(DailyMacrosSummary);
