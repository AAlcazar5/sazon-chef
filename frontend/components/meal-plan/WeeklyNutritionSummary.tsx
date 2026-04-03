// frontend/components/meal-plan/WeeklyNutritionSummary.tsx
// Weekly nutrition summary with pastel macro bars + daily stacked bar trend chart (9L)

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { FontSize, FontWeight } from '../../constants/Typography';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';

interface WeeklyNutritionSummaryProps {
  weeklyNutrition: any;
  /** Full weekly plan to extract per-day macros */
  weeklyPlan?: any;
  /** Current week dates */
  weekDates?: Date[];
  isDark: boolean;
}

const MACRO_BAR_CONFIG = [
  { key: 'protein', label: 'Protein', accent: Accent.sage, tint: Pastel.sage, tintDark: PastelDark.sage },
  { key: 'carbs', label: 'Carbs', accent: Accent.golden, tint: Pastel.golden, tintDark: PastelDark.golden },
  { key: 'fat', label: 'Fat', accent: Accent.lavender, tint: Pastel.lavender, tintDark: PastelDark.lavender },
] as const;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Extract per-day macro totals from weeklyPlan */
function extractDailyMacros(weeklyPlan: any, weekDates: Date[]): { protein: number; carbs: number; fat: number }[] {
  return weekDates.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
    let protein = 0, carbs = 0, fat = 0;

    const addMeal = (meal: any) => {
      if (!meal?.recipe) return;
      protein += meal.recipe.protein || 0;
      carbs += meal.recipe.carbs || 0;
      fat += meal.recipe.fat || 0;
    };

    addMeal(dayData.breakfast);
    addMeal(dayData.lunch);
    addMeal(dayData.dinner);
    if (Array.isArray(dayData.snacks)) {
      dayData.snacks.forEach(addMeal);
    }

    return { protein, carbs, fat };
  });
}

