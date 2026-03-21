// frontend/hooks/useModalAnimation.ts
// Reusable spring scale + fade animation for modal content.
// Respects system reduced motion preference.
// Usage: const { contentStyle } = useModalAnimation(visible);

import { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import { Spring, Duration } from '../constants/Animations';

export function useModalAnimation(visible: boolean) {
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => { reducedMotionRef.current = enabled; }
    );
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reducedMotionRef.current = enabled;
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      if (reducedMotionRef.current) {
        contentScale.setValue(1);
        contentOpacity.setValue(1);
        return;
      }
      contentScale.setValue(0.9);
      contentOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(contentScale, {
          toValue: 1,
          friction: Spring.bouncy.friction,
          tension: Spring.bouncy.tension,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: Duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      if (reducedMotionRef.current) {
        contentScale.setValue(0.9);
        contentOpacity.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(contentScale, {
          toValue: 0.9,
          duration: Duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: Duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const contentStyle = {
    transform: [{ scale: contentScale }],
    opacity: contentOpacity,
  };

  return { contentStyle, contentScale, contentOpacity };
}
