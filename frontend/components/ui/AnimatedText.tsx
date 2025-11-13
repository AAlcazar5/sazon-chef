import React, { useEffect, useRef } from 'react';
import { Text, TextProps, Animated } from 'react-native';

interface AnimatedTextProps extends TextProps {
  children: React.ReactNode;
  duration?: number;
}

export default function AnimatedText({
  children,
  duration = 300,
  style,
  ...props
}: AnimatedTextProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const previousChildren = useRef(children);

  useEffect(() => {
    // Only animate if content actually changed
    if (previousChildren.current !== children) {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }).start(() => {
        // Update content and fade in
        previousChildren.current = children;
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Ensure opacity is 1 for initial render
      opacity.setValue(1);
    }
  }, [children, duration, opacity]);

  return (
    <Animated.Text
      {...props}
      style={[
        style,
        {
          opacity,
        },
      ]}
    >
      {children}
    </Animated.Text>
  );
}

