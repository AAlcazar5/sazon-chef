// frontend/components/home/BrowseByFamilySection.tsx
//
// Group 11 Phase 5 — "Browse by Region" personalized family ranking.
//
// Renders cuisine families ordered by THIS user's affinity, with a
// "New for you" badge on families that contain unexplored cuisines
// adjacent to the user's affinity. A static map/grid is the laziest
// possible browse view; this surface bends every cell to who's looking.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { recipeApi } from '../../lib/api';
import { Pastel, EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';
import { EditorialSectionHeader } from './EditorialSectionHeader';
import HomeLoadingState from './HomeLoadingState';

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.golden, Pastel.blush];

export interface FamilyEntry {
  family: string;
  cuisines: string[];
  affinityScore: number;
  exploredCuisines: string[];
  isExplored: boolean;
  hasNewForYou: boolean;
}

export interface BrowseByFamilyResponse {
  families: FamilyEntry[];
}

interface BrowseByFamilySectionProps {
  isDark: boolean;
  onFamilyPress: (family: FamilyEntry) => void;
  /** Optional override — primarily for tests. */
  familiesOverride?: FamilyEntry[] | null;
}

export function BrowseByFamilySection({
  isDark,
  onFamilyPress,
  familiesOverride,
}: BrowseByFamilySectionProps) {
  const [families, setFamilies] = useState<FamilyEntry[] | null>(familiesOverride ?? null);
  const [loading, setLoading] = useState<boolean>(familiesOverride === undefined);
  const [error, setError] = useState<boolean>(false);

  const fetchFamilies = useCallback(async () => {
    if (familiesOverride !== undefined) return;
    try {
      setError(false);
      setLoading(true);
      const res = await recipeApi.getBrowseByFamily();
      const data = (res.data ?? res) as BrowseByFamilyResponse;
      setFamilies(data.families ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [familiesOverride]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  if (loading) {
    return (
      <View accessibilityLabel="Loading browse-by-family">
        <HomeLoadingState viewMode="grid" />
      </View>
    );
  }

  if (error || !families || families.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel="Browse by region"
    >
      <EditorialSectionHeader
        emoji="🌍"
        title="Browse by Region"
        subtitle="Ordered by what you cook most"
        isDark={isDark}
        isCollapsed={false}
        onToggle={() => {}}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {families.map((entry, idx) => {
          const bg = PASTEL_ROTATION[idx % PASTEL_ROTATION.length];
          return (
            <FamilyCard
              key={entry.family}
              entry={entry}
              bg={bg}
              isDark={isDark}
              onPress={() => {
                HapticPatterns.buttonPress();
                onFamilyPress(entry);
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

interface FamilyCardProps {
  entry: FamilyEntry;
  bg: string;
  isDark: boolean;
  onPress: () => void;
}

function FamilyCard({ entry, bg, isDark, onPress }: FamilyCardProps) {
  const accessibilityLabel =
    entry.hasNewForYou
      ? `${entry.family} family, new for you`
      : entry.isExplored
      ? `${entry.family} family, ${entry.exploredCuisines.length} explored`
      : `${entry.family} family`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: bg }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={`family-card-${entry.family}`}
    >
      <View style={styles.cardHeader}>
        <Text
          numberOfLines={1}
          style={[styles.familyName, { color: isDark ? '#F5EFE6' : '#3F2A1B' }]}
        >
          {entry.family}
        </Text>

        {entry.hasNewForYou ? (
          <View
            style={styles.badge}
            accessibilityLabel="New for you badge"
            testID={`new-for-you-badge-${entry.family}`}
          >
            <Ionicons name="sparkles" size={10} color="#5B4636" />
            <Text style={styles.badgeText}>New for you</Text>
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={2}
        style={[styles.cuisineList, { color: isDark ? 'rgba(245,239,230,0.78)' : 'rgba(63,42,27,0.7)' }]}
      >
        {entry.cuisines.slice(0, 4).join(' · ')}
        {entry.cuisines.length > 4 ? ` · +${entry.cuisines.length - 4} more` : ''}
      </Text>

      {entry.isExplored ? (
        <View style={styles.exploredRow} accessibilityLabel="Explored cuisines">
          <Ionicons name="checkmark-circle" size={12} color="#5B4636" />
          <Text style={styles.exploredText}>
            {entry.exploredCuisines.length} cooked
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const CARD_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 20,
    minHeight: 120,
    justifyContent: 'space-between',
    ...EditorialShadows.cardRaised.ios,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  familyName: {
    flex: 1,
    fontSize: 18,
    fontFamily: EditorialFontFamily.body.bold,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5B4636',
  },
  cuisineList: {
    fontSize: 13,
    marginTop: 8,
    fontFamily: EditorialFontFamily.body.bold,
    fontStyle: 'italic',
  },
  exploredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  exploredText: {
    fontSize: 11,
    color: '#5B4636',
    fontWeight: '600',
  },
});
