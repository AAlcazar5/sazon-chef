import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialChefNoteProps {
  note: string;
}

export function EditorialChefNote({ note }: EditorialChefNoteProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CHEF'S NOTE</Text>
      <Text testID="chef-note-text" style={styles.note}>"{note}"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  note: {
    fontFamily: EditorialFontFamily.displayItalic.regular,
    fontSize: 17,
    lineHeight: 26,
    color: '#374151',
  },
});
