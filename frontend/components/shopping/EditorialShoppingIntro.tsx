import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon from '../mascot/Sazon';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';
import { Space } from '../../constants/tokens';

interface EditorialShoppingIntroProps {
  itemsLeft: number;
  itemsInPantry: number;
  /** Optional tap handler for the logo + title. */
  onLogoPress?: () => void;
}

// Header geometry matches HomeHeader: Sazon logo (36) + title (36) on the
// left, ProfileAvatarButton (36) on the right, FrostedHeader paddingBottom
// 14, with the contextual subtitle ("3 items left to grab…") sitting under
// the chrome.
export function EditorialShoppingIntro({
  itemsLeft,
  itemsInPantry,
  onLogoPress,
}: EditorialShoppingIntroProps) {
  const subtitle = itemsLeft === 0
    ? itemsInPantry > 0
      ? `All grabbed. ${itemsInPantry} already in your pantry — nicely done.`
      : 'All grabbed. Nicely done.'
    : itemsInPantry > 0
      ? `${itemsLeft} item${itemsLeft === 1 ? '' : 's'} left to grab. ${itemsInPantry} already in your pantry — we'll cross those off on the fly.`
      : `${itemsLeft} item${itemsLeft === 1 ? '' : 's'} left to grab. Let's keep it moving.`;

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';
  const subtitleColor = isDark ? DarkColors.text.secondary : '#6B7280';

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        <HapticTouchableOpacity
          onPress={onLogoPress}
          activeOpacity={0.8}
          style={styles.titleRow}
          accessibilityRole="header"
          accessibilityLabel="Shopping list"
        >
          <Sazon variant="orange" motion="idle" size={36} />
          <Text style={[styles.title, { color: titleColor }]}>
            Shop<Text style={[styles.titleAccent, { color: titleColor }]}>ping</Text>
          </Text>
        </HapticTouchableOpacity>
        <ProfileAvatarButton size={36} />
      </View>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
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
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: Space['5'],
  },
});
