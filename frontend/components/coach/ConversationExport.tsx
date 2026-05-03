// Phase 8 (10Y-E): Pro-only export button — taps fetch markdown from the API
// and hands it off to the OS share sheet.

import React, { useCallback, useState } from 'react';
import { Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { coachApi } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';

interface ConversationExportProps {
  conversationId: string | null;
  conversationTitle: string;
  isPremium: boolean;
}

export default function ConversationExport({
  conversationId,
  conversationTitle,
  isPremium,
}: ConversationExportProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    if (!conversationId || busy) return;
    setBusy(true);
    try {
      const markdown = await coachApi.exportConversation(conversationId);
      await Share.share({ message: markdown, title: conversationTitle });
    } catch {
      // Silent fail — the user can retry.
    } finally {
      setBusy(false);
    }
  }, [conversationId, conversationTitle, busy]);

  if (!isPremium || !conversationId) return null;

  const tint = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      accessibilityLabel="Export conversation"
      accessibilityRole="button"
      disabled={busy}
      style={styles.btn}
    >
      <Ionicons name="download-outline" size={20} color={tint} />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
});
