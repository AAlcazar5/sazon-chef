// frontend/components/coach/SazonHeader.tsx
// ROADMAP 4.0 — Sazon (Coach) tab header. Matches the FrostedHeader pattern
// from Home/Kitchen/Week so every journey-shaped tab carries the same
// visual identity and ProfileAvatarButton in the top right.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialFontFamily } from '../../constants/Typography';
import { Colors, DarkColors } from '../../constants/Colors';

interface SazonHeaderProps {
  onNewConversation?: () => void;
}

export default function SazonHeader({ onNewConversation }: SazonHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';
  const iconColor = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
          Sa<Text style={[styles.titleAccent, { color: titleColor }]}>zon</Text>
        </Text>

        <View style={styles.actions}>
          {onNewConversation && (
            <HapticTouchableOpacity
              onPress={onNewConversation}
              accessibilityLabel="New Sazon conversation"
              accessibilityRole="button"
              testID="sazon-header-new-conversation"
              style={styles.iconButton}
            >
              <Ionicons name="add" size={22} color={iconColor} />
            </HapticTouchableOpacity>
          )}
          <ProfileAvatarButton size={36} />
        </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
});
