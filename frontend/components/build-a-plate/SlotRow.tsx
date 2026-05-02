// frontend/components/build-a-plate/SlotRow.tsx
// Group 10X Phase 1 — slot card or empty CTA + lock pin overlay.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import type { MealComponent, MealComponentSlot } from '../../lib/api';

interface SlotRowProps {
  slot: MealComponentSlot;
  label: string;
  emoji: string;
  selected?: MealComponent;
  locked?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}

const SLOT_TINTS: Record<MealComponentSlot, string> = {
  protein: Pastel.sage,
  base: Pastel.golden,
  vegetable: '#E0F2E1',
  sauce: Pastel.lavender,
  garnish: Pastel.peach,
};

export default function SlotRow({
  slot,
  label,
  emoji,
  selected,
  locked,
  onPress,
  onLongPress,
  testID,
}: SlotRowProps) {
  const tint = SLOT_TINTS[slot];
  const accessibilityLabel = selected
    ? `${label}: ${selected.name}${locked ? ', locked' : ''}. Tap to change.`
    : `Pick a ${label.toLowerCase()}`;

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      hapticStyle="light"
      pressedScale={0.97}
      style={[styles.container, { backgroundColor: tint }, Shadows.SM as any]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.left}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {selected?.name ?? `+ Pick a ${label.toLowerCase()}`}
          </Text>
          {selected && (
            <View style={styles.macroChips}>
              <Text style={styles.macroChip}>{Math.round(selected.caloriesPerPortion)} cal</Text>
              <Text style={styles.macroChip}>{Math.round(selected.proteinG)}g P</Text>
              {selected.pantryCoveragePercent >= 100 && (
                <Text style={[styles.macroChip, styles.pantryChip]} testID={`${testID}-pantry-tag`}>
                  ✓ In pantry
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {locked && (
        <View style={styles.lockBadge} testID={`${testID}-lock-pin`} accessibilityLabel="Locked">
          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
        </View>
      )}
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: BorderRadius.card,
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emoji: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#6B7280',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: '#1F2937',
  },
  macroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  macroChip: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#374151',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    overflow: 'hidden',
  },
  pantryChip: {
    backgroundColor: Accent.sage,
    color: '#FFFFFF',
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
