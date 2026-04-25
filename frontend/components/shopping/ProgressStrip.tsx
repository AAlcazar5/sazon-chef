import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

interface ProgressStripProps {
  done: number;
  total: number;
}

export function ProgressStrip({ done, total }: ProgressStripProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const shadowStyle = Platform.select({
    ios: EditorialShadows.cardRaised.ios,
    android: EditorialShadows.cardRaised.android,
    default: {},
  });

  return (
    <View testID="progress-strip" style={[styles.container, shadowStyle]}>
      <View style={styles.iconCircle}>
        <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Progress</Text>
          <Text style={styles.fraction}>{done}/{total}</Text>
        </View>
        <View style={styles.barTrack}>
          <View testID="progress-fill" style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fa7e12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    color: '#111827',
  },
  fraction: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
    color: '#6B7280',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F5F0EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fa7e12',
  },
});
