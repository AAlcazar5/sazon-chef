// frontend/components/cook/CopyCookContextButton.tsx
//
// X-B2 (founder roadmap Tier X — Moat Hardening): one-tap clipboard
// affordance for the cook-context export. The user taps once → the
// versioned v1 payload (X-B1) goes to clipboard → they paste it into
// Claude / ChatGPT / a friend's note app and the other end "cooks
// like it knows them".
//
// Peak-moment copy (per CLAUDE.md joy bar): "Hand this to any kitchen
// — they'll cook like they know you." Replaces the verbose "Export
// data" UX with a single-sentence brag.
//
// Banned-pattern clean: BrandButton (no raw TouchableOpacity),
// HapticTouchableOpacity haptic pattern, accessibility label set,
// success/error states use Sazon-voice copy.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import BrandButton from '../ui/BrandButton';
import { useTheme } from '../../contexts/ThemeContext';
import { cookApi } from '../../lib/api/cook';
import { EditorialFontFamily } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';

interface CopyCookContextButtonProps {
  /** Optional override label. Default: "Copy cooking context". */
  label?: string;
  /** Optional click hook for telemetry / sheet dismissal. Fires AFTER
   *  the copy succeeds. Not called on failure. */
  onCopied?: () => void;
}

export default function CopyCookContextButton({
  label = 'Copy cooking context',
  onCopied,
}: CopyCookContextButtonProps) {
  const { isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const handlePress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = await cookApi.getContextExport();
      const serialized = JSON.stringify(payload, null, 2);
      await Clipboard.setStringAsync(serialized);
      HapticPatterns.success();
      setJustCopied(true);
      onCopied?.();
      // Reset the "Copied!" flash after a short window so a second
      // tap can re-copy.
      setTimeout(() => setJustCopied(false), 2400);
    } catch {
      Alert.alert(
        'Kitchen needed a sec',
        "Couldn't pull your cooking context just now — tap again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onCopied]);

  const captionColor = isDark ? '#9CA3AF' : '#6B7280';
  const captionText = justCopied
    ? 'Pasted. Hand it to any kitchen.'
    : "Hand this to any kitchen — they'll cook like they know you.";

  return (
    <View style={styles.container} testID="copy-cook-context">
      <BrandButton
        variant="sage"
        label={busy ? 'Packing it up…' : justCopied ? 'Copied' : label}
        onPress={handlePress}
        disabled={busy}
        accessibilityLabel="Copy your cooking context to the clipboard"
        testID="copy-cook-context-button"
        icon={justCopied ? 'checkmark-circle' : 'copy-outline'}
      />
      <Text
        style={[styles.caption, { color: captionColor }]}
        accessibilityRole="text"
        testID="copy-cook-context-caption"
      >
        {captionText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  caption: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'left',
  },
});
