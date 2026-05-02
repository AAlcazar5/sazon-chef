import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';

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

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';
  const subtitleColor = isDark ? DarkColors.text.secondary : '#6B7280';

  return (
    <View style={[styles.container, applyTopInset && { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.title, { color: titleColor }]}>
        Shopping <Text style={[styles.titleAccent, { color: titleColor }]}>list</Text>
      </Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
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
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
