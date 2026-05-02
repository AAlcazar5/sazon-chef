// frontend/components/shopping/ArchiveView.tsx
// Compact archive view — renders one row per archived shopping list.
// Long-press a row to restore the list as active.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { shoppingListApi } from '../../lib/api';
import { triggerHaptic, HapticPatterns } from '../../constants/Haptics';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArchiveListItem {
  id: string;
  name: string;
}

export interface ArchivedList {
  id: string;
  name: string;
  archivedAt: string;
  tier: 'archived' | 'older';
  items: ArchiveListItem[];
  summaryStats?: string | null;
}

interface ArchiveViewProps {
  lists: ArchivedList[];
  onRestore: (listId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function isOlderThan90Days(archivedAt: string): boolean {
  return Date.now() - new Date(archivedAt).getTime() > NINETY_DAYS_MS;
}

function relativeDate(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function parseSummaryStats(raw: string | null | undefined): { totalSpentCents?: number; itemCount?: number } {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── Row component ─────────────────────────────────────────────────────────────

interface RowProps {
  list: ArchivedList;
  onRestorePress: (id: string) => void;
  isDark: boolean;
}

function ArchiveRow({ list, onRestorePress, isDark }: RowProps) {
  const itemCount = list.items?.length ?? 0;
  const dateLabel = relativeDate(list.archivedAt);

  const stats = parseSummaryStats(list.summaryStats);
  const spentLabel =
    stats.totalSpentCents != null
      ? `$${(stats.totalSpentCents / 100).toFixed(2)} spent`
      : null;

  return (
    <HapticTouchableOpacity
      testID={`archive-row-${list.id}`}
      accessibilityLabel={`${list.name}, archived ${dateLabel}, ${itemCount} items. Long press to restore.`}
      accessibilityRole="button"
      onLongPress={() => onRestorePress(list.id)}
      style={[
        styles.row,
        isDark ? styles.rowDark : styles.rowLight,
      ]}
    >
      <View style={styles.rowContent}>
        <Text
          style={[styles.rowName, isDark ? styles.textDark : styles.textLight]}
          numberOfLines={1}
        >
          {list.name}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.metaText, isDark ? styles.metaTextDark : styles.metaTextLight]}>
            {dateLabel}
          </Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={[styles.metaText, isDark ? styles.metaTextDark : styles.metaTextLight]}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
          {spentLabel ? (
            <>
              <Text style={styles.metaDot}> · </Text>
              <Text style={[styles.metaText, isDark ? styles.metaTextDark : styles.metaTextLight]}>
                {spentLabel}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ArchiveView({ lists, onRestore }: ArchiveViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [olderExpanded, setOlderExpanded] = useState(false);

  const handleRestore = useCallback(
    async (listId: string) => {
      triggerHaptic(HapticPatterns.MEDIUM_IMPACT);
      try {
        await shoppingListApi.restoreList(listId);
        onRestore(listId);
      } catch {
        // Silently ignore — caller can handle toast
      }
    },
    [onRestore],
  );

  const normalizedQuery = query.toLowerCase().trim();

  function matchesQuery(list: ArchivedList): boolean {
    if (!normalizedQuery) return true;
    const nameMatch = list.name.toLowerCase().includes(normalizedQuery);
    const dateMatch = list.archivedAt.slice(0, 10).includes(normalizedQuery);
    return nameMatch || dateMatch;
  }

  const recentLists = lists
    .filter(l => !isOlderThan90Days(l.archivedAt))
    .filter(matchesQuery);

  const olderLists = lists
    .filter(l => isOlderThan90Days(l.archivedAt))
    .filter(matchesQuery);

  if (lists.length === 0) {
    return (
      <AnimatedEmptyState
        title="No archives yet."
        useMascot
        mascotExpression="sleepy"
        mascotSize="medium"
      />
    );
  }

  const totalItems = olderLists.reduce((sum, l) => {
    const stats = parseSummaryStats(l.summaryStats);
    return sum + (stats.itemCount ?? l.items?.length ?? 0);
  }, 0);

  return (
    <View style={styles.container}>
      <TextInput
        testID="archive-search"
        style={[styles.searchBar, isDark ? styles.searchBarDark : styles.searchBarLight]}
        placeholder="Search by name or date (YYYY-MM-DD)"
        placeholderTextColor={isDark ? DarkColors.textSecondary : '#9CA3AF'}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search archived lists"
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {recentLists.map(list => (
          <ArchiveRow
            key={list.id}
            list={list}
            onRestorePress={handleRestore}
            isDark={isDark}
          />
        ))}

        {olderLists.length > 0 && (
          <View testID="older-bucket" style={styles.olderBucket}>
            <HapticTouchableOpacity
              accessibilityLabel={`Older lists section, ${olderLists.length} lists. Tap to ${olderExpanded ? 'collapse' : 'expand'}.`}
              accessibilityRole="button"
              onPress={() => setOlderExpanded(prev => !prev)}
              style={styles.olderHeader}
            >
              <Text style={[styles.olderTitle, isDark ? styles.textDark : styles.textLight]}>
                Older
              </Text>
              <Text style={[styles.olderMeta, isDark ? styles.metaTextDark : styles.metaTextLight]}>
                {olderLists.length} {olderLists.length === 1 ? 'list' : 'lists'} · {totalItems} items
              </Text>
            </HapticTouchableOpacity>

            {olderExpanded &&
              olderLists.map(list => (
                <ArchiveRow
                  key={list.id}
                  list={list}
                  onRestorePress={handleRestore}
                  isDark={isDark}
                />
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.input ?? 12,
    fontSize: FontSize.body,
  },
  searchBarLight: {
    backgroundColor: '#F0EDE8',
    color: '#111827',
  },
  searchBarDark: {
    backgroundColor: '#2A2A2A',
    color: '#F0EDE8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    borderRadius: BorderRadius.card ?? 20,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    ...Shadows.SM,
  },
  rowLight: {
    backgroundColor: '#FAFAF8',
  },
  rowDark: {
    backgroundColor: '#1E1E1E',
  },
  rowContent: {
    gap: 2,
  },
  rowName: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  textLight: {
    color: '#111827',
  },
  textDark: {
    color: '#F0EDE8',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: FontSize.caption,
  },
  metaTextLight: {
    color: '#6B7280',
  },
  metaTextDark: {
    color: '#9CA3AF',
  },
  metaDot: {
    color: '#9CA3AF',
    fontSize: FontSize.caption,
  },
  olderBucket: {
    marginTop: Spacing.md,
  },
  olderHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  olderTitle: {
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  olderMeta: {
    fontSize: FontSize.caption,
  },
});
