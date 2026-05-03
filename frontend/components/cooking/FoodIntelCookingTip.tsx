// Group 10R Surface 2: Step-adjacent Food Intel tip during cooking mode.
// Renders at most one mint-tinted "💡" tip per cooking session.

import { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark } from '../../constants/Colors';
import {
  matchFoodIntelTips,
  recordTipEngagement,
} from '../../lib/foodIntelMatcher';
import { FOOD_INTEL_TIPS, type FoodIntelTip } from '../../lib/foodIntelTips';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';

interface FoodIntelCookingTipProps {
  stepText: string;
  stepIndex: number;
  sessionId: string;
  testID?: string;
}

const sessionsWithShownTip = new Set<string>();

export function __resetCookingSessionsForTests(): void {
  sessionsWithShownTip.clear();
}

const TRIGGER_KEYWORDS: string[] = Array.from(
  new Set(FOOD_INTEL_TIPS.map((t) => t.trigger.toLowerCase())),
);

function extractIngredients(stepText: string): string[] {
  const lower = stepText.toLowerCase();
  const matches: string[] = [];
  for (const keyword of TRIGGER_KEYWORDS) {
    if (lower.includes(keyword)) matches.push(keyword);
  }
  return matches;
}

export default function FoodIntelCookingTip({
  stepText,
  stepIndex,
  sessionId,
  testID,
}: FoodIntelCookingTipProps) {
  const userState = useFoodIntelUserState();
  const [tip, setTip] = useState<FoodIntelTip | null>(null);
  const [open, setOpen] = useState(false);

  const ingredients = useMemo(() => extractIngredients(stepText), [stepText]);

  useEffect(() => {
    let cancelled = false;
    if (sessionsWithShownTip.has(sessionId)) return;
    if (ingredients.length === 0) return;
    if (!userState) return;

    matchFoodIntelTips(
      { ingredients, screenType: 'cooking' },
      userState,
      { limit: 1 },
    )
      .then((tips) => {
        if (cancelled) return;
        const top = tips[0];
        if (!top) return;
        if (sessionsWithShownTip.has(sessionId)) return;
        sessionsWithShownTip.add(sessionId);
        setTip(top);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [ingredients, sessionId, stepIndex, userState]);

  if (!tip) return null;

  const toggle = () => {
    if (!open) {
      recordTipEngagement(userState.userId, tip.id, 'expanded').catch(() => {});
    }
    setOpen((prev) => !prev);
  };

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const titleColor = isDark ? '#A5D6A7' : '#2E5931';
  const bodyColor = isDark ? '#E5E7EB' : '#1F3D22';
  const metaColor = isDark ? '#9CA3AF' : '#5C7A5F';

  return (
    <View
      testID={testID}
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 20,
        backgroundColor: bg,
      }}
    >
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Food intel tip: ${tip.title}`}
        onPress={toggle}
        testID={testID ? `${testID}-toggle` : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: titleColor, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 }}>
          {`💡 ${tip.title}`}
        </Text>
        <Text style={{ color: metaColor, fontSize: 12, marginLeft: 8 }}>{open ? 'Hide' : 'Show'}</Text>
      </HapticTouchableOpacity>

      {open && (
        <Text
          testID={testID ? `${testID}-body` : undefined}
          style={{ color: bodyColor, fontSize: 13, marginTop: 8, lineHeight: 18 }}
        >
          {tip.body}
        </Text>
      )}
    </View>
  );
}
