// frontend/components/profile/ProfileStatWidgets.tsx
// Colorful stat widget grid + activity calendar heat map for the profile screen (9L).
// Replaces plain number stats with pastel-tinted widget cards and a visual activity grid.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import WidgetCard from '../ui/WidgetCard';
import WidgetGrid from '../ui/WidgetGrid';
import { CountingNumber } from '../ui/AnimatedStatCounter';
import ProgressRing from '../ui/ProgressRing';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';

interface ProfileStatWidgetsProps {
  savedRecipes: number;
  mealsCooked: number;
  mealPlans: number;
  /** Cooking activity data — array of dates (ISO strings) the user cooked */
  cookingDates?: string[];
  isDark: boolean;
  testID?: string;
}

/** Calculate streak from an array of date strings */
function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    d.setHours(0, 0, 0, 0);

    const diff = Math.round((checkDate.getTime() - d.getTime()) / (86400000));
    if (diff === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diff === 1 && i === 0) {
      // Allow yesterday as the start of a streak
      streak++;
      checkDate = new Date(d);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Activity calendar heat map — 4 weeks, 7 columns */
function ActivityCalendar({ cookingDates, isDark }: { cookingDates: string[]; isDark: boolean }) {
  const { weeks, today } = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const dateSet = new Set(cookingDates.map(d => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt.toISOString().split('T')[0];
    }));

    const todayStr = t.toISOString().split('T')[0];
    const ws: { date: Date; dateStr: string; isActive: boolean; isToday: boolean }[][] = [];

    // Build 4 weeks ending on today
    const endDay = t.getDay(); // 0=Sun
    const startDate = new Date(t);
    startDate.setDate(startDate.getDate() - (27 + endDay)); // 4 weeks back, aligned to Sun

    for (let w = 0; w < 4; w++) {
      const week: typeof ws[0] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = date.toISOString().split('T')[0];
        week.push({
          date,
          dateStr,
          isActive: dateSet.has(dateStr),
          isToday: dateStr === todayStr,
        });
      }
      ws.push(week);
    }

    return { weeks: ws, today: todayStr };
  }, [cookingDates]);

  const streak = calculateStreak(cookingDates);

  return (
    <View style={[
      styles.calendarContainer,
      { backgroundColor: isDark ? DarkColors.card : Colors.card },
      Shadows.SM,
    ]}>
      {/* Streak header */}
      <View style={styles.streakRow}>
        <Text style={{ fontSize: 22, marginRight: 4 }}>🔥</Text>
        <CountingNumber
          value={streak}
          style={{
            fontSize: FontSize['2xl'],
            fontWeight: FontWeight.extrabold,
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
        />
        <Text style={{
          fontSize: FontSize.base,
          fontWeight: FontWeight.medium,
          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
          marginLeft: 6,
        }}>
          day streak
        </Text>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
          <Text
            key={i}
            style={[
              styles.dayLabel,
              { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day) => {
            const isFuture = day.date > new Date();
            return (
              <View key={day.dateStr} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayDot,
                    day.isActive && { backgroundColor: Accent.sage },
                    !day.isActive && !isFuture && {
                      backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB',
                    },
                    isFuture && { backgroundColor: 'transparent' },
                    day.isToday && !day.isActive && {
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      opacity: 0.4,
                    },
                    day.isToday && day.isActive && {
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** "This Week vs Last Week" comparison cards */
function WeeklyComparison({ cookingDates, isDark }: { cookingDates: string[]; isDark: boolean }) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // This week: Mon-today
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - mondayOffset);

    // Last week: Mon-Sun
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

    const dateSet = new Set(cookingDates.map(d => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt.toISOString().split('T')[0];
    }));

    let thisWeekCount = 0;
    let lastWeekCount = 0;

    // Count this week
    for (let d = new Date(thisWeekStart); d <= today; d.setDate(d.getDate() + 1)) {
      if (dateSet.has(d.toISOString().split('T')[0])) thisWeekCount++;
    }

    // Count last week
    for (let d = new Date(lastWeekStart); d <= lastWeekEnd; d.setDate(d.getDate() + 1)) {
      if (dateSet.has(d.toISOString().split('T')[0])) lastWeekCount++;
    }

    // Unique recipes (unique dates as proxy since we don't have recipe IDs here)
    const allDates = [...dateSet].sort().reverse();
    const recentCount = allDates.slice(0, 7).length;

    const diff = thisWeekCount - lastWeekCount;

    return { thisWeekCount, lastWeekCount, diff, recentCount };
  }, [cookingDates]);

  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const cards = [
    {
      icon: '👨‍🍳',
      label: 'This Week',
      value: stats.thisWeekCount,
      sub: `vs ${stats.lastWeekCount} last week`,
      tint: isDark ? PastelDark.sage : Pastel.sage,
      trend: stats.diff !== 0 ? { direction: stats.diff > 0 ? 'up' as const : 'down' as const, value: `${Math.abs(stats.diff)}` } : undefined,
    },
    {
      icon: '📊',
      label: 'Active Days',
      value: stats.recentCount,
      sub: 'last 7 days',
      tint: isDark ? PastelDark.peach : Pastel.peach,
    },
  ];

  return (
    <View style={[styles.comparisonContainer, { marginTop: Spacing.md }]} testID="weekly-comparison">
      <Text style={{
        fontSize: FontSize.base,
        fontWeight: FontWeight.bold,
        color: textPrimary,
        marginBottom: Spacing.sm,
      }}>
        Weekly Progress
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.comparisonCard,
              { backgroundColor: card.tint },
              Shadows.SM,
            ]}
          >
            <Text style={{ fontSize: 18, marginBottom: 4 }}>{card.icon}</Text>
            <Text style={{ fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: textPrimary }}>
              {card.value}
            </Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: textSecondary, marginTop: 2 }}>
              {card.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
              {card.trend && (
                <Text style={{
                  fontSize: FontSize.xs,
                  fontWeight: FontWeight.bold,
                  color: card.trend.direction === 'up' ? Accent.sage : Accent.blush,
                }}>
                  {card.trend.direction === 'up' ? '↑' : '↓'}{card.trend.value}
                </Text>
              )}
              <Text style={{ fontSize: FontSize.xs, color: textSecondary }}>{card.sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileStatWidgets({
  savedRecipes,
  mealsCooked,
  mealPlans,
  cookingDates = [],
  isDark,
  testID,
}: ProfileStatWidgetsProps) {
  const streak = calculateStreak(cookingDates);

  return (
    <View style={styles.container} testID={testID}>
      {/* 2×2 stat widget grid */}
      <WidgetGrid style={{ marginBottom: Spacing.md }} testID="profile-widget-grid">
        <WidgetCard
          tint={Pastel.golden}
          tintDark={PastelDark.golden}
          icon="🔥"
          statValue={streak}
          statUnit="days"
          label="Day Streak"
          testID="widget-streak"
        />
        <WidgetCard
          tint={Pastel.sage}
          tintDark={PastelDark.sage}
          icon="👨‍🍳"
          statValue={mealsCooked}
          label="Recipes Cooked"
          testID="widget-cooked"
        />
        <WidgetCard
          tint={Pastel.sky}
          tintDark={PastelDark.sky}
          icon="📚"
          statValue={savedRecipes}
          label="In Cookbook"
          testID="widget-saved"
        />
        <WidgetCard
          tint={Pastel.peach}
          tintDark={PastelDark.peach}
          icon="📋"
          statValue={mealPlans}
          label="Meal Plans"
          testID="widget-plans"
        />
      </WidgetGrid>

      {/* Activity calendar heat map */}
      {cookingDates.length > 0 && (
        <ActivityCalendar cookingDates={cookingDates} isDark={isDark} />
      )}

      {/* Weekly comparison cards */}
      {cookingDates.length > 0 && (
        <WeeklyComparison cookingDates={cookingDates} isDark={isDark} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  calendarContainer: {
    borderRadius: BorderRadius.card,
    padding: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  comparisonContainer: {
    marginTop: 16,
  },
  comparisonCard: {
    flex: 1,
    borderRadius: BorderRadius.card,
    padding: 14,
  },
});
