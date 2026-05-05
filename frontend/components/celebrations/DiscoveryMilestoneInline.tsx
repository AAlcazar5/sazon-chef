// frontend/components/celebrations/DiscoveryMilestoneInline.tsx
// ROADMAP 4.0 Tier J5 — Inline discovery milestone celebration.
//
// Single-fire moment for first-photo / first-leftover / first-appliance:* keys.
// No overlay — sits inline above the relevant card. Lifestyle voice; no streak,
// no points. The model recognizes a discovery threshold and quietly cheers.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const APPLIANCE_LABELS: Record<string, string> = {
  'ninja-creami': 'Ninja Creami',
  'air-fryer': 'Air Fryer',
  'instant-pot': 'Instant Pot',
  'sous-vide': 'Sous Vide',
  'dutch-oven': 'Dutch Oven',
  'cast-iron': 'Cast Iron',
  grill: 'Grill',
  smoker: 'Smoker',
};

interface MilestoneCopy {
  title: string;
  body: string;
}

const describe = (key: string): MilestoneCopy | null => {
  if (key === 'first-photo') {
    return {
      title: 'First plate, framed.',
      body: 'You photographed your cook. The kitchen has memory now.',
    };
  }
  if (key === 'first-leftover') {
    return {
      title: 'A leftover earns a second life.',
      body: "You turned yesterday's pot into today's dinner. That's how it's done.",
    };
  }
  if (key.startsWith('first-appliance:')) {
    const slug = key.slice('first-appliance:'.length);
    const label = APPLIANCE_LABELS[slug] ?? slug;
    return {
      title: `${label}, unlocked.`,
      body: `Your first cook with the ${label}. The pantry just expanded.`,
    };
  }
  return null;
};

interface DiscoveryMilestoneInlineProps {
  /** Milestone key to render (null hides the card). */
  milestoneKey: string | null;
}

export default function DiscoveryMilestoneInline({
  milestoneKey,
}: DiscoveryMilestoneInlineProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!milestoneKey) return null;
  const copy = describe(milestoneKey);
  if (!copy) return null;

  const bg = isDark ? PastelDark.golden : Pastel.golden;
  const accent = Accent.golden;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subText = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID="discovery-milestone-inline"
      accessibilityRole="summary"
      accessibilityLabel={`Milestone: ${copy.title} ${copy.body}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.header}>
        <Ionicons name="sparkles" size={14} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>DISCOVERY MOMENT</Text>
      </View>
      <Text style={[styles.title, { color: text }]} numberOfLines={2}>
        {copy.title}
      </Text>
      <Text style={[styles.body, { color: subText }]} numberOfLines={2}>
        {copy.body}
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
    marginVertical: 6,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
