import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialCookbookHeaderProps {
  recipeCount: number;
  collectionCount: number;
}

export function EditorialCookbookHeader({ recipeCount, collectionCount }: EditorialCookbookHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR</Text>
      <Text style={styles.title}>
        Cook<Text style={styles.titleAccent}>book</Text>
        <Text style={styles.period}>.</Text>
      </Text>
      <Text style={styles.subtitle}>
        {recipeCount} recipes saved across {collectionCount} collections.
      </Text>
    </View>
  );
}

const TITLE_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 20,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 4,
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
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
    color: '#111827',
  },
  period: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    color: '#FB7434',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#6B7280',
    marginTop: 10,
  },
});
