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

interface DailyRolloverDisplay {
  /** Calorie delta carried from yesterday. Positive = surplus, negative = deficit. */
  delta: number;
  /** ISO date key (YYYY-MM-DD) the delta was carried from. */
  fromDate: string;
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
  /** Optional calorie rollover carried in from yesterday (10G-B). */
  rollover?: DailyRolloverDisplay | null;
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
            <Text style={{ fontSize: 9, fontFamily: 'PlusJakartaSans_600SemiBold', color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
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
  rollover,
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
        <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Daily Macros - {formattedDate}
        </Text>
        <Icon
          name={macrosExpanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
          size={IconSizes.MD}
          color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
          accessibilityLabel={macrosExpanded ? "Collapse macros" : "Expand macros"}
        />
      </HapticTouchableOpacity>

      {rollover && rollover.delta !== 0 && (
        <View
          testID="daily-rollover-pill"
          accessibilityLabel={
            rollover.delta > 0
              ? `${rollover.delta} calorie surplus carried from yesterday`
              : `${Math.abs(rollover.delta)} calorie deficit to recover from yesterday`
          }
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: isDark
              ? rollover.delta > 0 ? PastelDark.sage : PastelDark.peach
              : rollover.delta > 0 ? Pastel.sage : Pastel.peach,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 100,
            marginBottom: 10,
          }}
        >
          <Icon
            name={rollover.delta > 0 ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
            size={IconSizes.SM}
            color={rollover.delta > 0 ? Accent.sage : Accent.peach}
          />
          <Text style={{
            fontSize: 12,
            fontFamily: 'PlusJakartaSans_700Bold',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}>
            {rollover.delta > 0 ? '+' : '−'}{Math.abs(rollover.delta)} cal {rollover.delta > 0 ? 'from yesterday' : 'to make up'}
          </Text>
        </View>
      )}

      {macrosExpanded ? (
        <View>
          {/* Ring on left, macro progress bars on right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing
                progress={calProgress}
                size={120}
                strokeWidth={10}
                color={[Accent.peach, '#FB923C']}
                testID="calorie-progress-ring"
              >
                <AnimatedLogoMascot expression={mascotExpression} size="small" animationType="idle" />
              </ProgressRing>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 4 }}>
                <CountingNumber
                  value={dailyMacros.calories}
                  delay={0}
                  style={{ fontSize: FontSize.xl, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                />
                <Text style={{ fontSize: FontSize.sm, color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  / {targetMacros.calories}
                </Text>
              </View>
              <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? DarkColors.text.secondary : Colors.text.secondary, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
                kcal
              </Text>
            </View>

            <View style={{ flex: 1, gap: 10 }}>
              {MACRO_WIDGET_CONFIG.filter(cfg => cfg.key !== 'calories').map((cfg) => {
                const value = dailyMacros[cfg.key] ?? 0;
                const target = targetMacros[cfg.key] ?? 0;
                const pct = target > 0 ? Math.min(1, value / target) : 0;
                return (
                  <HapticTouchableOpacity
                    key={cfg.key}
                    onPress={weeklyMacroData ? () => handleMacroCardPress(cfg.key) : undefined}
                    testID={`macro-bar-${cfg.key}`}
                    accessibilityLabel={`${cfg.label} ${value} of ${target}${cfg.unit}`}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                        {cfg.label}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                        {value}<Text style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>/{target}{cfg.unit}</Text>
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? cfg.tintDark : cfg.tint, overflow: 'hidden' }}>
                      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: cfg.accent, borderRadius: 3 }} />
                    </View>
                  </HapticTouchableOpacity>
                );
              })}
            </View>
          </View>

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
                fontFamily: 'PlusJakartaSans_600SemiBold',
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
                      fontFamily: 'PlusJakartaSans_700Bold',
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
              <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                Fiber
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <CountingNumber
                value={dailyMacros.fiber ?? 0}
                suffix="g"
                delay={0}
                style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? DarkColors.text.primary : Colors.text.primary }}
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
