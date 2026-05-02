// frontend/components/recipe/PlateVariationsSheet.tsx
// Group 10X Phase 1+2 — bottom sheet that shows 3 plate variations
// (single-slot swaps) for a saved user-composed plate. Each card
// navigates back into the composer pre-filled with the variation.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BottomSheet from '../ui/BottomSheet';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { composedPlateApi, type PlateVariation } from '../../lib/api';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';

interface PlateVariationsSheetProps {
  plateId: string;
  visible: boolean;
  onClose: () => void;
}

const SLOT_PASTEL: Record<string, string> = {
  protein: Pastel.peach,
  base: Pastel.golden,
  vegetable: Pastel.sage,
  sauce: Pastel.sky,
  garnish: Pastel.lavender,
};

const SLOT_PASTEL_DARK: Record<string, string> = {
  protein: PastelDark.peach,
  base: PastelDark.golden,
  vegetable: PastelDark.sage,
  sauce: PastelDark.sky,
  garnish: PastelDark.lavender,
};

export default function PlateVariationsSheet({
  plateId,
  visible,
  onClose,
}: PlateVariationsSheetProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [variations, setVariations] = useState<PlateVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [didLoad, setDidLoad] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setIsLoading(true);
    setDidLoad(false);
    (async () => {
      try {
        const res = await composedPlateApi.fetchVariations(plateId);
        if (!cancelled) {
          setVariations(res.data?.variations ?? []);
        }
      } catch {
        if (!cancelled) {
          setVariations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setDidLoad(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [visible, plateId]);

  const handleSelectVariation = useCallback((variationId: string) => {
    onClose();
    router.push({
      pathname: '/build-a-plate',
      params: { plateId: variationId },
    });
  }, [router, onClose]);

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const macroColor = isDark ? '#9CA3AF' : '#4B5563';
  const accentOrange = '#FB923C';

  const showEmpty = didLoad && !isLoading && variations.length === 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Vary this plate"
      snapPoints={['65%', '85%']}
      scrollable
    >
      <View style={styles.header}>
        <Text style={[EditorialTypography.eyebrow, { color: Accent.sage }]}>
          ONE SWAP, FRESH IDEAS
        </Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: titleColor }]}>Try a small </Text>
          <Text style={[styles.titleItalic, { color: titleColor }]}>twist</Text>
          <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
        </View>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          Same plate, one component swapped — pick a riff to open in the composer.
        </Text>
      </View>

      {showEmpty && (
        <View style={styles.emptyState} testID="plate-variations-empty">
          <Text style={[styles.emptyText, { color: subtitleColor }]}>
            No variations yet — try saving more components first.
          </Text>
        </View>
      )}

      {!showEmpty && variations.map((v) => {
        const slotColor = isDark ? SLOT_PASTEL_DARK[v.swappedSlot] : SLOT_PASTEL[v.swappedSlot];
        return (
          <HapticTouchableOpacity
            key={v.id}
            onPress={() => handleSelectVariation(v.id)}
            accessibilityLabel={`${v.title}, ${v.swappedFrom} swapped to ${v.swappedTo}`}
            testID={`plate-variation-card-${v.id}`}
            style={[styles.card, { backgroundColor: slotColor ?? Pastel.sage }]}
          >
            <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={2}>
              {v.title}
            </Text>
            <Text style={[styles.cardSwap, { color: subtitleColor }]} numberOfLines={1}>
              {`${v.swappedFrom} → ${v.swappedTo}`}
            </Text>
            <Text style={[styles.cardMacros, { color: macroColor }]}>
              {`${Math.round(v.totalCalories)} cal · ${Math.round(v.totalProtein)}g protein`}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </BottomSheet>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: BorderRadius.card,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
    ...cardShadow,
  },
  cardTitle: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  cardSwap: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  cardMacros: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    textAlign: 'center',
  },
});
