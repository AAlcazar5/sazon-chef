import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import Sazon from '../mascot/Sazon';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';
import { Space } from '../../constants/tokens';

interface CookbookHeaderProps {
  /** @deprecated — filter row now lives inline above "Your Recipes" */
  onFilterPress?: () => void;
  /** @deprecated — filter row now lives inline above "Your Recipes" */
  activeFilterCount?: number;
  /** Optional tap handler for the logo + title. */
  onLogoPress?: () => void;
}

// ROADMAP 4.0 — visible label is "Kitchen" (route name still 'cookbook' for back-compat).
// Header geometry matches HomeHeader: Sazon logo (36) + title (36) on the left,
// ProfileAvatarButton (36) on the right, FrostedHeader paddingBottom 14.
export default function CookbookHeader({ onLogoPress }: CookbookHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        <HapticTouchableOpacity
          onPress={onLogoPress}
          activeOpacity={0.8}
          style={styles.titleRow}
          accessibilityRole="header"
          accessibilityLabel="Kitchen"
        >
          <Sazon variant="orange" motion="idle" size={36} />
          <Text style={[styles.title, { color: titleColor }]}>
            Kit<Text style={[styles.titleAccent, { color: titleColor }]}>chen</Text>
          </Text>
        </HapticTouchableOpacity>
        <ProfileAvatarButton size={36} />
      </View>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space['5'],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space['2'],
    flexShrink: 1,
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
