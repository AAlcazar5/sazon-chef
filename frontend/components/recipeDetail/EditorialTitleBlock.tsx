import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialTitleBlockProps {
  cuisine: string;
  matchPercent: number;
  title: string;
  accentWord: string;
  subtitle: string;
}

export function EditorialTitleBlock({ cuisine, matchPercent, title, accentWord, subtitle }: EditorialTitleBlockProps) {
  const parts = title.split(accentWord);

  return (
    <View style={styles.container}>
      <View style={styles.eyebrowRow}>
        <View style={styles.orangeDot} />
        <Text style={styles.eyebrow}>
          {cuisine} · {matchPercent}% match
        </Text>
      </View>

      <Text style={styles.title}>
        {parts[0]}
        <Text testID="title-accent" style={styles.titleAccent}>{accentWord}</Text>
        {parts[1] || ''}
      </Text>

      <Text style={styles.subtitle}>{subtitle}</Text>
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
    backgroundColor: '#fa7e12',
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 38,
    letterSpacing: -1,
    color: '#111827',
    lineHeight: 42,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 38,
    letterSpacing: -1,
    color: '#111827',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
