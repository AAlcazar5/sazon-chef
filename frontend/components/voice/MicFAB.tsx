// frontend/components/voice/MicFAB.tsx
//
// Y-Siri-1b (founder Telegram 2026-05-22) — visible voice-entry FAB.
// Y-Siri-1 shipped voice-to-Sazon via long-press on Kitchen / Week /
// Profile tabs; this is the discoverable affordance for users who
// don't know the gesture. Mounts next to SazonFAB in the bottom-of-
// screen header row so chat + voice are visible peer actions.
//
// Tap → opens VoiceCoachQuickModal with the current tab as
// `originScreen` (hidden context hint forwarded to coach). No
// long-press behavior — keep the gesture surface simple, the tab
// long-press handles power-user paths.

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';

const DEFAULT_GLYPH_SIZE = 20;

interface MicFABProps {
  /** Fired on tap — caller opens the voice modal with this as originScreen. */
  onPress: () => void;
  /** Visual size of the icon glyph (numeric, in pt). Defaults to 20. */
  size?: number;
  /** Optional override for the a11y label. Default: "Voice to Sazon". */
  accessibilityLabel?: string;
}

/** Sky → deep-blue gradient — distinct from SazonFAB's sage-green and the
 *  Quick Actions FAB's coral, so the three peer actions read separately
 *  at a glance. Reads as "audio / voice / listen" semantically. */
const VOICE_GRADIENT = ['#5B9BFF', '#3B6BD0'] as const;

export default function MicFAB({
  onPress,
  size,
  accessibilityLabel = 'Voice to Sazon',
}: MicFABProps) {
  return (
    <HapticTouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the voice composer to speak to Sazon"
      testID="mic-fab"
      style={styles.touchable}
    >
      <LinearGradient
        colors={VOICE_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Ionicons
          name="mic"
          size={size ?? DEFAULT_GLYPH_SIZE}
          color="#FFFFFF"
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
