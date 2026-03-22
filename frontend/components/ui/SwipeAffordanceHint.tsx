// frontend/components/ui/SwipeAffordanceHint.tsx
// Shows a one-time ghost swipe hint on first visit to teach swipe gestures.
// Uses AsyncStorage to persist that the hint has been shown.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

interface SwipeAffordanceHintProps {
  /** Unique key for this hint (e.g., 'shopping-swipe', 'cookbook-longpress') */
  storageKey: string;
  /** Type of hint to show */
  variant: 'swipe' | 'longpress';
  /** Custom message */
  message?: string;
  /** Delay before showing hint (ms) */
  delay?: number;
  children: React.ReactNode;
  testID?: string;
}

export default function SwipeAffordanceHint({
  storageKey,
  variant,
  message,
  delay = 1000,
  children,
  testID,
}: SwipeAffordanceHintProps) {
  const [showHint, setShowHint] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    const checkAndShow = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (reduceMotion) return;

      const key = `hasSeenHint_${storageKey}`;
      const hasSeen = await AsyncStorage.getItem(key);
      if (hasSeen) return;

      // Wait for delay then show hint
      setTimeout(() => {
        if (!mounted) return;
        setShowHint(true);

        if (variant === 'swipe') {
          // Ghost swipe: slide left 40px then spring back
          Animated.sequence([
            Animated.timing(translateX, { toValue: -40, duration: 400, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }),
          ]).start(() => {
            AsyncStorage.setItem(key, 'true');
            if (mounted) setShowHint(false);
          });
        } else {
          // Long-press tooltip: fade in, hold, fade out
          Animated.sequence([
            Animated.timing(tooltipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(2500),
            Animated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => {
            AsyncStorage.setItem(key, 'true');
            if (mounted) setShowHint(false);
          });
        }
      }, delay);
    };

    checkAndShow();
    return () => { mounted = false; };
  }, [storageKey, variant, delay, translateX, tooltipOpacity]);

  if (variant === 'swipe') {
    return (
      <View testID={testID}>
        <Animated.View style={showHint ? { transform: [{ translateX }] } : undefined}>
          {children}
        </Animated.View>
      </View>
    );
  }

  // Long-press tooltip variant
  return (
    <View testID={testID}>
      {children}
      {showHint && (
        <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
          <Text style={styles.tooltipText}>
            {message || 'Hold to select multiple'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: -36,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
