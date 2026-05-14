// frontend/components/ui/CuisinePicker.tsx
// Hierarchical cuisine filter — region chips at the top level act as
// filters in their own right (tap toggles the whole region) AND as entry
// points to the per-cuisine drilldown (tap the chevron to expand). Lets
// users pick "Latin America" as a single filter or refine down to "Peruvian
// + Brazilian" without flooding the sheet with a wall of pills.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import FilterPill from './FilterPill';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { CUISINE_REGIONS, regionForCuisine, CuisineRegion } from '../../utils/cuisineTaxonomy';

interface CuisinePickerProps {
  selectedCuisines: string[];
  /** Toggle a single cuisine in/out. */
  onToggle: (cuisine: string) => void;
  /** Replace the whole cuisine selection — used for select-all / deselect-all
   *  on a region chip. The picker computes the new array; parent wires it
   *  straight through to `onFilterChange('cuisines', newArray)`. */
  onReplace: (newSelection: string[]) => void;
}

type RegionSelectionState = 'none' | 'partial' | 'all';

const SPRING = { damping: 18, stiffness: 220 };

export default function CuisinePicker({
  selectedCuisines,
  onToggle,
  onReplace,
}: CuisinePickerProps) {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  // Row layout is measured ONCE per container width. We render chips in a
  // single flex-wrap on the first pass, capture each chip's y, group them
  // into rows, then "commit" that grouping. Once committed, onLayout callbacks
  // are ignored — otherwise re-mounting chips inside row sub-Views resets
  // their y to 0 (relative to the new parent) and we'd ping-pong between
  // layouts forever.
  const [chipYs, setChipYs] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<CuisineRegion[][] | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleChipLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      // Once rows are committed we never re-derive from chip y — measurement
      // becomes inert. This is the gate that stops the layout loop.
      if (rows !== null) return;
      const y = e.nativeEvent.layout.y;
      setChipYs((prev) =>
        prev[key] !== undefined && Math.abs(prev[key] - y) < 1
          ? prev
          : { ...prev, [key]: y },
      );
    },
    [rows],
  );

  // Container width tracking — only used to invalidate the committed row
  // grouping when the picker actually changes width (orientation change,
  // dynamic-type swap). Same-width re-renders are no-ops.
  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (Math.abs(w - containerWidth) < 1) return;
      const hadPriorWidth = containerWidth > 0;
      setContainerWidth(w);
      if (hadPriorWidth) {
        // Width really changed — invalidate the locked rows and re-measure.
        setRows(null);
        setChipYs({});
      }
    },
    [containerWidth],
  );

  // Commit row grouping once every chip has reported a y in single-wrap mode.
  useEffect(() => {
    if (rows !== null) return;
    const measured = CUISINE_REGIONS.every((r) => chipYs[r.key] !== undefined);
    if (!measured) return;
    const buckets = new Map<number, CuisineRegion[]>();
    for (const region of CUISINE_REGIONS) {
      const yKey = Math.round(chipYs[region.key]);
      const bucket = buckets.get(yKey) ?? [];
      bucket.push(region);
      buckets.set(yKey, bucket);
    }
    const next = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, regs]) => regs);
    setRows(next);
  }, [chipYs, rows]);

  // Per-region selected count — cheap (≤ 9 regions, ≤ 60 cuisines).
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cuisine of selectedCuisines) {
      const region = regionForCuisine(cuisine);
      if (region) counts[region] = (counts[region] ?? 0) + 1;
    }
    return counts;
  }, [selectedCuisines]);

  const handleRegionToggle = (region: CuisineRegion) => {
    const regionNames = region.cuisines.map((c) => c.name);
    const selectedSet = new Set(selectedCuisines);
    const allSelected = regionNames.every((n) => selectedSet.has(n));

    if (allSelected) {
      // Remove every cuisine in this region from the selection.
      const next = selectedCuisines.filter((c) => !regionNames.includes(c));
      onReplace(next);
    } else {
      // Add every cuisine in this region (union, dedupe).
      const next = [...selectedCuisines];
      for (const name of regionNames) {
        if (!selectedSet.has(name)) next.push(name);
      }
      onReplace(next);
    }
  };

  const handleExpandToggle = (key: string) => {
    setExpandedRegion((prev) => (prev === key ? null : key));
  };

  const expanded = CUISINE_REGIONS.find((r) => r.key === expandedRegion);

  const renderChip = (region: CuisineRegion) => {
    const count = regionCounts[region.key] ?? 0;
    const total = region.cuisines.length;
    const state: RegionSelectionState =
      count === 0 ? 'none' : count >= total ? 'all' : 'partial';
    return (
      <RegionChip
        key={region.key}
        label={region.label}
        emoji={region.emoji}
        selectionState={state}
        selectedCount={count}
        totalCount={total}
        expanded={expandedRegion === region.key}
        onToggleRegion={() => handleRegionToggle(region)}
        onToggleExpand={() => handleExpandToggle(region.key)}
        onLayout={handleChipLayout(region.key)}
        isDark={isDark}
      />
    );
  };

  const renderDrawer = () =>
    expanded ? (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(120)}
        style={[
          styles.drawer,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.025)',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerEmoji}>{expanded.emoji}</Text>
          <Text style={[styles.drawerTitle, { color: colors.text.primary }]}>
            {expanded.label}
          </Text>
          <Text style={[styles.drawerHint, { color: colors.text.tertiary }]}>
            {expanded.cuisines.length} cuisines
          </Text>
        </View>

        <View style={styles.cuisineWrap}>
          {expanded.cuisines.map((cuisine) => (
            <FilterPill
              key={cuisine.name}
              label={cuisine.name}
              emoji={cuisine.emoji}
              active={selectedCuisines.includes(cuisine.name)}
              onPress={() => onToggle(cuisine.name)}
              categoryName={cuisine.name}
            />
          ))}
        </View>
      </Animated.View>
    ) : null;

  // Pre-measurement: render all chips in a single wrap so onLayout can fire
  // for every chip. Drawer sits below the full grid (transient — flips to
  // row-aware layout once measurements come back).
  if (!rows) {
    return (
      <View onLayout={handleContainerLayout}>
        <View style={styles.regionGrid}>{CUISINE_REGIONS.map(renderChip)}</View>
        {renderDrawer()}
      </View>
    );
  }

  // Post-measurement: render row by row so we can inject the drilldown drawer
  // directly under the row of the tapped region.
  return (
    <View style={styles.rowStack} onLayout={handleContainerLayout}>
      {rows.map((row, i) => {
        const containsExpanded =
          expandedRegion !== null && row.some((r) => r.key === expandedRegion);
        return (
          <React.Fragment key={`row-${i}`}>
            <View style={styles.regionGrid}>{row.map(renderChip)}</View>
            {containsExpanded && renderDrawer()}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Region chip — two tap targets.
//   • Main body (emoji + label + count badge) → toggles whole region as a
//     filter. Tri-state visual: empty, partial (subset selected), full
//     (everything in the region selected).
//   • Chevron pill on the right → expand/collapse the drilldown drawer.
// ──────────────────────────────────────────────────────────────────────────

interface RegionChipProps {
  label: string;
  emoji: string;
  selectionState: RegionSelectionState;
  selectedCount: number;
  totalCount: number;
  expanded: boolean;
  onToggleRegion: () => void;
  onToggleExpand: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  isDark: boolean;
}

function RegionChip({
  label,
  emoji,
  selectionState,
  selectedCount,
  totalCount,
  expanded,
  onToggleRegion,
  onToggleExpand,
  onLayout,
  isDark,
}: RegionChipProps) {
  const scale = useSharedValue(1);
  const chevronRot = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    chevronRot.value = withTiming(expanded ? 1 : 0, { duration: 180 });
  }, [expanded, chevronRot]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value * 180}deg` }],
  }));

  const accent = isDark ? DarkColors.primary : Colors.primary;

  // Tri-state visual: empty / partial / full. "expanded" overrides borderColor
  // so the drilldown affordance is obvious even on an unselected region.
  const bg =
    selectionState === 'all'
      ? accent
      : selectionState === 'partial'
        ? isDark
          ? `${accent}33`
          : '#FFE9D8'
        : isDark
          ? '#26211C'
          : '#FFFFFF';
  const borderColor =
    selectionState === 'all' || selectionState === 'partial'
      ? accent
      : expanded
        ? accent
        : isDark
          ? '#2C2C2E'
          : '#E5E7EB';
  const labelColor =
    selectionState === 'all'
      ? '#FFFFFF'
      : isDark
        ? DarkColors.text.primary
        : Colors.text.primary;
  const chevronColor =
    selectionState === 'all'
      ? '#FFFFFF'
      : isDark
        ? DarkColors.text.tertiary
        : Colors.text.tertiary;

  const a11yLabel =
    selectionState === 'all'
      ? `${label}, all ${totalCount} selected. Tap to clear.`
      : selectionState === 'partial'
        ? `${label}, ${selectedCount} of ${totalCount} selected. Tap to select all.`
        : `${label}, ${totalCount} cuisines. Tap to select all in region.`;

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.regionChip,
        { backgroundColor: bg, borderColor },
        animatedStyle,
      ]}
    >
      {/* Primary tap target — toggles the region as a filter */}
      <HapticTouchableOpacity
        onPress={() => {
          scale.value = withSpring(0.96, SPRING);
          setTimeout(() => {
            scale.value = withSpring(1, SPRING);
          }, 60);
          onToggleRegion();
        }}
        hapticStyle="light"
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: selectionState !== 'none' }}
        style={styles.regionBody}
      >
        <Text style={styles.regionEmoji}>{emoji}</Text>
        <Text style={[styles.regionLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {selectionState === 'all' && (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
        {selectionState === 'partial' && (
          <View style={[styles.regionBadge, { backgroundColor: accent }]}>
            <Text style={styles.regionBadgeText}>{selectedCount}</Text>
          </View>
        )}
      </HapticTouchableOpacity>

      {/* Secondary tap target — expand/collapse drilldown */}
      <HapticTouchableOpacity
        onPress={onToggleExpand}
        hapticStyle="light"
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Hide' : 'Show'} ${label} cuisines`}
        accessibilityState={{ expanded }}
        style={styles.chevronHit}
      >
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={14} color={chevronColor} />
        </Animated.View>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowStack: {
    flexDirection: 'column',
    gap: 8,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  regionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  regionEmoji: {
    fontSize: 16,
  },
  regionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
  },
  regionBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  regionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  chevronHit: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    // Subtle divider between the two tap targets so users see they are
    // distinct affordances.
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(0,0,0,0.06)',
  },
  drawer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  drawerEmoji: {
    fontSize: 18,
  },
  drawerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    flex: 1,
  },
  drawerHint: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  cuisineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
