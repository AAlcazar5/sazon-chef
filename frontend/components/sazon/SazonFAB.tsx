// frontend/components/sazon/SazonFAB.tsx
// ROADMAP 4.0 IA2.2 — Sazon header floating icon.
//
// Header-positioned circular icon (chatbubbles glyph). Tap → opens
// SazonSheet (generic). Long-press → opens with the current screen's
// context pre-seeded (e.g. Today: "What's tonight's plate?", Recipe
// Detail: "Tell me about this recipe"). Each consumer of the FAB
// supplies its own `getContextSeed` callback.

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { GradientPresets } from '../../constants/Gradients';
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
      {/* Sage→deep-green gradient (`successCTA` preset) — same kitchen-warm
          / produce-cool pairing as the coral Quick Actions FAB next to it.
          White glyph in both themes per spec. */}
      <LinearGradient
        colors={GradientPresets.successCTA}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Icon
          name={Icons.CHATBUBBLES}
          size={size ?? IconSizes.MD}
          color="#FFFFFF"
          accessibilityLabel=""
        />
      </LinearGradient>
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
