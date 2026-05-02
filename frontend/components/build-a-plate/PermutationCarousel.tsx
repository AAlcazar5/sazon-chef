// frontend/components/build-a-plate/PermutationCarousel.tsx
// Group 10X Phase 2 — "More like this" carousel of alternative plate permutations.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import { mealComponentApi, type PermutationCandidate, type MealComponentSlot } from '../../lib/api';

interface LockedSlot {
  slot: MealComponentSlot;
  componentId: string;
}

interface PermutationCarouselProps {
  lockedSlots: LockedSlot[];
  slotsToFill: MealComponentSlot[];
  onApply: (permutation: PermutationCandidate) => void;
  testID?: string;
}

const SLOT_COLORS: Record<MealComponentSlot, string> = {
  protein: Accent.sage,
  base: Accent.golden,
  vegetable: '#66BB6A',
  sauce: Accent.lavender,
  garnish: Accent.peach,
};

function PermutationCard({
  permutation,
  onApply,
  testID,
}: {
  permutation: PermutationCandidate;
  onApply: (p: PermutationCandidate) => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const totalCal = permutation.components.reduce(
    (sum, c) => sum + c.component.caloriesPerPortion * c.portionMultiplier,
    0,
  );
  const totalProtein = permutation.components.reduce(
    (sum, c) => sum + c.component.proteinG * c.portionMultiplier,
    0,
  );

  return (
    <HapticTouchableOpacity
      onPress={() => onApply(permutation)}
      hapticStyle="medium"
      pressedScale={0.97}
      style={[
        styles.card,
        { backgroundColor: isDark ? '#1C1C1E' : '#FAF7F4' },
        Shadows.SM as any,
      ]}
      testID={testID}
      accessibilityLabel={`Alternative plate, ${Math.round(permutation.pantryCoveragePercent)}% pantry coverage`}
    >
      <View style={styles.circles}>
        {permutation.components.slice(0, 4).map((c, idx) => (
          <View
            key={c.slot}
            style={[
              styles.circle,
              { backgroundColor: SLOT_COLORS[c.slot] ?? Pastel.sage },
              idx > 0 && styles.circleOverlap,
            ]}
          />
        ))}
      </View>

      <View style={styles.cardMacros}>
        <Text style={[styles.cardCal, { color: isDark ? '#FFF' : '#1F2937' }]}>
          {Math.round(totalCal)} cal
        </Text>
        <Text style={styles.cardProtein}>{Math.round(totalProtein)}g P</Text>
      </View>

      <View style={[styles.coverageBadge, { backgroundColor: Pastel.sage }]}>
        <Text style={styles.coverageText}>{Math.round(permutation.pantryCoveragePercent)}%</Text>
      </View>
    </HapticTouchableOpacity>
  );
}

export default function PermutationCarousel({
  lockedSlots,
  slotsToFill,
  onApply,
  testID,
}: PermutationCarouselProps) {
  const [permutations, setPermutations] = useState<PermutationCandidate[]>([]);

  const lockedKey = useMemo(
    () => lockedSlots.map((l) => `${l.slot}:${l.componentId}`).sort().join('|'),
    [lockedSlots],
  );
  const slotsKey = useMemo(() => [...slotsToFill].sort().join('|'), [slotsToFill]);

  useEffect(() => {
    if (lockedSlots.length === 0 && slotsToFill.length === 0) return;

    let cancelled = false;
    mealComponentApi
      .permutations({
        lockedSlots,
        slotsToFill,
        maxResults: 6,
        prioritizePantry: true,
      })
      .then((res) => {
        if (!cancelled) {
          setPermutations(res.data?.permutations ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setPermutations([]);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedKey, slotsKey]);

  if (permutations.length === 0) return null;

  return (
    <View testID={testID} accessibilityLabel="More like this">
      <Text style={styles.heading}>More like this</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {permutations.map((perm) => (
          <PermutationCard
            key={perm.id}
            permutation={perm}
            onApply={onApply}
            testID={`permutation-card-${perm.id}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 130,
    borderRadius: BorderRadius.card,
    padding: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  circles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  circleOverlap: {
    marginLeft: -6,
  },
  cardMacros: {
    gap: 2,
  },
  cardCal: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  cardProtein: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#6B7280',
  },
  coverageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  coverageText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: '#2E5931',
  },
});
