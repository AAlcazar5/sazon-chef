// frontend/components/meal-plan/BoringWeekNudge.tsx
// 10J — Variety Enforcer: subtle nudge shown when the weekly variety score < 40.
// Tapping "Mix it up" invokes the provided callback to regenerate repetitive meals.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { AnimatedLogoMascot } from '../mascot';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';

interface BoringWeekNudgeProps {
  message: string;
  varietyScore: number;
  isDark: boolean;
  onMixItUp: () => void;
  onDismiss?: () => void;
}

function BoringWeekNudge({
  message,
  varietyScore,
  isDark,
  onMixItUp,
  onDismiss,
}: BoringWeekNudgeProps) {
  const bgTint = isDark ? PastelDark.peach : Pastel.peach;
  const textColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subTextColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Variety nudge. Score ${varietyScore} out of 100.`}
      style={[styles.container, { backgroundColor: bgTint }, Shadows.SM]}
    >
      <View style={styles.header}>
        <AnimatedLogoMascot size="small" expression="curious" />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: textColor }]}>{message}</Text>
          <Text style={[styles.score, { color: subTextColor }]}>
            Variety score: {varietyScore}/100
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onDismiss ? (
          <HapticTouchableOpacity
            style={[styles.dismissBtn]}
            onPress={onDismiss}
            accessibilityLabel="Dismiss variety nudge"
          >
            <Text style={[styles.dismissText, { color: subTextColor }]}>Not now</Text>
          </HapticTouchableOpacity>
        ) : null}
        <HapticTouchableOpacity
          style={[styles.cta, { backgroundColor: Accent.peach }]}
          onPress={onMixItUp}
          accessibilityLabel="Mix up repetitive meals"
        >
          <Text style={styles.ctaText}>Mix it up</Text>
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

export default BoringWeekNudge;

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textCol: {
    flex: 1,
    paddingLeft: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  score: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dismissBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  cta: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
  },
  ctaText: {
    color: Colors.text.inverse,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
