// frontend/components/today/FriendsFeedSection.tsx
// ROADMAP 4.0 F1 — "Cook a friend's plate" Today section.
//
// Hidden when user follows nobody or no friends have shared in the last
// 30 days. Shows up to 3 ranked friend plates with composite-score reason.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { followsApi, type FriendsFeedItem } from '../../lib/api';

interface FriendsFeedSectionProps {
  onSelect?: (item: FriendsFeedItem) => void;
}

const MAX_VISIBLE = 3;

export default function FriendsFeedSection({ onSelect }: FriendsFeedSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<FriendsFeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await followsApi.feed();
        if (!cancelled) setItems(res?.data?.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Loading or empty — render nothing (silent absence per persona voice).
  if (!items || items.length === 0) return null;

  return (
    <View testID="friends-feed-section" style={styles.container}>
      <View style={styles.header}>
        <Text style={[
          styles.eyebrow,
          { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
        ]}>
          FROM FRIENDS
        </Text>
        <Text style={[
          styles.title,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}>
          Cook a friend's plate
        </Text>
      </View>

      <View style={styles.list}>
        {items.slice(0, MAX_VISIBLE).map(item => (
          <FriendPlateCard
            key={item.plateId}
            item={item}
            isDark={isDark}
            onPress={() => onSelect?.(item)}
          />
        ))}
      </View>
    </View>
  );
}

interface FriendPlateCardProps {
  item: FriendsFeedItem;
  isDark: boolean;
  onPress: () => void;
}

function FriendPlateCard({ item, isDark, onPress }: FriendPlateCardProps) {
  const pantryPct = Math.round(item.score.pantryCoverage * 100);
  const reason = pantryReason(pantryPct);

  return (
    <HapticTouchableOpacity
      testID={`friends-feed-card-${item.plateId}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.ownerName ?? 'A friend'}'s ${item.plateName ?? 'plate'}, ${pantryPct}% pantry match`}
      style={[
        styles.card,
        { backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender },
      ]}
      pressedScale={0.98}
    >
      <Text style={[styles.ownerLine, { color: Accent.lavender }]}>
        {item.ownerName ?? 'A friend'}
      </Text>
      <Text
        style={[
          styles.plateName,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
        numberOfLines={2}
      >
        {item.plateName ?? "Friend's plate"}
      </Text>
      <Text style={[
        styles.reason,
        { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
      ]}>
        {reason}
      </Text>
    </HapticTouchableOpacity>
  );
}

function pantryReason(pct: number): string {
  if (pct >= 80) return `${pct}% from your pantry`;
  if (pct >= 50) return `${pct}% pantry match — short trip`;
  if (pct >= 25) return `${pct}% from your pantry`;
  return 'Worth a pickup';
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    letterSpacing: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.display.medium,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  ownerLine: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  plateName: {
    fontFamily: EditorialFontFamily.display.medium,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  reason: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
