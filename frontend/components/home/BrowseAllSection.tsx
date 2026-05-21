// frontend/components/home/BrowseAllSection.tsx
//
// W-D P2 / D-4 — catalog browse de-emphasis. When enabled (P2 flag), the
// recipe grid is NOT the Today headline — it sits behind an explicit
// "Browse all recipes" affordance (collapsed by default), so memory/state
// leads and the commoditized catalog is opt-in. When disabled, children
// render as before (A/B-safe rollback).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Brand } from '../../constants/tokens';

interface BrowseAllSectionProps {
  enabled: boolean;
  children: React.ReactNode;
}

export default function BrowseAllSection({
  enabled,
  children,
}: BrowseAllSectionProps) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);

  // Flag off → unchanged behaviour (grid renders inline as before).
  if (!enabled) return <>{children}</>;

  const accent = isDark ? Brand.dark.base : Brand.light.base;

  if (!open) {
    return (
      <HapticTouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Browse all recipes"
        style={[styles.affordance, { borderColor: accent }]}
      >
        <Text style={[styles.affordanceText, { color: accent }]}>
          Browse all recipes
        </Text>
      </HapticTouchableOpacity>
    );
  }

  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  affordance: {
    marginHorizontal: 20,
    marginVertical: 18,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
  },
  affordanceText: { fontSize: 15, fontWeight: '600' },
});
