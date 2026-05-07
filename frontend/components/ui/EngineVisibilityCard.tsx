// frontend/components/ui/EngineVisibilityCard.tsx
// ROADMAP 4.0 N4.3 — Shared shell for IG10 / WK14 / HX5 editorial cards.
//
// Three editorial cards across three tiers ship the same primitive ("make
// the engine's reasoning visible"): IG10.1 Pantry IQ, WK14.1 Plan IQ,
// HX5.1 almost-made-it. This component is the shell: pastel WidgetCard
// wrapper, eyebrow + title + 3-row stat strip + optional tap-target footer.
//
// Each consumer (PantryIQCard / PlanIQCard / AlmostMadeItPeek) is a thin
// wrapper that fetches its data + hands rows to this shell.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';

export type EngineVisibilityVariant = 'lavender' | 'sage' | 'sky' | 'peach';

export interface EngineVisibilityRow {
  /** Short label on the left (e.g., "Top cuisine"). */
  label: string;
  /** Primary value on the right (e.g., "Mediterranean — 4 cooks/wk"). */
  value: string;
  /** Optional muted secondary line below the value. */
  subValue?: string;
  /** When set, the row is tappable — fires this callback. */
  onPress?: () => void;
  /** Optional accessibility hint for tappable rows. */
  accessibilityHint?: string;
}

export interface EngineVisibilityCardProps {
  /** Optional eyebrow (small uppercase line above the title). */
  eyebrow?: string;
  /** Card title (Fraunces / display weight). */
  title: string;
  /** Up to 3 stat rows — extra rows truncated. */
  rows: EngineVisibilityRow[];
  /** Optional CTA at the bottom — when set, renders a tappable footer line. */
  footerCta?: { label: string; onPress: () => void };
  /** Pastel tint for the card background. Default 'lavender'. */
  variant?: EngineVisibilityVariant;
  /** Test id for the outer card. */
  testID?: string;
}

const VARIANT_LIGHT: Record<EngineVisibilityVariant, string> = {
  lavender: Pastel.lavender,
  sage: Pastel.sage,
  sky: Pastel.sky,
  peach: Pastel.peach,
};
const VARIANT_DARK: Record<EngineVisibilityVariant, string> = {
  lavender: PastelDark.lavender,
  sage: PastelDark.sage,
  sky: PastelDark.sky,
  peach: PastelDark.peach,
};
const VARIANT_ACCENT: Record<EngineVisibilityVariant, string> = {
  lavender: Accent.lavender,
  sage: Accent.sage,
  sky: Accent.sky,
  peach: Accent.peach,
};

const MAX_ROWS = 3;

export default function EngineVisibilityCard({
  eyebrow,
  title,
  rows,
  footerCta,
  variant = 'lavender',
  testID,
}: EngineVisibilityCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? VARIANT_DARK[variant] : VARIANT_LIGHT[variant];
  const accent = VARIANT_ACCENT[variant];
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const visible = rows.slice(0, MAX_ROWS);

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`${title}: ${visible.map((r) => `${r.label} ${r.value}`).join('. ')}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      <View style={styles.rows}>
        {visible.map((row, idx) => {
          const inner = (
            <View style={styles.row}>
              <Text style={[styles.label, { color: subtle }]} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={styles.valueColumn}>
                <Text style={[styles.value, { color: text }]} numberOfLines={1}>
                  {row.value}
                </Text>
                {row.subValue ? (
                  <Text style={[styles.subValue, { color: subtle }]} numberOfLines={1}>
                    {row.subValue}
                  </Text>
                ) : null}
              </View>
            </View>
          );
          if (row.onPress) {
            return (
              <HapticTouchableOpacity
                key={idx}
                testID={`engine-visibility-row-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}: ${row.value}`}
                accessibilityHint={row.accessibilityHint}
                onPress={row.onPress}
                style={styles.tappableRow}
              >
                {inner}
              </HapticTouchableOpacity>
            );
          }
          return (
            <View key={idx} testID={`engine-visibility-row-${idx}`}>
              {inner}
            </View>
          );
        })}
      </View>
      {footerCta ? (
        <HapticTouchableOpacity
          testID="engine-visibility-footer-cta"
          accessibilityRole="button"
          accessibilityLabel={footerCta.label}
          onPress={footerCta.onPress}
          style={styles.footer}
        >
          <Text style={[styles.footerLabel, { color: accent }]}>
            {footerCta.label}
          </Text>
        </HapticTouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 12,
  },
  tappableRow: {
    marginVertical: -2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    flexBasis: 100,
  },
  valueColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  subValue: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
