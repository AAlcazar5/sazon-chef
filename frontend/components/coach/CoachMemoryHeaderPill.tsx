// Phase 6 (10Y-C): Header pill above coach messages — only renders for Pro
// users with at least one memory. Tap routes to /profile/coach-memory.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark } from '../../constants/Colors';

interface CoachMemoryHeaderPillProps {
  count: number;
  onPress: () => void;
}

export default function CoachMemoryHeaderPill({
  count,
  onPress,
}: CoachMemoryHeaderPillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (count <= 0) return null;

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const text = isDark ? '#E8F5E9' : '#1B5E20';
  const subtle = isDark ? '#A5D6A7' : '#2E7D32';
  const noteWord = count === 1 ? 'note' : 'notes';

  return (
    <View style={styles.wrap}>
      <HapticTouchableOpacity
        onPress={onPress}
        accessibilityLabel={`Sazon remembers ${count} ${noteWord}`}
        accessibilityRole="button"
        style={[styles.pill, { backgroundColor: bg }]}
      >
        <Ionicons name="bookmark" size={13} color={text} />
        <Text style={[styles.serif, { color: text }]}>Sazon remembers</Text>
        <Text style={[styles.dot, { color: subtle }]}>·</Text>
        <Text style={[styles.count, { color: subtle }]}>
          {count} {noteWord}
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  serif: {
    fontFamily: Platform.select({
      ios: 'Fraunces_600SemiBold',
      default: 'Fraunces_600SemiBold',
    }),
    fontSize: 13,
  },
  dot: {
    fontSize: 13,
  },
  count: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 12,
  },
});
