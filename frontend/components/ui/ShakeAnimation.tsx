import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewProps } from 'react-native';

interface ShakeAnimationProps extends ViewProps {
  children: React.ReactNode;
  shake?: boolean;
  duration?: number;
  intensity?: number;
}

export default function ShakeAnimation({
  children,
  shake = false,
  duration = 500,
  intensity = 10,
  style,
  ...props
}: ShakeAnimationProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const previousShake = useRef(shake);

  useEffect(() => {
    if (shake && !previousShake.current) {
      // Start shake animation
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -intensity,
          duration: duration / 4,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: intensity,
          duration: duration / 4,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -intensity,
          duration: duration / 4,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: intensity,
          duration: duration / 4,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: duration / 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousShake.current = shake;
  }, [shake, translateX, duration, intensity]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateX }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

