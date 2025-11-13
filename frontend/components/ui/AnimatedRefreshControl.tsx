import React, { useEffect, useRef } from 'react';
import { RefreshControl, RefreshControlProps, Animated } from 'react-native';

interface AnimatedRefreshControlProps extends RefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function AnimatedRefreshControl({
  refreshing,
  onRefresh,
  ...props
}: AnimatedRefreshControlProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      // Bounce animation when refreshing starts
      Animated.loop(
        Animated.sequence([
          Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset when refreshing stops
      bounceAnim.setValue(0);
    }
  }, [refreshing, bounceAnim]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
      }}
    >
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#F97316"
        colors={['#F97316']}
        {...props}
      />
    </Animated.View>
  );
}

