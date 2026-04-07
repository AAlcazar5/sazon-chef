// frontend/components/recipe/IngredientSwapSheet.tsx
// Bottom sheet showing macro-aware ingredient swap alternatives for 10E.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IngredientSwap {
  alternative: string;
  macroDelta: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  flavorNote: string;
  ratioNote?: string;
}

interface Props {
  visible: boolean;
  ingredient: string;
  isDark: boolean;
  onClose: () => void;
  onSelectSwap: (swap: IngredientSwap) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MacroPill({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  const isPositive = value > 0;
  const isZero = value === 0;

  // Positive deltas = orange (more), negative = green (less/healthier), zero = neutral
  const color = isZero
    ? (isDark ? '#9CA3AF' : '#6B7280')
    : isPositive
      ? '#F97316'  // orange
      : '#22C55E'; // green

  const text = isZero
    ? `same ${label}`
    : `${isPositive ? '+' : ''}${value}${label === 'cal' ? '' : 'g'} ${label}`;

  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 100,
      backgroundColor: isZero
        ? (isDark ? 'rgba(156,163,175,0.12)' : 'rgba(107,114,128,0.08)')
        : isPositive
          ? 'rgba(249,115,22,0.12)'
          : 'rgba(34,197,94,0.12)',
      marginRight: 4,
      marginBottom: 4,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{text}</Text>
    </View>
  );
}

function macroPillsForDelta(delta: IngredientSwap['macroDelta'], isDark: boolean) {
  const entries: Array<{ label: string; value: number }> = [];
  if (delta.calories !== undefined) entries.push({ label: 'cal', value: delta.calories });
  if (delta.protein !== undefined) entries.push({ label: 'protein', value: delta.protein });
  if (delta.fat !== undefined) entries.push({ label: 'fat', value: delta.fat });
  if (delta.carbs !== undefined) entries.push({ label: 'carbs', value: delta.carbs });
  if (delta.fiber !== undefined) entries.push({ label: 'fiber', value: delta.fiber });
  return entries.filter((e) => e.value !== 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IngredientSwapSheet({ visible, ingredient, isDark, onClose, onSelectSwap }: Props) {
  const [swaps, setSwaps] = useState<IngredientSwap[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState('');

  useEffect(() => {
    if (!visible || !ingredient || ingredient === fetched) return;

    let cancelled = false;
    setLoading(true);
    setSwaps([]);

    recipeApi.getIngredientSwaps(ingredient)
      .then((res: any) => {
        if (!cancelled) {
          setSwaps(res?.data?.swaps ?? []);
          setFetched(ingredient);
        }
      })
      .catch(() => {
        if (!cancelled) setSwaps([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [visible, ingredient]);

  // Strip leading quantity for display — "2 cups chicken breast" → "chicken breast"
  const displayName = ingredient.replace(/^[\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsp|tsp|oz|g|kg|ml|l|cloves?|heads?|cans?|medium|large|small|pieces?)?\s*/i, '');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Swap ${displayName}`}
      snapPoints={['55%', '80%']}
      scrollable
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        {/* Close button */}
        <HapticTouchableOpacity
          onPress={onClose}
          hapticStyle="light"
          accessibilityLabel="Close swap sheet"
          style={{
            position: 'absolute',
            top: -8,
            right: 0,
            padding: 8,
            zIndex: 10,
          }}
        >
          <Text style={{ fontSize: 22, color: isDark ? '#9CA3AF' : '#6B7280' }}>×</Text>
        </HapticTouchableOpacity>

        <Text style={{
          fontSize: 13,
          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
          marginBottom: 16,
        }}>
          Tap a swap to apply it temporarily
        </Text>

        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={isDark ? '#FFB74D' : '#EA580C'} />
            <Text style={{ marginTop: 8, color: isDark ? DarkColors.text.secondary : Colors.text.secondary, fontSize: 13 }}>
              Finding alternatives…
            </Text>
          </View>
        )}

        {!loading && swaps.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🤔</Text>
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: isDark ? DarkColors.text.primary : Colors.text.primary,
              marginBottom: 4,
            }}>
              No swaps found
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? DarkColors.text.secondary : Colors.text.secondary, textAlign: 'center' }}>
              We don't have alternatives for this ingredient yet.
            </Text>
          </View>
        )}

        {!loading && swaps.map((swap, idx) => {
          const pills = macroPillsForDelta(swap.macroDelta, isDark);

          return (
            <MotiView
              key={idx}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: idx * 60, damping: 20, stiffness: 200 }}
            >
              <HapticTouchableOpacity
                onPress={() => onSelectSwap(swap)}
                hapticStyle="medium"
                pressedScale={0.97}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FAFAFA',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
                accessibilityLabel={`Swap with ${swap.alternative}`}
              >
                {/* Name */}
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  marginBottom: 4,
                }}>
                  {swap.alternative}
                </Text>

                {/* Flavor note */}
                <Text style={{
                  fontSize: 13,
                  color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                  marginBottom: 8,
                  lineHeight: 18,
                }}>
                  {swap.flavorNote}
                </Text>

                {/* Macro delta pills */}
                {pills.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {pills.map((pill, pIdx) => (
                      <MacroPill key={pIdx} label={pill.label} value={pill.value} isDark={isDark} />
                    ))}
                  </View>
                )}

                {/* Ratio note */}
                {swap.ratioNote && (
                  <Text style={{
                    fontSize: 11,
                    color: isDark ? '#60A5FA' : '#3B82F6',
                    marginTop: 6,
                    fontWeight: '500',
                  }}>
                    {swap.ratioNote}
                  </Text>
                )}
              </HapticTouchableOpacity>
            </MotiView>
          );
        })}
      </View>
    </BottomSheet>
  );
}
