// frontend/components/today/DiscoveryStrip.tsx
// ROADMAP 4.0 HX3.2 — unified horizontal discovery strip.
//
// Compresses six previously-stacked surfaces (FirstOfDayNote,
// NutritionStrip, SeasonalProduceCard, TodayDiscoveryCard,
// CohortSocialProofPill, SundayPolaroidCard) into one horizontal scroll
// above QuickActionRow. Each surface becomes a card; the strip owns
// layout + per-card empty handling. Cold-start (no signals) hides the
// entire strip cleanly.
//
// This shell is layout-only — it accepts pre-built React node children
// keyed by surface id, alongside per-surface "has data" flags. The
// caller decides which sources are populated; the strip decides which
// cards to show and in what order.
import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  type FlatListProps,
  type ListRenderItem,
} from 'react-native';

export type DiscoverySurfaceId =
  | 'firstOfDay'
  | 'nutrition'
  | 'seasonalProduce'
  | 'todayDiscovery'
  | 'cohortSocialProof'
  | 'sundayPolaroid';

export interface DiscoverySurface {
  id: DiscoverySurfaceId;
  /** Pre-rendered card body. The strip wraps it with consistent spacing. */
  node: React.ReactNode;
  /**
   * If false, the surface is dropped entirely — no card, no spacer.
   * Empty surfaces never paint a placeholder.
   */
  hasData: boolean;
  /**
   * Optional priority for ordering. Lower numbers come first. Surfaces
   * with no priority keep input order (stable sort).
   */
  priority?: number;
}

interface DiscoveryStripProps {
  surfaces: ReadonlyArray<DiscoverySurface>;
  /** Allows tests / parents to inject FlatList props. */
  scrollProps?: Partial<FlatListProps<DiscoverySurface>>;
}

const STABLE_DEFAULT_PRIORITY = 1000;

export const DiscoveryStrip: React.FC<DiscoveryStripProps> = ({
  surfaces,
  scrollProps,
}) => {
  const visible = filterAndSort(surfaces);

  const renderItem = useCallback<ListRenderItem<DiscoverySurface>>(
    ({ item: s }) => (
      <View style={styles.cardSlot} testID={`discovery-card-${s.id}`}>
        {s.node}
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((s: DiscoverySurface) => s.id, []);

  if (visible.length === 0) return null;

  return (
    <FlatList
      horizontal
      data={visible}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      testID="discovery-strip"
      initialNumToRender={3}
      windowSize={5}
      removeClippedSubviews
      {...scrollProps}
    />
  );
};

/**
 * Pure ordering helper. Drops `hasData=false`, sorts by priority asc,
 * preserves input order on ties.
 */
export function filterAndSort(
  surfaces: ReadonlyArray<DiscoverySurface>
): DiscoverySurface[] {
  return surfaces
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.hasData)
    .sort((a, b) => {
      const pa = a.s.priority ?? STABLE_DEFAULT_PRIORITY;
      const pb = b.s.priority ?? STABLE_DEFAULT_PRIORITY;
      if (pa !== pb) return pa - pb;
      return a.i - b.i;
    })
    .map(({ s }) => s);
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 4,
  },
  cardSlot: {
    width: 280,
  },
});

export default DiscoveryStrip;
