// frontend/components/meal-plan/CarryOverBadge.tsx
// ROADMAP 4.0 WK2.2 — "Cook once, eat twice" UI provenance.
//
// Renders a small inline badge on a meal card whenever the meal is part of
// a carry-over chain (planned by WK2.1 LeftoverContinuityPlanner). Tapping
// the badge expands a chain-detail block that lists the cook day + each
// leftover eat day. When `onUncouple` is provided + role === 'leftover',
// the user can break the chain for that day only (rest of the plan stays
// intact).
//
// Lifestyle voice: "Sunday's chili pulls double-duty" — never "leftover
// warning" or "carry-over restriction." Banned-vocabulary corpus is
// asserted by the test.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

export interface CarryOverChain {
  recipeName: string;
  /** ISO date (yyyy-mm-dd) the recipe is cooked. */
  cookOnDay: string;
  /** ISO dates (yyyy-mm-dd) the leftovers are eaten. */
  eatOnDays: string[];
}

export type CarryOverRole = 'cook' | 'leftover';

interface CarryOverBadgeProps {
  chain: CarryOverChain;
  role: CarryOverRole;
  /** ISO date of the meal slot this badge instance is rendered on. Required for uncouple. */
  currentDay?: string;
  /** Optional uncouple callback — when invoked, the consumer should drop
   *  the link between the source cook + the supplied day. */
  onUncouple?: (day: string) => void;
}

function formatDayLabel(iso: string): string {
  // Use a simple weekday format; if Date parsing fails, fall back to the iso string.
  try {
    const d = new Date(`${iso}T00:00:00`);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    return weekday || iso;
  } catch {
    return iso;
  }
}

function CarryOverBadge({
  chain,
  role,
  currentDay,
  onUncouple,
}: CarryOverBadgeProps) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const tint = isDark ? PastelDark.golden : Pastel.golden;
  const accent = Accent.golden;
  const textColor = isDark ? Colors.text.inverse : Colors.text.primary;
  const subTextColor = isDark ? Colors.text.tertiary : Colors.text.secondary;

  const cookLabel = formatDayLabel(chain.cookOnDay);
  const headlineCopy =
    role === 'cook'
      ? `${chain.recipeName} pulls double-duty`
      : `${chain.recipeName} from ${cookLabel}`;
  const a11yLabel =
    role === 'cook'
      ? `Cook once, eat twice. ${chain.recipeName} carries over to ${chain.eatOnDays.length} more meals.`
      : `${chain.recipeName} carries over from ${cookLabel}. Tap to view chain.`;

  const allDays = [
    { day: chain.cookOnDay, kind: 'cook' as const },
    ...chain.eatOnDays.map((d) => ({ day: d, kind: 'eat' as const })),
  ];

  return (
    <View>
      <HapticTouchableOpacity
        testID="carry-over-badge"
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={() => setExpanded((v) => !v)}
        style={[styles.pill, { backgroundColor: tint }, Shadows.SM]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text
          numberOfLines={1}
          style={[styles.pillText, { color: textColor }]}
        >
          {headlineCopy}
        </Text>
      </HapticTouchableOpacity>

      {expanded ? (
        <View
          testID="carry-over-chain-detail"
          style={[styles.detail, { backgroundColor: tint }, Shadows.SM]}
        >
          {allDays.map(({ day, kind }) => (
            <View
              key={`${kind}-${day}`}
              testID={`carry-over-day-${day}`}
              style={styles.dayRow}
            >
              <Text style={[styles.dayKind, { color: subTextColor }]}>
                {kind === 'cook' ? 'Cook' : 'Eat'}
              </Text>
              <Text style={[styles.dayLabel, { color: textColor }]}>
                {formatDayLabel(day)}
              </Text>
            </View>
          ))}

          {onUncouple && currentDay ? (
            <HapticTouchableOpacity
              testID="carry-over-uncouple"
              accessibilityLabel="Skip the carry-over for this day"
              onPress={() => onUncouple(currentDay)}
              style={styles.uncoupleBtn}
            >
              <Text style={[styles.uncoupleText, { color: accent }]}>
                Skip this day
              </Text>
            </HapticTouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default CarryOverBadge;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 100,
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: FontSize.xs,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  detail: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    gap: Spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayKind: {
    fontSize: FontSize.xs,
    fontFamily: 'PlusJakartaSans_500Medium',
    minWidth: 36,
  },
  dayLabel: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  uncoupleBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  uncoupleText: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
