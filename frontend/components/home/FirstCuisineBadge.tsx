// frontend/components/home/FirstCuisineBadge.tsx
// ROADMAP 4.0 HX2.2 — first-cuisine badge above the hero title.
//
// Renders only when the hero recipe's cuisine is one the user has never
// cooked before (per `firstCookStatsApi.get`). Lifestyle copy
// ("first time?") — never the trainer voice ("you've never cooked this!").
// Tap fires onTap (the screen wires that to the cultural primer half-sheet).

import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { firstCookStatsApi } from '../../lib/api';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { useColorScheme } from 'nativewind';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

export interface FirstCuisineBadgeProps {
  cuisine: string | null | undefined;
  onTap?: (cuisine: string) => void;
}

export default function FirstCuisineBadge({ cuisine, onTap }: FirstCuisineBadgeProps) {
  const [isFirst, setIsFirst] = useState<boolean>(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!cuisine || !cuisine.trim()) {
      setIsFirst(false);
      return;
    }
    let cancelled = false;
    firstCookStatsApi
      .get(cuisine)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as { isFirstCook?: boolean };
        setIsFirst(!!payload?.isFirstCook);
      })
      .catch(() => {
        if (!cancelled) setIsFirst(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cuisine]);

  if (!isFirst || !cuisine) return null;

  const bg = isDark ? PastelDark.golden : Pastel.golden;
  const accent = Accent.golden;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <HapticTouchableOpacity
      testID="first-cuisine-badge"
      accessibilityRole="button"
      accessibilityLabel={`First time with ${cuisine}? Tap for a quick primer.`}
      onPress={() => {
        logHomeSurfaceEvent({
          surface: 'first_cuisine_badge',
          eventType: 'tap',
          metadata: { cuisine },
        });
        onTap?.(cuisine);
      }}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: accent, marginRight: 6 }}>🌍</Text>
      <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>
        first time?
      </Text>
    </HapticTouchableOpacity>
  );
}
