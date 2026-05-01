import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialShoppingIntroProps {
  itemsLeft: number;
  itemsInPantry: number;
  /** When true, the component applies its own top safe-area padding. Default true. */
  applyTopInset?: boolean;
}

export function EditorialShoppingIntro({
  itemsLeft,
  itemsInPantry,
  applyTopInset = true,
}: EditorialShoppingIntroProps) {
  const insets = useSafeAreaInsets();
  const subtitle = itemsLeft === 0
    ? itemsInPantry > 0
      ? `All grabbed. ${itemsInPantry} already in your pantry — nicely done.`
      : 'All grabbed. Nicely done.'
    : itemsInPantry > 0
      ? `${itemsLeft} item${itemsLeft === 1 ? '' : 's'} left to grab. ${itemsInPantry} already in your pantry — we'll cross those off on the fly.`
      : `${itemsLeft} item${itemsLeft === 1 ? '' : 's'} left to grab. Let's keep it moving.`;

  return (
    <View style={[styles.container, applyTopInset && { paddingTop: insets.top + 12 }]}>
      <Text style={styles.eyebrow}>FOR THE WEEK</Text>
      <Text style={styles.title}>
        Shopping <Text style={styles.titleAccent}>List</Text>
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const TITLE_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 18,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
    color: '#111827',
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
    color: '#111827',
  },
  orangePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    color: '#fa7e12',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginTop: 12,
  },
});
