import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon from '../mascot/Sazon';
import { EditorialFontFamily } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
import { DarkColors } from '../../constants/Colors';

interface HomeHeaderProps {
  onMascotPress?: () => void;
  onSurpriseMe?: () => void;
  /** @deprecated — filter row now lives inline below the macros bar */
  onFilterPress?: () => void;
  /** @deprecated — filter row now lives inline below the macros bar */
  activeFilterCount?: number;
}

export default function HomeHeader({
  onMascotPress,
  onSurpriseMe,
}: HomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        {/* Left: logo + title */}
        <HapticTouchableOpacity onPress={onMascotPress} activeOpacity={0.8} style={styles.titleRow}>
          <Sazon variant="orange" motion="idle" size={36} />
          <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
            Sazon <Text style={[styles.titleAccent, { color: titleColor }]}>Chef</Text>
          </Text>
        </HapticTouchableOpacity>

        {/* Right: buttons */}
        <View style={styles.actions}>
          {onSurpriseMe && (
            <HapticTouchableOpacity
              onPress={() => { onSurpriseMe(); HapticPatterns.buttonPress(); }}
              accessibilityLabel="Surprise Me"
              accessibilityRole="button"
              style={{ borderRadius: 100, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#A78BFA', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pill}
              >
                <Text style={styles.pillEmoji}>🎰</Text>
                <Text style={styles.pillLabel}>Surprise Me</Text>
              </LinearGradient>
            </HapticTouchableOpacity>
          )}

          {/* ROADMAP 4.0 — Filter button moved to in-page FilterRow.
              Header now hosts only the Profile avatar (consistent across tabs). */}
          <ProfileAvatarButton size={36} />
        </View>
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
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFF',
  },
});
