// frontend/components/ui/ScrollAwareFrostedHeader.tsx
// Frosted header whose blur intensity and background opacity increase with scroll.
// Uses Reanimated shared value from the parent's scroll handler.

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface ScrollAwareFrostedHeaderProps {
  children: React.ReactNode;
  /** Shared scroll Y value from useAnimatedScrollHandler */
  scrollY: SharedValue<number>;
  /** Scroll distance over which the header transitions from transparent to fully frosted (default 80) */
  fadeDistance?: number;
  /** Extra padding at the bottom of the header (default 12) */
  paddingBottom?: number;
  /** If true, adds safe-area top inset automatically */
  withTopInset?: boolean;
}

export default function ScrollAwareFrostedHeader({
  children,
  scrollY,
  fadeDistance = 80,
  paddingBottom = 12,
  withTopInset = true,
}: ScrollAwareFrostedHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const topPad = withTopInset ? insets.top : 0;

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, fadeDistance],
      [0, 1],
      'clamp'
    );
    return { opacity };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, fadeDistance],
      [0, 0.08],
      'clamp'
    );
    return {
      shadowOpacity: opacity,
    };
  });

  if (Platform.OS === 'android') {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: topPad,
            paddingBottom,
            backgroundColor: isDark
              ? 'rgba(15, 15, 15, 0.95)'
              : 'rgba(250, 247, 244, 0.95)',
          },
          shadowStyle,
        ]}
      >
        {/* Progressive overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(15, 15, 15, 0.6)'
                : 'rgba(250, 247, 244, 0.5)',
            },
            overlayStyle,
          ]}
          pointerEvents="none"
        />
        {children}
      </Animated.View>
    );
  }

  return (
    <BlurView
      intensity={isDark ? 60 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          paddingTop: topPad,
          paddingBottom,
        },
      ]}
    >
      {/* Progressive tint overlay — warm cream for seamless blend with screen gradient */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(17, 24, 39, 0.55)'
              : 'rgba(250, 247, 244, 0.65)', // warm cream (#FAF7F4)
          },
          overlayStyle,
        ]}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    zIndex: 10,
  },
});
