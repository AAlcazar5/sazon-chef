import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialFontFamily } from '../../constants/Typography';

interface EditorialAisleHeaderProps {
  onSortPress?: () => void;
}

export function EditorialAisleHeader({ onSortPress }: EditorialAisleHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>
        By <Text style={styles.accent}>aisle</Text>
      </Text>
      {onSortPress && (
        <HapticTouchableOpacity onPress={onSortPress} accessibilityLabel="Sort items">
          <Text style={styles.sort}>SORT</Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 26,
    letterSpacing: -0.8,
    color: '#111827',
  },
  accent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: 26,
    color: '#111827',
  },
  sort: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#fa7e12',
  },
});
