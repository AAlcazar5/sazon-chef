import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';

interface EditorialChefNoteProps {
  note: string;
}

export function EditorialChefNote({ note }: EditorialChefNoteProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const eyebrowColor = isDark ? DarkColors.text.tertiary : '#9CA3AF';
  // EditorialDark.serifMuted #E8D9C5 — warm ivory for italic pull-quote on cocoa
  const noteColor = isDark ? '#E8D9C5' : '#374151';

  return (
    <View style={styles.container}>
      <Text style={[styles.eyebrow, { color: eyebrowColor }]}>CHEF'S NOTE</Text>
      <Text testID="chef-note-text" style={[styles.note, { color: noteColor }]}>"{note}"</Text>
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
    marginBottom: 8,
  },
  note: {
    fontFamily: EditorialFontFamily.displayItalic.regular,
    fontSize: 17,
    lineHeight: 26,
  },
});
