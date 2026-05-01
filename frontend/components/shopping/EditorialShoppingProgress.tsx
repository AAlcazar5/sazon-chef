import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface EditorialShoppingProgressProps {
  purchased: number;
  total: number;
}

export function EditorialShoppingProgress({ purchased, total }: EditorialShoppingProgressProps) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, purchased / total)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <View style={styles.outer}>
      <View style={[styles.card, Shadows.SM]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>PROGRESS</Text>
        </View>

        <View style={styles.numberRow}>
          <Text style={styles.bigNumber}>{purchased}</Text>
          <Text style={styles.ofItalic}> of </Text>
          <Text style={styles.totalNumber}>{total}</Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>

        <View style={styles.orb} pointerEvents="none">
          <LinearGradient
            colors={['#FFB75D', '#FA7E12']}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.orbGradient}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  card: {
    backgroundColor: Pastel.peach,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    overflow: 'hidden',
    minHeight: 140,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Accent.peach,
    marginRight: 8,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#8a4a00',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  bigNumber: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 56,
    letterSpacing: -2,
    lineHeight: 56 * 1.0,
    color: '#111827',
  },
  ofItalic: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontStyle: 'italic',
    fontSize: 22,
    color: '#111827',
    marginHorizontal: 4,
  },
  totalNumber: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    color: '#111827',
  },
  barTrack: {
    height: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    marginRight: 80,
  },
  barFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: '#FA7E12',
  },
  orb: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    ...Shadows.MD,
  },
  orbGradient: {
    flex: 1,
  },
});