/** Stacked bar chart for daily macro distribution */
function DailyMacroTrend({
  dailyMacros,
  isDark,
}: {
  dailyMacros: { protein: number; carbs: number; fat: number }[];
  isDark: boolean;
}) {
  const maxTotal = useMemo(() => {
    const totals = dailyMacros.map(d => d.protein + d.carbs + d.fat);
    return Math.max(...totals, 1);
  }, [dailyMacros]);

  const barWidth = 28;
  const barGap = 8;
  const chartHeight = 80;
  const totalWidth = dailyMacros.length * (barWidth + barGap) - barGap;

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
        marginBottom: 8,
      }}>
        Daily Macro Distribution
      </Text>

      <View style={{ alignItems: 'center' }}>
        <Svg width={totalWidth} height={chartHeight}>
          {dailyMacros.map((day, i) => {
            const total = day.protein + day.carbs + day.fat;
            if (total === 0) return null;
            const scale = chartHeight / maxTotal;
            const x = i * (barWidth + barGap);

            // Stack: protein (bottom) → carbs (middle) → fat (top)
            const proteinH = day.protein * scale;
            const carbsH = day.carbs * scale;
            const fatH = day.fat * scale;

            return (
              <React.Fragment key={i}>
                {/* Protein — bottom */}
                <Rect
                  x={x}
                  y={chartHeight - proteinH}
                  width={barWidth}
                  height={proteinH}
                  rx={4}
                  fill={Accent.sage}
                />
                {/* Carbs — middle */}
                <Rect
                  x={x}
                  y={chartHeight - proteinH - carbsH}
                  width={barWidth}
                  height={carbsH}
                  rx={4}
                  fill={Accent.golden}
                />
                {/* Fat — top */}
                <Rect
                  x={x}
                  y={chartHeight - proteinH - carbsH - fatH}
                  width={barWidth}
                  height={fatH}
                  rx={4}
                  fill={Accent.lavender}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Day labels */}
        <View style={{ flexDirection: 'row', width: totalWidth, marginTop: 4 }}>
          {dailyMacros.map((_, i) => (
            <Text
              key={i}
              style={{
                width: barWidth + barGap,
                textAlign: 'center',
                fontSize: 9,
                fontWeight: '600',
                color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
              }}
            >
              {DAY_LABELS[i] || ''}
            </Text>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        {MACRO_BAR_CONFIG.map(cfg => (
          <View key={cfg.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: cfg.accent }} />
            <Text style={{ fontSize: 10, color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              {cfg.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WeeklyNutritionSummary({
  weeklyNutrition,
  weeklyPlan,
  weekDates,
  isDark,
}: WeeklyNutritionSummaryProps) {
  if (!weeklyNutrition) return null;

  const dailyMacros = useMemo(() => {
    if (!weeklyPlan || !weekDates || weekDates.length < 7) return null;
    return extractDailyMacros(weeklyPlan, weekDates);
  }, [weeklyPlan, weekDates]);

  return (
    <View className="px-4 mb-4">
      <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? DarkColors.text.primary : Colors.text.primary, marginBottom: 12 }}>
        Weekly Nutrition Summary
      </Text>
      <View style={[{
        backgroundColor: isDark ? DarkColors.card : Colors.card,
        borderRadius: BorderRadius.card,
        padding: 20,
      }, Shadows.SM]}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm text-gray-600 dark:text-gray-200">
            {weeklyNutrition.period.days} days
          </Text>
          <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
            {weeklyNutrition.completed.completionRate.toFixed(0)}% Complete
          </Text>
        </View>

        {/* Calories Progress */}
        {weeklyNutrition.goals && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Weekly Calories</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {weeklyNutrition.totals.calories.toLocaleString()} / {weeklyNutrition.goals.weeklyCalories.toLocaleString()}
              </Text>
            </View>
            <AnimatedProgressBar
              progress={Math.min((weeklyNutrition.totals.calories / weeklyNutrition.goals.weeklyCalories) * 100, 100)}
              height={10}
              borderRadius={5}
              backgroundColor={isDark ? '#2C2C2E' : '#E5E7EB'}
              progressColor={Accent.peach}
            />
          </View>
        )}

        {/* Macro Breakdown — pastel bars */}
        <View className="mb-2">
          <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: isDark ? DarkColors.text.secondary : Colors.text.secondary, marginBottom: 10 }}>
            Macro Breakdown
          </Text>
          <View className="flex-row justify-between space-x-2">
            {MACRO_BAR_CONFIG.map(cfg => {
              const total = weeklyNutrition.totals[cfg.key] || 0;
              const goalKey = `weekly${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)}` as string;
              const goal = weeklyNutrition.goals?.[goalKey] || total * 1.2;
              const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;

              return (
                <View key={cfg.key} className="flex-1 items-center">
                  <View className="relative w-full mb-2" style={{ height: 80 }}>
                    <View style={{
                      position: 'absolute', bottom: 0, width: '100%', height: '100%',
                      backgroundColor: isDark ? cfg.tintDark : cfg.tint,
                      borderRadius: 6,
                    }} />
                    <View style={{
                      position: 'absolute', bottom: 0, width: '100%',
                      height: `${pct}%`,
                      backgroundColor: cfg.accent,
                      borderRadius: 6,
                    }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.accent }}>
                    {total.toFixed(0)}g
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{cfg.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Daily Macro Trend Chart */}
        {dailyMacros && <DailyMacroTrend dailyMacros={dailyMacros} isDark={isDark} />}

        {/* Meal Completion */}
        <View style={{ marginTop: 12, paddingTop: 12 }}>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Meal Completion</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {weeklyNutrition.completed.mealsCompleted} / {weeklyNutrition.completed.totalMeals}
            </Text>
          </View>
          <AnimatedProgressBar
            progress={weeklyNutrition.completed.completionRate}
            height={8}
            borderRadius={4}
            backgroundColor={isDark ? '#2C2C2E' : '#E5E7EB'}
            progressColor={Accent.sage}
          />
        </View>
      </View>
    </View>
  );
}
