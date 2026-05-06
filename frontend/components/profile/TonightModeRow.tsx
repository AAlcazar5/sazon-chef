// frontend/components/profile/TonightModeRow.tsx
// ROADMAP 4.0 T3.1 — Tonight Mode toggle row in the profile sheet.
//
// Hidden when the env flag is off. When on, persists the user pref via
// PUT /api/user/tonight-mode and mirrors the bit into AsyncStorage so
// _layout's redirect can read it synchronously on next launch.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { apiClient } from '../../lib/api';
import { BorderRadius, Spacing } from '../../constants/Spacing';

interface TonightModeRowProps {
  flagOn: boolean;
  initialEnabled: boolean;
}

const STORAGE_KEY = 'tonight_mode_pref_enabled';

export default function TonightModeRow({ flagOn, initialEnabled }: TonightModeRowProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [softMessage, setSoftMessage] = useState<string | null>(null);

  if (!flagOn) return null;

  const onToggle = async () => {
    const next = !enabled;
    // Optimistic update.
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    try {
      await apiClient.put('/user/tonight-mode', { enabled: next });
    } catch {
      // Roll back.
      setEnabled(!next);
      await AsyncStorage.setItem(STORAGE_KEY, !next ? '1' : '0');
      setSoftMessage('Sazon couldn’t save that — try again in a sec.');
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.title}>Tonight mode</Text>
        <Text style={styles.subtitle}>
          Sazon picks dinner. Tap More if you want to browse.
        </Text>
        {softMessage ? <Text style={styles.soft}>{softMessage}</Text> : null}
      </View>
      <HapticTouchableOpacity
        testID="tonight-mode-toggle"
        accessibilityLabel="Toggle Tonight mode"
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        pressedScale={0.97}
        style={[styles.switch, enabled ? styles.switchOn : styles.switchOff]}
        onPress={onToggle}
      >
        <View style={[styles.thumb, enabled ? styles.thumbOn : styles.thumbOff]} />
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
  },
  body: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1B16',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#7A6F65',
  },
  soft: {
    marginTop: 6,
    fontSize: 12,
    color: '#A47A4A',
  },
  switch: {
    width: 52,
    height: 30,
    borderRadius: BorderRadius.full,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: '#1F1B16',
  },
  switchOff: {
    backgroundColor: '#E5DDD3',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
});
