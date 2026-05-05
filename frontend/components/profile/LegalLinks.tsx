// frontend/components/profile/LegalLinks.tsx
// ROADMAP 4.0 E7 — Privacy + ToS rows. Tap → Linking.openURL.
// Hosted URLs come from EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TOS_URL
// (set per `plans/launch-checklist.md`); falls back to sazonchef.com.

import React from 'react';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://sazonchef.com/privacy';
export const TOS_URL = process.env.EXPO_PUBLIC_TOS_URL ?? 'https://sazonchef.com/terms';

interface LegalLinksProps {
  /** Optional override for testing — defaults to RN's Linking. */
  openURL?: (url: string) => Promise<unknown>;
}

interface RowProps {
  testID: string;
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap;
  label: string;
  url: string;
  isDark: boolean;
  openURL: (url: string) => Promise<unknown>;
}

function Row({ testID, icon, label, url, isDark, openURL }: RowProps) {
  return (
    <HapticTouchableOpacity
      testID={testID}
      onPress={() => {
        openURL(url).catch(() => {});
      }}
      accessibilityRole="link"
      accessibilityLabel={label}
      pressedScale={0.98}
      style={[
        styles.row,
        { backgroundColor: isDark ? DarkColors.card : '#FFFFFF' },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: isDark ? PastelDark.sky : Pastel.sky },
        ]}
      >
        <Ionicons name={icon} size={18} color={Accent.sky} />
      </View>
      <Text
        style={[
          styles.label,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name="open-outline"
        size={16}
        color={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
      />
    </HapticTouchableOpacity>
  );
}

export default function LegalLinks({ openURL }: LegalLinksProps = {}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const open = openURL ?? Linking.openURL.bind(Linking);

  return (
    <View testID="legal-links" style={styles.group}>
      <Row
        testID="legal-links-privacy"
        icon="shield-checkmark-outline"
        label="Privacy Policy"
        url={PRIVACY_URL}
        isDark={isDark}
        openURL={open}
      />
      <Row
        testID="legal-links-tos"
        icon="document-text-outline"
        label="Terms of Service"
        url={TOS_URL}
        isDark={isDark}
        openURL={open}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
  },
});
