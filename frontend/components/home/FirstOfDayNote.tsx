// frontend/components/home/FirstOfDayNote.tsx
// ROADMAP 4.0 Tier J11 — First-of-day greeting moment.
//
// Personalized note that appears once per local date when the user opens the
// app for the first time that day. References last night's cuisine + a
// cuisine-adjacency suggestion for tonight. Hides on subsequent foregrounds.
// "The model talks back even when the user hasn't asked."

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { suggestAdjacentCuisine } from '../../lib/cuisineAdjacencySuggestion';

const STORAGE_KEY = '@sazon/first_of_day_note/last_seen_date';

const isoLocalDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const dayOfYear = (d: Date): number => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

interface FirstOfDayNoteProps {
  /** Cuisine of the user's most recent cook (e.g., "Persian"). Empty hides. */
  lastCookCuisine: string;
}

interface NoteCopy {
  suggestedCuisine: string;
  copy: string;
}

export default function FirstOfDayNote({ lastCookCuisine }: FirstOfDayNoteProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [note, setNote] = useState<NoteCopy | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = isoLocalDate(new Date());
      try {
        const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (lastSeen === today) return; // already greeted today
        if (!lastCookCuisine?.trim()) return;
        const suggested = suggestAdjacentCuisine(lastCookCuisine, dayOfYear(new Date()));
        if (cancelled || !suggested) return;
        setNote({
          suggestedCuisine: suggested,
          copy: `Yesterday's plate was ${lastCookCuisine.trim()} — fancy something ${suggested} tonight?`,
        });
        await AsyncStorage.setItem(STORAGE_KEY, today).catch(() => undefined);
      } catch {
        // best-effort — never block Today on a missing greeting
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lastCookCuisine]);

  if (!note) return null;

  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <View
      testID="first-of-day-note"
      accessibilityRole="summary"
      accessibilityLabel={`Greeting: ${note.copy}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <Ionicons name="sunny-outline" size={16} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>GOOD MORNING</Text>
      </View>
      <Text style={[styles.body, { color: text }]} numberOfLines={3}>
        {note.copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  body: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
});
