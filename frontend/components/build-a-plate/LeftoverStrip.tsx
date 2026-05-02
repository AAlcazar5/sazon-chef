// frontend/components/build-a-plate/LeftoverStrip.tsx
// Group 10X Phase 6 — "From last night" sage strip in slot picker, ranked above pantry items.

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealComponentSlot } from '../../lib/api';

export interface LeftoverInventoryItem {
  id: string;
  componentId: string;
  slot: MealComponentSlot;
  name: string;
  portionsRemaining: number;
  expiresAt?: string;
}

interface LeftoverStripProps {
  leftovers: LeftoverInventoryItem[];
  onSelect: (item: LeftoverInventoryItem) => void;
  testID?: string;
}

export default function LeftoverStrip({ leftovers, onSelect, testID }: LeftoverStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handlePress = useCallback(
    (item: LeftoverInventoryItem) => {
      onSelect(item);
    },
    [onSelect],
  );

  if (!leftovers || leftovers.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(129,199,132,0.12)' : Pastel.sage },
      ]}
      testID={testID}
      accessibilityLabel="Leftovers from last night"
    >
      <Text style={styles.eyebrow}>FROM LAST NIGHT</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {leftovers.map((item) => (
          <HapticTouchableOpacity
            key={item.id}
            onPress={() => handlePress(item)}
            hapticStyle="medium"
            pressedScale={0.97}
            style={[
              styles.card,
              { backgroundColor: isDark ? '#1F1F22' : '#FFFFFF' },
              Shadows.SM as any,
            ]}
            accessibilityLabel={`Use leftover ${item.name}, ${item.portionsRemaining} portion${item.portionsRemaining === 1 ? '' : 's'}`}
            testID={`leftover-card-${item.id}`}
          >
            <Text style={[styles.name, { color: isDark ? '#F9FAFB' : '#1F2937' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.portions}>
              {item.portionsRemaining}× left
            </Text>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: BorderRadius.card,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#2E5931',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  row: {
    paddingHorizontal: 14,
    gap: 8,
  },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    minWidth: 132,
  },
  name: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  portions: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
