// frontend/components/home/HeroRationaleRibbon.tsx
// ROADMAP 4.0 HX0.2 — "Why today's hero" rationale ribbon.
//
// Compact italic line under the hero title; tap expands a half-sheet with
// the full set of supporting signals. Renders nothing when the backend
// declined to generate a rationale (cold-start).

import React, { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

export interface HeroRationale {
  primaryReason: string;
  secondaryReasons: string[];
  signals?: string[];
}

export interface HeroRationaleRibbonProps {
  rationale: HeroRationale | null | undefined;
  /** ROADMAP 4.0 HX2.4 — when true, render the once-per-session pulse dot
   *  next to the ribbon. Caller is responsible for clearing the flag once
   *  the user has opened the sheet. */
  peekHint?: boolean;
  /** ROADMAP 4.0 HX2.4 — fired the first time the user opens the sheet
   *  while peekHint is true. Caller persists the dismissed state. */
  onPeekDismiss?: () => void;
}

export default function HeroRationaleRibbon({
  rationale,
  peekHint = false,
  onPeekDismiss,
}: HeroRationaleRibbonProps) {
  const [expanded, setExpanded] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!rationale || !rationale.primaryReason) return null;

  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const primary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sheetBg = isDark ? DarkColors.background : '#FAF7F4';

  return (
    <>
      <HapticTouchableOpacity
        testID="hero-rationale-ribbon"
        accessibilityRole="button"
        accessibilityLabel={`Why today's hero: ${rationale.primaryReason}. Tap for more.`}
        onPress={() => {
          setExpanded(true);
          if (peekHint) {
            onPeekDismiss?.();
            logHomeSurfaceEvent({ surface: 'sazon_reasoning_peek', eventType: 'tap' });
          }
          logHomeSurfaceEvent({ surface: 'hero_rationale_ribbon', eventType: 'expand' });
        }}
        style={{ paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}
      >
        {peekHint && (
          <View
            testID="hero-rationale-peek-dot"
            accessibilityLabel="New: tap to peek at why this was picked"
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#F59E0B',
              marginRight: 8,
            }}
          />
        )}
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: subtle,
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {rationale.primaryReason}
        </Text>
      </HapticTouchableOpacity>

      <Modal
        visible={expanded}
        animationType="slide"
        transparent
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable
          testID="hero-rationale-sheet-backdrop"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setExpanded(false)}
        >
          <Pressable
            testID="hero-rationale-sheet"
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: sheetBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 36,
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
            <Text style={{ color: primary, fontWeight: '700', fontSize: 18, marginBottom: 12 }}>
              Why today's hero
            </Text>
            <Text style={{ color: primary, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
              {rationale.primaryReason}
            </Text>
            {rationale.secondaryReasons.map((reason, i) => (
              <View
                key={`${i}-${reason}`}
                testID={`hero-rationale-secondary-${i}`}
                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}
              >
                <Text style={{ color: subtle, fontSize: 14, marginRight: 8 }}>•</Text>
                <Text style={{ color: subtle, fontSize: 14, lineHeight: 20, flex: 1 }}>
                  {reason}
                </Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
