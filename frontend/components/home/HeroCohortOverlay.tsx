// frontend/components/home/HeroCohortOverlay.tsx
// ROADMAP 4.0 HX2.3 — Friend cohort overlay on Today's hero.
//
// "Marcus + 2 others made this this week" pill, anchored to the hero's
// bottom-left corner. Reads from cohortInsightsService.getFriendCohort
// (N7.3) which already enforces the N8.2 privacy gate.
//
// Renders only when ≥ 2 friends cooked the recipe inside the window.
// When the caller's `socialOptIn` is off, copy degrades to opaque
// "N friends made this this week" — no names leak.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { recipeApi } from '../../lib/api';

const MIN_FRIENDS_TO_RENDER = 2;
const DEFAULT_WINDOW_DAYS = 14;

export interface HeroCohortOverlayProps {
  recipeId: string | null | undefined;
  windowDays?: number;
}

interface CohortMember {
  userId: string;
  firstName: string;
  cookedAt: string;
}

interface CohortPayload {
  members: CohortMember[];
  totalCount: number;
  identityRedacted: boolean;
}

function buildCopy(payload: CohortPayload): string | null {
  if (payload.totalCount < MIN_FRIENDS_TO_RENDER) return null;
  if (payload.identityRedacted) {
    return `${payload.totalCount} friends made this this week`;
  }
  const named = payload.members.find((m) => m.firstName && m.firstName.length > 0);
  if (!named) {
    return `${payload.totalCount} friends made this this week`;
  }
  const others = payload.totalCount - 1;
  if (others <= 0) return null; // shouldn't reach due to MIN_FRIENDS check
  const noun = others === 1 ? 'other' : 'others';
  return `${named.firstName} + ${others} ${noun} made this this week`;
}

export default function HeroCohortOverlay({
  recipeId,
  windowDays = DEFAULT_WINDOW_DAYS,
}: HeroCohortOverlayProps) {
  const [payload, setPayload] = useState<CohortPayload | null>(null);

  useEffect(() => {
    if (!recipeId) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    recipeApi
      .getFriendCohort(recipeId, windowDays)
      .then((res) => {
        if (cancelled) return;
        const data = (res?.data ?? res) as CohortPayload | undefined;
        if (!data) {
          setPayload(null);
          return;
        }
        setPayload({
          members: data.members ?? [],
          totalCount: data.totalCount ?? 0,
          identityRedacted: !!data.identityRedacted,
        });
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId, windowDays]);

  if (!recipeId || !payload) return null;
  const copy = buildCopy(payload);
  if (!copy) return null;

  return (
    <View
      testID="hero-cohort-overlay"
      accessibilityRole="summary"
      accessibilityLabel={copy}
      style={styles.pill}
    >
      <Text style={styles.text} numberOfLines={1}>
        {copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.55)',
    maxWidth: '70%',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
