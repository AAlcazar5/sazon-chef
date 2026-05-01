import React from 'react';
import { Text, StyleSheet } from 'react-native';
import FrostedHeader from '../ui/FrostedHeader';
import { EditorialFontFamily } from '../../constants/Typography';

export default function CookbookHeader() {
  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <Text style={styles.title} accessibilityRole="header">
        Cook<Text style={styles.titleAccent}>book</Text>
      </Text>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 48;

const styles = StyleSheet.create({
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
    color: '#111827',
    paddingHorizontal: 20,
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
});
