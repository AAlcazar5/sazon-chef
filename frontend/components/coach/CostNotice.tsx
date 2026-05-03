// Phase 8 (10Y-E): amber notice rendered above the coach message stream when
// the Pro user has crossed today's token budget and Sazon has temporarily
// downgraded to Sonnet for the rest of the UTC day.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark } from '../../constants/Colors';

interface CostNoticeProps {
  message: string | null;
}

export default function CostNotice({ message }: CostNoticeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!message) return null;

  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const text = isDark ? '#FFE0B2' : '#7C2D12';

  return (
    <View style={styles.wrap}>
      <View
        accessibilityRole="alert"
        accessibilityLabel="Coach is at reduced power until tomorrow"
        style={[styles.pill, { backgroundColor: bg }]}
      >
        <Ionicons name="time-outline" size={14} color={text} />
        <Text style={[styles.text, { color: text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    maxWidth: '100%',
  },
  text: {
    flex: 1,
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 12,
    lineHeight: 16,
  },
});
