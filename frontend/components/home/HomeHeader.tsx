// ROADMAP 4.0 DS7.3 — HomeHeader migrated to constants/tokens. Validates
// DS2.2 (canvas-warm = Today only) at scale: this is the most-seen surface
// and now sources every visual value from the canonical tokens.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon from '../mascot/Sazon';
import { Ink, AccentTokens, Brand, Radius, Space, Type } from '../../constants/tokens';
import { HapticPatterns } from '../../constants/Haptics';

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
  // DS7.3 — `Ink.dark.warm` is the warm ivory that pairs with `Canvas.warmDark`;
  // light mode keeps the legacy gray-900 ink for AA contrast on warm cream.
  const titleColor = isDark ? Ink.dark.warm : Ink.light.primary;

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
              style={{ borderRadius: Radius.pill, overflow: 'hidden' }}
            >
              <LinearGradient
                // DS7.3 — Surprise Me pill: lavender accent → deeper purple end-stop.
                colors={[AccentTokens.lavender, '#7C3AED']}
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
    paddingHorizontal: Space['5'],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space['2'],
    flexShrink: 1,
  },
  title: {
    // DS7.3 — Fraunces 700 (display.bold) at TITLE_SIZE.
    fontFamily: 'Fraunces_700Bold',
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
  },
  titleAccent: {
    fontFamily: 'Fraunces_700Bold_Italic',
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space['2'],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space['4'] - 2, // 14
    paddingVertical: Space['2'],
    borderRadius: Radius.pill,
    gap: 6,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Brand.light.ink,
  },
});
