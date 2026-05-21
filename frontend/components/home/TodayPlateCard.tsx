// frontend/components/home/TodayPlateCard.tsx
// ROADMAP 4.0 BAP1.1 — Unified plate framing for Today.
//
// Renders the right framing for the current visit's plate context. Replaces
// the three legacy cards (PantryPlateHeroCard, StretchHomeCard, PlateOfWeekCard)
// — only one variant ever renders per visit (resolved by useTodayPlateContext).
//
// Visual contract: each variant carries an eyebrow + editorial title +
// supporting line + slot/macro preview row. Cold-start invites the user to
// compose their first plate. All variants share the same shape so they
// drop cleanly into the same hero slot.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  EditorialFontFamily,
  EditorialTypography,
} from '../../constants/Typography';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import type { LeftoverInventoryItem, PermutationCandidate } from '../../lib/api';
import type {
  TodayPlateContext,
  TodayPlateOfWeek,
  TodayPlateVariant,
} from '../../hooks/useTodayPlateContext';

const SLOT_EMOJI = {
  protein: '🥩',
  base: '🍚',
  vegetable: '🥬',
  sauce: '🥣',
  garnish: '🌿',
} as const;

const SLOT_PASTEL_BG = {
  protein: Pastel.peach,
  base: Pastel.golden,
  vegetable: Pastel.sage,
  sauce: Pastel.sky,
  garnish: Pastel.lavender,
} as const;

const SLOT_PASTEL_BG_DARK = {
  protein: PastelDark.peach,
  base: PastelDark.golden,
  vegetable: PastelDark.sage,
  sauce: PastelDark.sky,
  garnish: PastelDark.lavender,
} as const;

type SlotKey = keyof typeof SLOT_EMOJI;

interface TodayPlateCardProps {
  context: TodayPlateContext;
}

interface Body {
  eyebrow: string;
  title: string;
  italicWord?: string;
  subtitle: string;
  macroLine?: string;
  slots?: SlotKey[];
  testID: string;
}

function bodyForLeftover(items: LeftoverInventoryItem[]): Body {
  const names = items
    .slice(0, 3)
    .map((i) => i.name ?? 'leftover')
    .join(', ');
  return {
    eyebrow: 'CARRY ON',
    title: "Last night's plate,",
    italicWord: 'stretched',
    subtitle: `${items.length} pieces still waiting — ${names}`,
    slots: (items
      .slice(0, 5)
      .map((i) => i.slot as SlotKey)
      .filter((s) => s in SLOT_EMOJI)) as SlotKey[],
    testID: 'today-plate-card-leftover',
  };
}

function bodyForPantry(plate: PermutationCandidate): Body {
  const totalCal = plate.components.reduce(
    (sum, { component, portionMultiplier }) =>
      sum + Math.round(component.caloriesPerPortion * portionMultiplier),
    0,
  );
  const totalProtein = plate.components.reduce(
    (sum, { component, portionMultiplier }) =>
      sum + Math.round(component.proteinG * portionMultiplier),
    0,
  );
  return {
    eyebrow: 'TONIGHT',
    title: "Plate's",
    italicWord: 'waiting',
    subtitle: `${plate.components.length} components in your pantry — already a plate.`,
    macroLine: `${totalCal} cal · ${totalProtein}g pro · ${plate.pantryCoveragePercent}% match`,
    slots: plate.components.map((c) => c.slot as SlotKey).filter((s) => s in SLOT_EMOJI),
    testID: 'today-plate-card-pantry',
  };
}

function bodyForPlateOfWeek(plate: TodayPlateOfWeek): Body {
  return {
    eyebrow: 'THIS WEEK',
    title: 'A plate to',
    italicWord: 'try',
    subtitle: plate.title,
    macroLine: `${Math.round(plate.totalCalories)} cal · ${Math.round(plate.totalProtein)}g pro`,
    testID: 'today-plate-card-plate-of-week',
  };
}

function bodyForColdStart(): Body {
  return {
    eyebrow: 'BUILD',
    title: 'Compose your',
    italicWord: 'first plate',
    subtitle: 'Pick a protein, a base, a vegetable — Sazon balances the rest.',
    testID: 'today-plate-card-cold-start',
  };
}

function bodyFor(context: TodayPlateContext): Body {
  switch (context.variant) {
    case 'leftover':
      return bodyForLeftover(context.leftovers);
    case 'pantry':
      return bodyForPantry(context.pantryPlate!);
    case 'plateOfWeek':
      return bodyForPlateOfWeek(context.weekPlate!);
    case 'coldStart':
    default:
      return bodyForColdStart();
  }
}

/** Exported variant-to-CTA-label map for the hero. Lifestyle voice. */
export function ctaLabelFor(variant: TodayPlateVariant): string {
  switch (variant) {
    case 'leftover':
      return 'Stretch in Build-a-Plate';
    case 'pantry':
      return 'Open in Build-a-Plate';
    case 'plateOfWeek':
      return 'Open in Build-a-Plate';
    case 'coldStart':
    default:
      return 'Start a plate';
  }
}

export default function TodayPlateCard({ context }: TodayPlateCardProps) {
  const { isDark } = useTheme();

  const body = bodyFor(context);

  const eyebrowColor = isDark ? Accent.sage : '#2E5931';
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const macroColor = isDark ? '#6B7280' : '#9CA3AF';
  const accentOrange = '#FB923C';

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${body.eyebrow}. ${body.title} ${body.italicWord ?? ''}. ${body.subtitle}`}
      testID={body.testID}
    >
      <Text style={[EditorialTypography.eyebrow, styles.eyebrow, { color: eyebrowColor }]}>
        {body.eyebrow}
      </Text>

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: titleColor }]}>{body.title} </Text>
        {body.italicWord ? (
          <Text style={[styles.titleItalic, { color: titleColor }]}>
            {body.italicWord}
          </Text>
        ) : null}
        <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
      </View>

      <Text style={[styles.subtitle, { color: subtitleColor }]}>{body.subtitle}</Text>

      {body.slots && body.slots.length > 0 && (
        <View style={styles.slotIconRow} testID="today-plate-slot-row">
          {body.slots.map((slot, idx) => (
            <View
              key={`${slot}-${idx}`}
              style={[
                styles.slotIcon,
                {
                  backgroundColor: isDark
                    ? SLOT_PASTEL_BG_DARK[slot]
                    : SLOT_PASTEL_BG[slot],
                },
              ]}
            >
              <Text style={styles.slotEmoji}>{SLOT_EMOJI[slot]}</Text>
            </View>
          ))}
        </View>
      )}

      {body.macroLine ? (
        <Text style={[styles.macros, { color: macroColor }]}>{body.macroLine}</Text>
      ) : null}

      {context.variant === 'coldStart' && (
        <View style={styles.coldStartHintRow}>
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={isDark ? Accent.sage : '#2E5931'}
          />
          <Text style={[styles.coldStartHint, { color: eyebrowColor }]}>
            Takes about a minute
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  eyebrow: {
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  slotIconRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: {
    fontSize: 18,
  },
  macros: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  coldStartHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  coldStartHint: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
