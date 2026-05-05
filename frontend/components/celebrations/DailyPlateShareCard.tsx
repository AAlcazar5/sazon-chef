// frontend/components/celebrations/DailyPlateShareCard.tsx
// ROADMAP 4.0 Tier J15 — Share-able discovery rings card.
//
// Composes ConcentricRings + top minerals + today's dishes + a Sazon signature
// into a screenshot-shareable card. Anonymous-by-default; identity toggle adds
// the user's first name on tap. Self-contained capture-and-share flow via
// ViewShot's captureRef + expo-sharing. Frames discovery as identity, not
// optimization (anti-tracker). Source: P-003 from the 2026-05-05 synthesis pass.

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ConcentricRings from '../ui/ConcentricRings';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface DailyPlateShareCardProps {
  /** Total distinct ingredients across today's cooked dishes. */
  ingredientCount: number;
  /** Top minerals discovered today, descending. First entry is "top mineral". */
  topMinerals: string[];
  /** Dish names cooked today. */
  dishNames: string[];
  /** Optional first name; rendered only when the identity toggle is on. */
  userFirstName?: string;
}

/** Saturating progress ratio — 0..1, never above 1. */
const ratio = (count: number, target: number): number =>
  Math.max(0, Math.min(1, count / target));

const RING_SIZE = 140;
const INGREDIENT_BREADTH_TARGET = 24;
const INGREDIENT_VARIETY_TARGET = 16;
const INGREDIENT_DEPTH_TARGET = 8;

export default function DailyPlateShareCard({
  ingredientCount,
  topMinerals,
  dishNames,
  userFirstName,
}: DailyPlateShareCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showIdentity, setShowIdentity] = useState(false);
  const cardRef = useRef<View | null>(null);

  if (dishNames.length === 0 || ingredientCount === 0) return null;

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const accent = Accent.sage;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const topMineral = topMinerals[0] ?? '';
  const dishesLine = dishNames.join(' · ');
  const a11yLabel =
    `Today's plate: ${ingredientCount} ingredients` +
    (topMineral ? `, top mineral ${topMineral}` : '') +
    (dishNames.length > 0 ? `, ${dishesLine}` : '');

  const rings = [
    { progress: ratio(ingredientCount, INGREDIENT_BREADTH_TARGET), color: [Accent.sage, '#66BB6A'] as string[] },
    { progress: ratio(ingredientCount, INGREDIENT_VARIETY_TARGET), color: [Accent.peach, '#FB923C'] as string[] },
    { progress: ratio(ingredientCount, INGREDIENT_DEPTH_TARGET), color: [Accent.lavender, '#9C7AD9'] as string[] },
  ];

  const handleShare = async (): Promise<void> => {
    try {
      if (!cardRef.current) return;
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: "Today's plate",
        });
      }
    } catch {
      // best-effort
    }
  };

  return (
    <View
      ref={cardRef}
      testID="daily-plate-share-card"
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="leaf-outline" size={14} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>TODAY&apos;S PLATE</Text>
      </View>

      <View style={styles.heroRow}>
        <ConcentricRings
          testID="daily-plate-share-card-rings"
          size={RING_SIZE}
          rings={rings}
          strokeWidth={10}
          ringGap={3}
        >
          <Text style={[styles.ringNumber, { color: text }]}>{ingredientCount}</Text>
          <Text style={[styles.ringLabel, { color: sub }]}>ingredients</Text>
        </ConcentricRings>

        <View style={styles.statsCol}>
          {topMineral ? (
            <>
              <Text style={[styles.statLabel, { color: sub }]}>TOP MINERAL</Text>
              <Text style={[styles.statValue, { color: text }]} numberOfLines={1}>
                {topMineral}
              </Text>
            </>
          ) : null}
          {topMinerals.length > 1 ? (
            <Text style={[styles.statSub, { color: sub }]} numberOfLines={2}>
              {topMinerals.slice(1).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.dishesLabel, { color: sub }]}>YOU COOKED</Text>
      <Text style={[styles.dishesBody, { color: text }]} numberOfLines={2}>
        {dishesLine}
      </Text>

      {showIdentity && userFirstName ? (
        <Text style={[styles.identityLine, { color: sub }]}>by {userFirstName}</Text>
      ) : null}

      <View style={styles.signatureRow}>
        <Text style={[styles.signature, { color: text }]}>Sazon</Text>
        <Text style={[styles.signatureSub, { color: sub }]}>
          eat the world, live well
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <HapticTouchableOpacity
          testID="daily-plate-share-card-share"
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share today's plate"
          pressedScale={0.97}
          hapticStyle="light"
          style={[styles.shareBtn, { backgroundColor: 'rgba(255,255,255,0.55)' }]}
        >
          <Ionicons name="share-outline" size={14} color={accent} />
          <Text style={[styles.shareLabel, { color: accent }]}>Share today&apos;s plate</Text>
        </HapticTouchableOpacity>

        {userFirstName ? (
          <HapticTouchableOpacity
            testID="daily-plate-share-card-identity-toggle"
            onPress={() => setShowIdentity((prev) => !prev)}
            accessibilityRole="switch"
            accessibilityLabel={
              showIdentity ? 'Hide your name on the share card' : 'Show your name on the share card'
            }
            accessibilityState={{ checked: showIdentity }}
            pressedScale={0.95}
            hapticStyle="light"
            style={styles.identityBtn}
          >
            <Ionicons
              name={showIdentity ? 'person' : 'person-outline'}
              size={14}
              color={accent}
            />
          </HapticTouchableOpacity>
        ) : null}
      </View>
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsCol: {
    flex: 1,
    gap: 2,
  },
  ringNumber: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  ringLabel: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  statLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  statSub: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  dishesLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  dishesBody: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  identityLine: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
  },
  signature: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  signatureSub: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  shareLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  identityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
