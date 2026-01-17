import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface AnimatedBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
  style?: any;
}

export default function AnimatedBadge({
  count,
  maxCount = 99,
  showZero = false,
  size = 'md',
  color = 'white',
  backgroundColor = Colors.secondaryRed,
  style,
}: AnimatedBadgeProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const previousCount = useRef(count);

  useEffect(() => {
    // Only animate if count changed and is greater than 0
    if (count !== previousCount.current && (count > 0 || showZero)) {
      // Scale up animation
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (count === 0 && !showZero) {
      // Scale down when hiding
      Animated.timing(scale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (count > 0) {
      // Ensure visible if count > 0
      scale.setValue(1);
    }

    previousCount.current = count;
  }, [count, showZero, scale]);

  if (count === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    sm: { minWidth: 16, height: 16, fontSize: 10, paddingHorizontal: 4 },
    md: { minWidth: 20, height: 20, fontSize: 12, paddingHorizontal: 6 },
    lg: { minWidth: 24, height: 24, fontSize: 14, paddingHorizontal: 8 },
  };

  const sizeStyle = sizeStyles[size];
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor,
          minWidth: sizeStyle.minWidth,
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

