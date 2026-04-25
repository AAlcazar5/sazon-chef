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
        Cookbook
        <Text style={styles.orangePeriod}>.</Text>
      </Text>
      <Text style={styles.subtitle}>
        {recipeCount} recipes saved across {collectionCount} collections.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 20,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: '#111827',
  },
  orangePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 30,
    color: '#fa7e12',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
