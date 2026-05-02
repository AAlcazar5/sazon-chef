import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Colors, DarkColors, HeroPlatesDark } from '../../constants/Colors';

interface EditorialTitleBlockProps {
  cuisine: string;
  matchPercent: number;
  title: string;
  accentWord: string;
  subtitle: string;
}

export function EditorialTitleBlock({ cuisine, matchPercent, title, accentWord, subtitle }: EditorialTitleBlockProps) {
  const parts = title.split(accentWord);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Title block overlays the terracotta hero in dark mode → ink uses plate.ink, eyebrow uses plate.accent
  const plate = HeroPlatesDark.orange;
  const titleColor = isDark ? plate.ink : '#111827';
  const eyebrowColor = isDark ? plate.accent : '#9CA3AF';
  const dotColor = isDark ? plate.accent : Colors.primary;
  const subtitleColor = isDark ? plate.ink : '#9CA3AF';

  return (
    <View style={styles.container}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.orangeDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.eyebrow, { color: eyebrowColor }]}>
          {cuisine} · {matchPercent}% match
        </Text>
      </View>

      <Text style={[styles.title, { color: titleColor }]}>
        {parts[0]}
        <Text testID="title-accent" style={[styles.titleAccent, { color: titleColor }]}>{accentWord}</Text>
        {parts[1] || ''}
      </Text>

      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 38,
    letterSpacing: -1,
    lineHeight: 42,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 38,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    marginTop: 6,
  },
});
