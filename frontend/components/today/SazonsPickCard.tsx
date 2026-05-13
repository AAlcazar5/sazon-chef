// P1 retention — "Sazon's Pick" daily envelope.
//
// Variable-reward unwrap on Today. Sealed state shows a mascot + "tap to
// reveal" prompt. On tap, reveals 1 recipe + 1-line reason. State resets
// at midnight local via a date-keyed AsyncStorage flag, so the moment
// only happens once per day. The recipe + reason are passed in by Today
// (it already has the user's top match + lastCookCuisine in state).
//
// Brand-voice: invitation, not a verdict. "I picked this because…" not
// "Top match for you". Joy bar move.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';

const STORAGE_KEY = '@sazon/sazons_pick/last_revealed_date';

const isoLocalDate = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface SazonsPickRecipe {
  id: string;
  title: string;
  imageUrl?: string | null;
  cuisine?: string | null;
}

interface SazonsPickCardProps {
  /** The recipe Sazon picked today. null hides the card. */
  recipe: SazonsPickRecipe | null;
  /** Short rationale ("I picked this because you've been on a Persian streak."). */
  reason: string;
  /** Tap-to-open handler. */
  onOpen: (recipeId: string) => void;
}

export default function SazonsPickCard({
  recipe,
  reason,
  onOpen,
}: SazonsPickCardProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const last = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (last === isoLocalDate()) setRevealed(true);
      } catch {
        /* best-effort */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Replay the fade when the revealed state OR the chosen recipe changes —
  // this is the visual ritual for pull-to-refresh re-rolls (P2 retention).
  useEffect(() => {
    if (!revealed) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealed, recipe?.id, opacity]);

  const handleReveal = async (): Promise<void> => {
    HapticPatterns.success();
    setRevealed(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, isoLocalDate());
    } catch {
      /* best-effort */
    }
  };

  if (!hydrated) return null;
  if (!recipe) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  if (!revealed) {
    return (
      <HapticTouchableOpacity
        testID="sazons-pick-card-sealed"
        accessibilityRole="button"
        accessibilityLabel="Tap to reveal Sazon's pick for today"
        onPress={handleReveal}
        pressedScale={0.97}
        style={[styles.card, styles.sealed, { backgroundColor: bg }]}
      >
        <View style={styles.sealedRow}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
            <Ionicons name="gift-outline" size={20} color={accent} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: accent }]}>SAZON'S PICK</Text>
            <Text style={[styles.sealedTitle, { color: text }]}>
              I picked something for tonight.
            </Text>
            <Text style={[styles.sealedHint, { color: sub }]}>Tap to see.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={accent} />
        </View>
      </HapticTouchableOpacity>
    );
  }

  return (
    <Animated.View testID="sazons-pick-card-revealed" style={{ opacity }}>
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Sazon's pick: ${recipe.title}. ${reason}`}
        onPress={() => onOpen(recipe.id)}
        pressedScale={0.98}
        style={[styles.card, { backgroundColor: bg }]}
      >
        <View style={styles.revealedRow}>
          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={[styles.thumbnail, { backgroundColor: '#EAE6DF' }]} />
          )}
          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: accent }]}>SAZON'S PICK</Text>
            <Text style={[styles.title, { color: text }]} numberOfLines={2}>
              {recipe.title}
            </Text>
            <Text style={[styles.reason, { color: sub }]} numberOfLines={2}>
              {reason}
            </Text>
          </View>
        </View>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sealed: {
    // Slight emboss to read as a closed envelope
  },
  sealedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  revealedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  sealedTitle: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sealedHint: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 16,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  reason: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
