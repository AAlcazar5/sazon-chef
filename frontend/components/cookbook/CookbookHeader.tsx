import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';

interface CookbookHeaderProps {
  /** @deprecated — filter row now lives inline above "Your Recipes" */
  onFilterPress?: () => void;
  /** @deprecated — filter row now lives inline above "Your Recipes" */
  activeFilterCount?: number;
}

// ROADMAP 4.0 — visible label is "Kitchen" (route name still 'cookbook' for back-compat).
// Header consistency: every screen tabs hosts the profile avatar in the top right.
export default function CookbookHeader(_props: CookbookHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
          Kit<Text style={[styles.titleAccent, { color: titleColor }]}>chen</Text>
        </Text>
        <ProfileAvatarButton size={36} />
      </View>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 48;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
});
