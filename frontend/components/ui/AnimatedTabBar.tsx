// AnimatedTabBar utilities — animated tab icon with scale + opacity transitions
// Used via tabBarIcon in the default Expo Router tab bar (not a custom tabBar replacement)

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const SPRING_CONFIG = { damping: 14, stiffness: 200, mass: 0.8 };

interface AnimatedTabIconProps {
  name: string;
  color: string;
  size: number;
  focused: boolean;
}

/**
 * Animated tab icon with spring scale (1→1.15) and opacity (0.6→1) on focus.
 * Drop-in replacement for static Ionicons in tabBarIcon.
 */
export function AnimatedTabIcon({ name, color, size, focused }: AnimatedTabIconProps) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const opacity = useSharedValue(focused ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, SPRING_CONFIG);
    opacity.value = withSpring(focused ? 1 : 0.6, SPRING_CONFIG);
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.iconWrap, animatedStyle]}>
      <Ionicons name={name as any} size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
