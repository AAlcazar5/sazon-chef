// Tier Q — Beta build indicator.
//
// Small fixed badge rendered above the main content while a build is on
// the `preview` or `development` EAS channel. Disappears entirely on
// production. Tapping it opens the feedback sheet (wired from ProfileSheet).

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Brand } from '../../constants/tokens';
import { IS_BETA, BUILD_CHANNEL } from '../../constants/build';

interface BetaBadgeProps {
  onPress?: () => void;
}

export function BetaBadge({ onPress }: BetaBadgeProps) {
  const { isDark } = useTheme();
  if (!IS_BETA) return null;

  const bg = isDark ? Brand.dark.deep : Brand.light.base;
  const label = BUILD_CHANNEL === 'preview' ? 'BETA' : 'DEV';

  const inner = (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} build — tap to send feedback`}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return <View style={styles.container} pointerEvents="none">{inner}</View>;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={8}>
        {inner}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 9999,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    opacity: 0.85,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
