// AnimatedTabBar utilities — animated tab icon with scale + opacity transitions
// Used via tabBarIcon in the default Expo Router tab bar (not a custom tabBar replacement)

import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const SPRING_CONFIG = { damping: 14, stiffness: 200, mass: 0.8 };
const BADGE_SPRING = { damping: 10, stiffness: 300, mass: 0.6 };

interface AnimatedTabIconProps {
  name: string;
  color: string;
  size: number;
  focused: boolean;
  /** Numeric badge count (hidden when 0 or undefined) */
  badgeCount?: number;
  /** Show a dot indicator instead of a number */
  badgeDot?: boolean;
  /** Badge background color */
  badgeColor?: string;
}

/**
 * Animated tab icon with spring scale (1→1.15) and opacity (0.6→1) on focus.
 * Supports optional badge with spring-in animation on count change.
 * Drop-in replacement for static Ionicons in tabBarIcon.
 */
export function AnimatedTabIcon({
  name,
  color,
  size,
  focused,
  badgeCount,
  badgeDot,
  badgeColor = '#fa7e12',
}: AnimatedTabIconProps) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const opacity = useSharedValue(focused ? 1 : 0.6);
  const badgeScale = useSharedValue(badgeCount || badgeDot ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, SPRING_CONFIG);
    opacity.value = withSpring(focused ? 1 : 0.6, SPRING_CONFIG);
  }, [focused]);

  // Badge spring animation on count change
  useEffect(() => {
    const shouldShow = (badgeCount && badgeCount > 0) || badgeDot;
    if (shouldShow) {
      // Spring in with overshoot
      badgeScale.value = withSequence(
        withSpring(1.3, BADGE_SPRING),
        withSpring(1, BADGE_SPRING)
      );
    } else {
      badgeScale.value = withSpring(0, BADGE_SPRING);
    }
  }, [badgeCount, badgeDot]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const showBadge = (badgeCount && badgeCount > 0) || badgeDot;

  return (
    <Animated.View style={[styles.iconWrap, animatedStyle]}>
      <Ionicons name={name as any} size={size} color={color} />
      {showBadge && (
        <Animated.View
          style={[
            badgeDot ? styles.badgeDot : styles.badge,
            { backgroundColor: badgeColor },
            badgeAnimStyle,
          ]}
        >
          {!badgeDot && badgeCount ? (
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          ) : null}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
