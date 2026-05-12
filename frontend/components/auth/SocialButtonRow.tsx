// frontend/components/auth/SocialButtonRow.tsx
// Shared "OR" divider + Google/Apple sign-in buttons for auth screens.
// Extracted from login.tsx + register.tsx (DRY — was ~55 lines duplicated).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Hairline, Ink, Surface, Radius } from '../../constants/tokens';
import { Shadows } from '../../constants/Shadows';
import { FontSize } from '../../constants/Typography';
import { Spacing } from '../../constants/Spacing';

export interface SocialButtonRowProps {
  onGoogle: () => void;
  onApple: () => void;
  disabled?: boolean;
  /** Stagger delay for the entrance animation (default 0). */
  delay?: number;
}

export default function SocialButtonRow({
  onGoogle,
  onApple,
  disabled = false,
  delay = 0,
}: SocialButtonRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const dividerColor = isDark ? Hairline.dark.hairline : Hairline.light.hairline;
  const orTextColor = isDark ? Ink.dark.tertiary : Ink.light.tertiary;
  const buttonBg = isDark ? Surface.dark.raised : Surface.light.base;
  const labelColor = isDark ? Ink.dark.primary : Ink.light.primary;
  const appleLogoColor = isDark ? Ink.dark.primary : Ink.light.primary;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay, damping: 20, stiffness: 180 }}
    >
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
        <Text style={[styles.dividerText, { color: orTextColor }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
      </View>

      <View style={styles.buttonStack}>
        <HapticTouchableOpacity
          style={[styles.socialButton, { backgroundColor: buttonBg }, Shadows.SM as any]}
          onPress={onGoogle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={[styles.socialLabel, { color: labelColor }]}>
            Continue with Google
          </Text>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          style={[styles.socialButton, { backgroundColor: buttonBg }, Shadows.SM as any]}
          onPress={onApple}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Ionicons name="logo-apple" size={20} color={appleLogoColor} />
          <Text style={[styles.socialLabel, { color: labelColor }]}>
            Continue with Apple
          </Text>
        </HapticTouchableOpacity>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg + 4, // 20
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.lg,
    fontSize: FontSize.sm,
  },
  buttonStack: {
    gap: Spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    minHeight: 50,
  },
  socialLabel: {
    marginLeft: 10,
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
