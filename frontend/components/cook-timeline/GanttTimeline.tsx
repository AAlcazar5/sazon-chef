// frontend/components/cook-timeline/GanttTimeline.tsx
// Group 10X Phase 3 — Gantt-style horizontal timeline for parallel plate cooking.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { Shadows, BorderRadius } from '../../constants';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import type { ParallelTimeline, TimelineEvent } from '../../lib/api';

export interface GanttTimelineProps {
  timeline: ParallelTimeline;
  activeMinute: number;
  onActiveBoundary?: (event: TimelineEvent) => void;
  testID?: string;
}

interface ComponentRow {
  componentId: string;
  name: string;
  startMinute: number;
  endMinute: number;
}

const ROW_COLORS_LIGHT = [Pastel.sage, Pastel.sky, Pastel.peach, Pastel.lavender, Pastel.golden, Pastel.blush];
const ROW_COLORS_DARK = [PastelDark.sage, PastelDark.sky, PastelDark.peach, PastelDark.lavender, PastelDark.golden, PastelDark.blush];
const ROW_ACCENTS = [Accent.sage, Accent.sky, Accent.peach, Accent.lavender, Accent.golden, Accent.blush];

function buildRows(events: TimelineEvent[]): ComponentRow[] {
  const seen = new Set<string>();
  const rows: ComponentRow[] = [];
  for (const event of events) {
    if (seen.has(event.componentId)) continue;
    seen.add(event.componentId);
    const componentEvents = events.filter((e) => e.componentId === event.componentId);
    const startEvent = componentEvents.find((e) => e.action === 'start');
    const endEvent = componentEvents.find((e) => e.action === 'plate') ?? componentEvents.find((e) => e.action === 'finish');
    rows.push({
      componentId: event.componentId,
      name: event.name,
      startMinute: startEvent?.atMinuteFromStart ?? 0,
      endMinute: endEvent?.atMinuteFromStart ?? 0,
    });
  }
  return rows;
}

interface RowAnimatedProps {
  row: ComponentRow;
  index: number;
  totalMinutes: number;
  activeMinute: number;
  isDark: boolean;
}

function RowAnimated({ row, index, totalMinutes, activeMinute, isDark }: RowAnimatedProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = index * 80;
    const timer = setTimeout(() => {
      opacity.value = withSpring(1, { damping: 18, stiffness: 120 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    }, delay);
    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isActive = activeMinute >= row.startMinute && activeMinute < row.endMinute;
  const barColor = isDark ? ROW_COLORS_DARK[index % ROW_COLORS_DARK.length] : ROW_COLORS_LIGHT[index % ROW_COLORS_LIGHT.length];
  const accentColor = ROW_ACCENTS[index % ROW_ACCENTS.length];
  const barLeft = totalMinutes > 0 ? (row.startMinute / totalMinutes) * 100 : 0;
  const barWidth = totalMinutes > 0 ? ((row.endMinute - row.startMinute) / totalMinutes) * 100 : 0;

  return (
    <Animated.View style={[styles.rowContainer, animStyle]} testID={`gantt-row-${row.componentId}`}>
      <Text style={[styles.rowLabel, { color: isDark ? '#F9FAFB' : '#1F2937' }]} numberOfLines={1}>
        {row.name}
      </Text>
      <View style={[styles.trackContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
        <View
          style={[
            styles.barSegment,
            isActive ? Shadows.SM : null,
            {
              left: `${barLeft}%` as any,
              width: `${barWidth}%` as any,
              backgroundColor: isActive ? accentColor : barColor,
            },
          ]}
          testID={isActive ? `gantt-bar-${row.componentId}-active` : `gantt-bar-${row.componentId}-inactive`}
        />
      </View>
    </Animated.View>
  );
}

function GridOverlay({ totalMinutes, isDark }: { totalMinutes: number; isDark: boolean }) {
  const gridLines: number[] = [];
  for (let m = 5; m < totalMinutes; m += 5) {
    gridLines.push(m);
  }

  return (
    <View style={styles.gridContainer} pointerEvents="none">
      {gridLines.map((m) => {
        const pct = (m / totalMinutes) * 100;
        return (
          <View key={m} style={[styles.gridLine, { left: `${pct}%` as any, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.gridLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>T-{totalMinutes - m}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function GanttTimeline({ timeline, activeMinute, onActiveBoundary, testID }: GanttTimelineProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const prevMinuteRef = useRef<number>(-1);

  const rows = buildRows(timeline.events);
  const markerPct = timeline.totalMinutes > 0 ? Math.min((activeMinute / timeline.totalMinutes) * 100, 100) : 0;

  useEffect(() => {
    if (activeMinute === prevMinuteRef.current) return;
    prevMinuteRef.current = activeMinute;
    const hit = timeline.events.find((e) => e.atMinuteFromStart === activeMinute);
    if (hit) {
      onActiveBoundary?.(hit);
    }
  }, [activeMinute, timeline.events, onActiveBoundary]);

  return (
    <View testID={testID ?? 'gantt-timeline'} style={styles.root}>
      {timeline.equipmentConflicts.length > 0 && (
        <View
          style={[
            styles.conflictBadge,
            { backgroundColor: isDark ? 'rgba(251,191,36,0.18)' : '#FEF3C7' },
          ]}
          testID="gantt-conflict-badge"
        >
          <Text style={[styles.conflictText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
            {timeline.equipmentConflicts.length === 1
              ? `${timeline.equipmentConflicts[0].equipment} conflict — consider staggering start times`
              : `${timeline.equipmentConflicts.length} equipment conflicts — consider staggering start times`}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.timelineBody}>
          <GridOverlay totalMinutes={timeline.totalMinutes} isDark={isDark} />

          {rows.map((row, index) => (
            <RowAnimated
              key={row.componentId}
              row={row}
              index={index}
              totalMinutes={timeline.totalMinutes}
              activeMinute={activeMinute}
              isDark={isDark}
            />
          ))}

          <View
            style={[styles.activeMarker, { left: `${markerPct}%` as any }]}
            testID="gantt-active-marker"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    minWidth: '100%',
  },
  timelineBody: {
    flex: 1,
    minWidth: 320,
    position: 'relative',
    paddingTop: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  rowLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  trackContainer: {
    flex: 1,
    height: 28,
    borderRadius: BorderRadius.full,
    position: 'relative',
    overflow: 'hidden',
  },
  barSegment: {
    position: 'absolute',
    top: 4,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 88,
    right: 8,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  activeMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fa7e12',
    ...Shadows.MD,
  },
  conflictBadge: {
    marginHorizontal: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  conflictText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
});
