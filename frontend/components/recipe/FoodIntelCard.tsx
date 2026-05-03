// frontend/components/recipe/FoodIntelCard.tsx
// Group 10R Surface 1 — collapsible Food Intel tip below the ingredient list.
// Pastel-mint card with 💡 icon. Title is the teaser; tap to expand the body.

import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark } from '../../constants/Colors';
import {
  matchFoodIntelTips,
  recordTipEngagement,
} from '../../lib/foodIntelMatcher';
import type { FoodIntelTip } from '../../lib/foodIntelTips';
import useFoodIntelUserState from '../../hooks/useFoodIntelUserState';

interface FoodIntelCardProps {
  ingredients: string[];
  recipeId?: string;
  testID?: string;
}

export default function FoodIntelCard({ ingredients, recipeId, testID }: FoodIntelCardProps) {
  const userState = useFoodIntelUserState();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tip, setTip] = useState<FoodIntelTip | null>(null);
  const [open, setOpen] = useState(false);
  const engagedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const matched = await matchFoodIntelTips(
        { ingredients, screenType: 'recipe' },
        userState,
        { limit: 1 },
      );
      if (cancelled) return;
      setTip(matched[0] ?? null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ingredients, userState, recipeId]);

  if (!tip) return null;

  const toggle = () => {
    if (!open && !engagedRef.current) {
      engagedRef.current = true;
      void recordTipEngagement(userState.userId, tip.id, 'expanded');
    }
    setOpen((prev) => !prev);
  };

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const titleColor = isDark ? '#A5D6A7' : '#2E5931';
  const bodyColor = isDark ? '#E5E7EB' : '#374151';
  const metaColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View
      testID={testID}
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        backgroundColor: bg,
      }}
    >
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Food intel: ${tip.title}. Tap to ${open ? 'collapse' : 'expand'}.`}
        onPress={toggle}
        testID={testID ? `${testID}-toggle` : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>💡</Text>
          <Text
            style={{
              flex: 1,
              color: titleColor,
              fontSize: 14,
              fontFamily: 'PlusJakartaSans_700Bold',
            }}
          >
            {tip.title}
          </Text>
        </View>
        <Text style={{ color: metaColor, fontSize: 12 }}>{open ? 'Hide' : 'Show'}</Text>
      </HapticTouchableOpacity>

      {open && (
        <Text
          testID={testID ? `${testID}-body` : undefined}
          style={{
            color: bodyColor,
            fontSize: 13,
            marginTop: 10,
            lineHeight: 19,
          }}
        >
          {tip.body}
        </Text>
      )}
    </View>
  );
}
