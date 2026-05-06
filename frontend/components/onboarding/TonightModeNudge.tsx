// frontend/components/onboarding/TonightModeNudge.tsx
// ROADMAP 4.0 T3.2 — one-shot card that introduces Tonight Mode to existing
// users. Renders only when the env flag is on AND `promptedAt` is null.
// "Try it" enables the pref + routes to /tonight. "Not now" stamps the
// dismissal timestamp on the user record.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { apiClient } from '../../lib/api';
import { BorderRadius, Spacing } from '../../constants/Spacing';

interface TonightModeNudgeProps {
  flagOn: boolean;
  promptedAt: Date | null;
}

const PREF_KEY = 'tonight_mode_pref_enabled';

export default function TonightModeNudge({ flagOn, promptedAt }: TonightModeNudgeProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState<boolean>(false);

  if (!flagOn || promptedAt || hidden) return null;

  const handle = async (enable: boolean) => {
    setHidden(true);
    try {
      await apiClient.put('/user/tonight-mode', {
        enabled: enable,
        dismissPrompt: true,
      });
      await AsyncStorage.setItem(PREF_KEY, enable ? '1' : '0');
      if (enable) {
        router.replace('/tonight' as any);
      }
    } catch {
      // Silent: a stale dismissal will simply re-prompt on next launch.
    }
  };

  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <Text style={styles.headline}>Want Sazon to just pick dinner?</Text>
        <Text style={styles.body}>
          One screen, one tap. Sazon proposes a plate that fits your pantry,
          your week, and your taste — long-press to swap, or tap More any time
          to browse the full app.
        </Text>
        <View style={styles.actions}>
          <HapticTouchableOpacity
            accessibilityLabel="Try Tonight mode"
            pressedScale={0.97}
            style={styles.primary}
            onPress={() => handle(true)}
          >
            <Text style={styles.primaryText}>Try it</Text>
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            accessibilityLabel="Dismiss Tonight mode prompt"
            pressedScale={0.97}
            style={styles.secondary}
            onPress={() => handle(false)}
          >
            <Text style={styles.secondaryText}>Not now</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,12,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: '#FAF7F4',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F1B16',
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    color: '#52483F',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
  },
  primary: {
    backgroundColor: '#1F1B16',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryText: {
    color: '#FAF7F4',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#7A6F65',
    fontSize: 15,
    fontWeight: '600',
  },
});
