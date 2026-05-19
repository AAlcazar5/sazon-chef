// P2 retention — proactive Sazon greeting on the Sazon tab.
//
// Renders a once-per-day pastel banner above the empty-state chips on the
// coach screen. Sazon "says hi" with a 1–2 line opener composed from
// available signals (last cuisine, cuisine drought). Tap → opens a fresh
// conversation seeded with a starter question matched to today's hook.
//
// Voice: warm + curious, never coachy. Mirrors the brand-voice guard's
// "Notifications" sample line ("You haven't had Persian flavors in a
// week — fancy fesenjan?") but lighter, conversational, in-app.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const STORAGE_KEY = '@sazon/sazon_greeting/last_shown_date';

const isoLocalDate = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface GreetingSignals {
  /** Last cook cuisine — used as a warm callback ("yesterday was Persian"). */
  lastCookCuisine?: string | null;
  /** Quiet cuisine ("You haven't had Thai in 9 days"). */
  droughtCuisine?: string | null;
  /** First name for personalization — optional. */
  firstName?: string | null;
}

export interface GreetingPayload {
  /** 1–2 sentence hello. */
  copy: string;
  /** Pre-canned starter message sent on tap. */
  starter: string;
}

const titleCase = (s: string): string => {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

export function composeDailyGreeting(signals: GreetingSignals): GreetingPayload {
  const drought = signals.droughtCuisine?.trim();
  const last = signals.lastCookCuisine?.trim();

  if (drought) {
    const c = titleCase(drought);
    return {
      copy: `${c} has been quiet — want to plan something tonight?`,
      starter: `I'd love a ${c} idea for tonight — what would you make?`,
    };
  }
  if (last) {
    const c = titleCase(last);
    return {
      copy: `Yesterday's plate was ${c}. Want to ride that wave or switch it up?`,
      starter: `What's good after a ${c} night — same vibe or somewhere else?`,
    };
  }
  return {
    copy: "Two minutes free? I've got a few ideas based on your week.",
    starter: 'What should I cook tonight?',
  };
}

interface SazonDailyGreetingBannerProps {
  signals: GreetingSignals;
  onStart: (starter: string) => void;
}

export default function SazonDailyGreetingBanner({
  signals,
  onStart,
}: SazonDailyGreetingBannerProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [show, setShow] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [greeting, setGreeting] = useState<GreetingPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const last = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (last !== isoLocalDate()) {
          setShow(true);
          setGreeting(composeDailyGreeting(signals));
        }
      } catch {
        /* best-effort */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally only on mount — signals reference is captured in the
    // initial compose so the banner doesn't churn its copy mid-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = async (): Promise<void> => {
    setShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, isoLocalDate());
    } catch {
      /* best-effort */
    }
  };

  if (!hydrated) return null;
  if (!show || !greeting) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID="sazon-daily-greeting"
      accessibilityRole="summary"
      accessibilityLabel={`Sazon says: ${greeting.copy}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
          <Ionicons name="hand-left-outline" size={16} color={accent} />
        </View>
        <Text style={[styles.eyebrow, { color: accent }]}>SAZON SAID HI</Text>
        <HapticTouchableOpacity
          testID="sazon-daily-greeting-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss greeting"
          hapticStyle="light"
          onPress={dismiss}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={14} color={sub} />
        </HapticTouchableOpacity>
      </View>
      <Text style={[styles.copy, { color: text }]}>{greeting.copy}</Text>
      <HapticTouchableOpacity
        testID="sazon-daily-greeting-start"
        accessibilityRole="button"
        accessibilityLabel={`Start: ${greeting.starter}`}
        onPress={async () => {
          await dismiss();
          onStart(greeting.starter);
        }}
        hapticStyle="light"
        style={[
          styles.starterPill,
          // High-contrast theme-aware pill so the starter copy actually
          // reads on the lavender card (the previous translucent white +
          // lavender text was washed out, esp. in dark mode).
          { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' },
        ]}
      >
        <Text style={[styles.starterLabel, { color: text }]} numberOfLines={2}>
          {greeting.starter}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={text} />
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  dismissBtn: {
    padding: 6,
  },
  copy: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  starterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  starterLabel: {
    flexShrink: 1,
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
