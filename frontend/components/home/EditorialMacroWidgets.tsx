import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pastel } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface MacroWidgetData {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  accentCircleColor: string;
}

interface EditorialMacroWidgetsProps {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  streak: number;
}

export function EditorialMacroWidgets({ calories, protein, streak }: EditorialMacroWidgetsProps) {
  const widgets: MacroWidgetData[] = [
    {
      label: "TODAY'S KCAL",
      value: `${calories.consumed}`,
      icon: 'flame-outline',
      bg: Pastel.peach,
      accentCircleColor: 'rgba(255,183,77,0.35)',
    },
    {
      label: 'PROTEIN',
      value: `${protein.consumed}g`,
      icon: 'fitness-outline',
      bg: Pastel.sage,
      accentCircleColor: 'rgba(129,199,132,0.35)',
    },
    {
      label: 'STREAK',
      value: `${streak}`,
      icon: 'trophy-outline',
      bg: Pastel.lavender,
      accentCircleColor: 'rgba(206,147,216,0.35)',
    },
  ];

  return (
    <View style={styles.container} testID="macro-widgets">
      {widgets.map((w, i) => (
        <View
          key={w.label}
          testID={`widget-${i}`}
          style={[
            styles.card,
            { backgroundColor: w.bg },
            i === 0 && styles.cardWide,
          ]}
        >
          <View style={[styles.accentCircle, { backgroundColor: w.accentCircleColor }]} />
          <View style={styles.iconCircle}>
            <Ionicons name={w.icon} size={16} color="#111827" />
          </View>
          <Text style={styles.label}>{w.label}</Text>
          <Text style={styles.value}>{w.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
    minHeight: 100,
  },
  cardWide: {
    flex: 1.2,
  },
  accentCircle: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...EditorialTypography.eyebrow,
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
  },
  value: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#111827',
  },
});
