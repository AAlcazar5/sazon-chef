// 10Y entry-points (2/3): Recipe-detail pill that opens a Coach conversation
// seeded with this recipe's title + (optional) pantry coverage and macro fit.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { coachApi } from '../../lib/api';
import { Pastel, PastelDark } from '../../constants/Colors';

interface AskCoachAboutRecipePillProps {
  recipeTitle: string;
  pantryCoverage?: number;
  macroFit?: string;
}

function buildSeedMessage(props: AskCoachAboutRecipePillProps): string {
  const { recipeTitle, pantryCoverage, macroFit } = props;
  const clauses: string[] = [];
  if (typeof pantryCoverage === 'number') {
    clauses.push(`pantry coverage ${Math.round(pantryCoverage)}%`);
  }
  if (macroFit) {
    clauses.push(`fits ${macroFit}`);
  }

  const head = `About **${recipeTitle}**`;
  const tail = 'ask anything (swap an ingredient, scale servings, why this for me?).';
  if (clauses.length === 0) return `${head} — ${tail}`;
  return `${head} — ${clauses.join(', ')}. Ask anything (swap an ingredient, scale servings, why this for me?).`;
}

export default function AskCoachAboutRecipePill(props: AskCoachAboutRecipePillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const fg = isDark ? '#E8F5E9' : '#1B5E20';

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    const seed = buildSeedMessage(props);
    try {
      const convo = await coachApi.createConversation(seed);
      const url = `/(tabs)/coach?conversationId=${encodeURIComponent(convo.id)}&seedMessage=${encodeURIComponent(seed)}`;
      router.push(url as never);
    } catch {
      // Soft-fail — fall back to a fresh coach view.
      router.push('/(tabs)/coach' as never);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.outer}>
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Ask Coach about ${props.recipeTitle}`}
        onPress={handlePress}
        disabled={busy}
        style={[styles.pill, { backgroundColor: bg }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={fg} />
        <Text style={[styles.label, { color: fg }]}>Ask the Coach about this recipe</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  label: {
    fontFamily: Platform.select({
      ios: 'Fraunces_600SemiBold',
      default: 'Fraunces_600SemiBold',
    }),
    fontSize: 14,
  },
});
