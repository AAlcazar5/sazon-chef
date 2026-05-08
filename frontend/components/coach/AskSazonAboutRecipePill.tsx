// frontend/components/coach/AskSazonAboutRecipePill.tsx
// Recipe-detail entry point: opens the SazonSheet seeded with this recipe's
// title + (optional) pantry coverage and macro fit. Replaces the previous
// AskCoachAboutRecipePill which routed to /coach (jump-out UX).
//
// IA2 follow-up: stays in the sheet on tap. The sheet's "Open full Sazon"
// CTA is still available for users who want the deep route experience.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { useSazonSheet } from '../../contexts/SazonSheetContext';
import { Pastel, PastelDark } from '../../constants/Colors';

interface AskSazonAboutRecipePillProps {
  recipeTitle: string;
  pantryCoverage?: number;
  macroFit?: string;
}

function buildSeedMessage(props: AskSazonAboutRecipePillProps): string {
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

export default function AskSazonAboutRecipePill(props: AskSazonAboutRecipePillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { open } = useSazonSheet();

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const fg = isDark ? '#E8F5E9' : '#1B5E20';

  const handlePress = () => {
    const seed = buildSeedMessage(props);
    open({ contextSeed: seed, source: 'recipe_detail_pill' });
  };

  return (
    <View style={styles.outer}>
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Ask Sazon about ${props.recipeTitle}`}
        onPress={handlePress}
        style={[styles.pill, { backgroundColor: bg }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={fg} />
        <Text style={[styles.label, { color: fg }]}>Ask Sazon about this recipe</Text>
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
