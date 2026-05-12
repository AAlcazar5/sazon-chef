// frontend/components/recipe/AIQuickStartCard.tsx
// "Quick Start" hero card on the recipe-form create flow — generates a
// random or title-seeded recipe via AI. Extracted from app/recipe-form.tsx.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';
import { Brand } from '../../constants/tokens';
import { Shadows } from '../../constants/Shadows';

export interface AIQuickStartCardProps {
  title: string;
  generating: boolean;
  isDark: boolean;
  onPress: () => void;
}

export default function AIQuickStartCard({
  title,
  generating,
  isDark,
  onPress,
}: AIQuickStartCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (generating) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [generating, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const labelTitle = title.trim();
  const buttonLabel = generating
    ? labelTitle ? `Generating "${labelTitle}" Recipe...` : 'Generating Random Recipe...'
    : labelTitle ? `Generate "${labelTitle}" Recipe` : 'Generate Random Recipe';
  const accessibilityLabel = generating
    ? `Generating ${labelTitle || 'random'} recipe`
    : `Generate ${labelTitle || 'a random'} recipe`;

  return (
    <Animated.View
      style={[
        { marginBottom: 16, borderRadius: 16, ...Shadows.MD },
        animStyle,
      ]}
    >
      <LinearGradient
        colors={isDark ? ['#7C3AED', '#DB2777'] : [Brand.light.base, '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="sparkles" size={18} color="white" style={{ marginRight: 6 }} />
          <Text style={{ color: 'white', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', opacity: 0.9 }}>
            Quick Start
          </Text>
        </View>
        <HapticTouchableOpacity
          onPress={onPress}
          disabled={generating}
          hapticStyle="medium"
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: generating, busy: generating }}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generating ? (
            <>
              <PulsingLoader size={16} color="white" />
              <Text style={{ color: 'white', fontFamily: 'PlusJakartaSans_600SemiBold', marginLeft: 12 }}>
                {buttonLabel}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                {buttonLabel}
              </Text>
            </>
          )}
        </HapticTouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}
