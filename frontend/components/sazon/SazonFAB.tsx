// frontend/components/sazon/SazonFAB.tsx
// ROADMAP 4.0 IA2.2 — Sazon header floating icon.
//
// Header-positioned circular icon (chatbubbles glyph). Tap → opens
// SazonSheet (generic). Long-press → opens with the current screen's
// context pre-seeded (e.g. Today: "What's tonight's plate?", Recipe
// Detail: "Tell me about this recipe"). Each consumer of the FAB
// supplies its own `getContextSeed` callback.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useSazonSheet } from '../../contexts/SazonSheetContext';

interface SazonFABProps {
  /** Returns a non-empty string seed for long-press, or null/undefined to skip seeding. */
  getContextSeed?: () => string | null | undefined;
  /** Visual size of the icon glyph. Defaults to MD. */
  size?: number;
  /** Optional override for the a11y label (defaults to "Talk to Sazon"). */
  accessibilityLabel?: string;
}

export default function SazonFAB({
  getContextSeed,
  size,
  accessibilityLabel = 'Talk to Sazon',
}: SazonFABProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { open } = useSazonSheet();

  const handlePress = () => {
    open({ source: 'fab_tap' });
  };

  const handleLongPress = () => {
    if (getContextSeed) {
      const seed = getContextSeed();
      if (seed && seed.trim().length > 0) {
        open({ contextSeed: seed.trim(), source: 'fab_long_press' });
        return;
      }
    }
    open({ source: 'fab_long_press' });
  };

  return (
    <HapticTouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Long-press to ask about this screen"
      style={styles.touchable}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? DarkColors.primary : Colors.primary,
          },
        ]}
      >
        <Icon
          name={Icons.CHATBUBBLES}
          size={size ?? IconSizes.MD}
          color="#FFFFFF"
          accessibilityLabel=""
        />
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    padding: 4,
  },
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
