// frontend/components/today/SundayPolaroidCard.tsx
// ROADMAP 4.0 Tier J4 — Sunday Polaroid drop.
//
// Surprise weekly recap card that drops onto Today on Sunday morning. Spotify-
// Wrapped-toned: top cuisine, top mineral, discovery of the week. One-tap
// share-as-image. Auto-dismiss persists the ISO date so the card never repeats
// within the same week. The card is a *gift*, not a notification — it
// celebrates discovery, not a streak.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const STORAGE_KEY = '@sazon/sunday_polaroid/last_dismissed_iso';

const isoDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export interface SundayRecap {
  topCuisine: string;
  topMineral: string;
  discovery: string;
}

interface SundayPolaroidCardProps {
  recap: SundayRecap;
  /** Optional clock injection for tests. Defaults to `new Date()`. */
  now?: Date;
}

export default function SundayPolaroidCard({
  recap,
  now,
}: SundayPolaroidCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const captureRefHandle = useRef<View | null>(null);

  const today = now ?? new Date();
  const isSunday = today.getDay() === 0;
  const todayIso = isoDate(today);

  useEffect(() => {
    let cancelled = false;
    if (!isSunday) {
      setVisible(false);
      setHasChecked(true);
      return;
    }
    (async () => {
      try {
        const lastDismissed = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        setVisible(lastDismissed !== todayIso);
      } catch {
        if (!cancelled) setVisible(true);
      } finally {
        if (!cancelled) setHasChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSunday, todayIso]);

  if (!hasChecked || !visible) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, todayIso);
    } catch {
      // best-effort
    }
    setVisible(false);
  };

  const handleShare = async () => {
    try {
      if (!captureRefHandle.current) return;
      const uri = await captureRef(captureRefHandle.current, {
        format: 'png',
        quality: 1,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Your week',
        });
      }
    } catch {
      // best-effort
    }
  };

  return (
    <View
      ref={captureRefHandle}
      testID="sunday-polaroid-card"
      accessibilityRole="summary"
      accessibilityLabel={`Your week: top cuisine ${recap.topCuisine}, top mineral ${recap.topMineral}, discovery ${recap.discovery}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="film-outline" size={14} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>YOUR WEEK</Text>
        <View style={styles.spacer} />
        <HapticTouchableOpacity
          testID="sunday-polaroid-dismiss"
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss the weekly Polaroid"
          pressedScale={0.95}
          hapticStyle="light"
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={16} color={accent} />
        </HapticTouchableOpacity>
      </View>

      <View style={styles.statRow}>
        <Stat label="TOP CUISINE" value={recap.topCuisine} />
        <Stat label="TOP MINERAL" value={recap.topMineral} />
      </View>

      <Text style={[styles.discoveryLabel, { color: sub }]}>DISCOVERY</Text>
      <Text style={[styles.discoveryBody, { color: text }]} numberOfLines={3}>
        {recap.discovery}
      </Text>

      <HapticTouchableOpacity
        testID="sunday-polaroid-share"
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share your week"
        pressedScale={0.97}
        hapticStyle="light"
        style={[styles.shareBtn, { backgroundColor: 'rgba(255,255,255,0.55)' }]}
      >
        <Ionicons name="share-outline" size={14} color="#3B2D67" />
        <Text style={styles.shareLabel}>Share your week</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  spacer: { flex: 1 },
  dismissBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: { flex: 1 },
  statLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#6B5DA0',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: '#15102E',
  },
  discoveryLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  discoveryBody: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  shareLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    color: '#3B2D67',
    letterSpacing: 0.3,
  },
});
