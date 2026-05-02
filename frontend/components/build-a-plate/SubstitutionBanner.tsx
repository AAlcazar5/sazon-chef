// frontend/components/build-a-plate/SubstitutionBanner.tsx
// Group 10X Phase 8 — Sage banner shown when a deep-linked plate has missing pantry items.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

interface SubstitutionBannerProps {
  substitutionsCount: number;
  onShowOriginal: () => void;
  testID?: string;
}

export default function SubstitutionBanner({
  substitutionsCount,
  onShowOriginal,
  testID,
}: SubstitutionBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (substitutionsCount <= 0) return null;

  const copy = `Missing ${substitutionsCount} from your pantry — we picked similar items in your kitchen.`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(129,199,132,0.12)' : Pastel.sage },
        Shadows.SM as any,
      ]}
      testID={testID}
      accessibilityLabel={copy}
    >
      <Text style={[styles.body, { color: isDark ? '#A6E0A8' : '#2E5931' }]}>
        {copy}
      </Text>
      <HapticTouchableOpacity
        onPress={onShowOriginal}
        hapticStyle="light"
        pressedScale={0.97}
        style={styles.link}
        accessibilityLabel="Show the original plate the friend shared"
        testID={testID ? `${testID}-show-original` : undefined}
      >
        <Text style={styles.linkText}>Show original</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.card,
  },
  body: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#2E5931',
    textDecorationLine: 'underline',
  },
});
