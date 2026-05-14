import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface ShoppingHeaderProps {
  itemsLeft: number;
  inPantry: number;
}

export function ShoppingHeader({ itemsLeft, inPantry }: ShoppingHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping list</Text>
      <Text style={styles.subtitle}>
        {itemsLeft} items left · {inPantry} already in pantry
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
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: '#111827',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 6,
  },
});
