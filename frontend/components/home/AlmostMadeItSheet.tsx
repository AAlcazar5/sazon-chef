// frontend/components/home/AlmostMadeItSheet.tsx
// ROADMAP 4.0 HX5.1 — "23 made the cut today — see what almost did?"
//
// Replaces the utilitarian "Showing all 23 recipes" footer with a single
// tap-target line; tap opens a half-sheet showing the 5 recipes that just
// missed the ranker cut, framed in lifestyle voice (no "score" jargon).

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

export interface AlmostMadeItRow {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookTime: number | null;
  marginVsCut: number;
}

export interface AlmostMadeItSheetProps {
  /** Visible recipe count today — used for the "23 made the cut" copy. */
  cutCount: number;
  /** Position of the cut to query past (usually = visible page size). */
  cutoff: number;
  /** Tap target on a near-miss row → routes to recipe modal. */
  onSelect: (recipeId: string) => void;
}

export default function AlmostMadeItSheet({
  cutCount,
  cutoff,
  onSelect,
}: AlmostMadeItSheetProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AlmostMadeItRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    recipeApi
      .getAlmostMadeIt(cutoff)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as { rows?: AlmostMadeItRow[] };
        setRows(payload?.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cutoff]);

  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const sheetBg = isDark ? DarkColors.background : '#FAF7F4';
  const rowBg = isDark ? '#2A1F1A' : '#FFFFFF';

  if (cutCount === 0) return null;

  return (
    <View testID="almost-made-it-footer" style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${cutCount} made the cut today. Tap to see what almost did.`}
        testID="almost-made-it-cta"
        onPress={() => {
          setOpen(true);
          logHomeSurfaceEvent({
            surface: 'almost_made_it',
            eventType: 'expand',
            metadata: { cutCount },
          });
        }}
      >
        <Text style={{ color: text, fontSize: 14, textAlign: 'center', fontWeight: '500' }}>
          {cutCount} made the cut today —{' '}
          <Text style={{ textDecorationLine: 'underline' }}>see what almost did?</Text>
        </Text>
      </HapticTouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            testID="almost-made-it-sheet"
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: sheetBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: '70%',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#D1D5DB',
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
            <Text style={{ color: text, fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4 }}>
              Almost made it
            </Text>
            <Text style={{ color: subtle, fontSize: 13, paddingHorizontal: 20, marginBottom: 16 }}>
              These plates were close — fancy a different vibe?
            </Text>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              {loading && rows.length === 0 ? (
                <Text style={{ color: subtle, textAlign: 'center', paddingVertical: 24 }}>
                  Loading…
                </Text>
              ) : rows.length === 0 ? (
                <Text style={{ color: subtle, textAlign: 'center', paddingVertical: 24 }}>
                  Nothing else queued today — check back tomorrow.
                </Text>
              ) : (
                rows.map((row, i) => (
                  <HapticTouchableOpacity
                    key={row.id}
                    testID={`almost-made-it-row-${row.id}`}
                    onPress={() => {
                      logHomeSurfaceEvent({
                        surface: 'almost_made_it',
                        eventType: 'tap',
                        position: i,
                        metadata: { recipeId: row.id, marginVsCut: row.marginVsCut },
                      });
                      setOpen(false);
                      onSelect(row.id);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: rowBg,
                      padding: 12,
                      borderRadius: 16,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                        {row.title}
                      </Text>
                      <Text style={{ color: subtle, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {row.cuisine ?? 'Recipe'}
                        {row.cookTime ? ` · ${row.cookTime} min` : ''}
                      </Text>
                    </View>
                    <Text style={{ color: subtle, fontSize: 12, marginLeft: 12 }}>
                      {row.marginVsCut === 1 ? 'just missed' : `#${row.marginVsCut} past`}
                    </Text>
                  </HapticTouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
