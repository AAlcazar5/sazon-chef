// frontend/components/celebrations/HeartBurstAnimation.tsx
// Airbnb-style heart burst animation for recipe save.
// Heart scales 0.6 → 1.4 → 1.0 with spring + particle burst.

import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticChoreography } from '../../utils/hapticChoreography';

const PARTICLE_COUNT = 6;
const PARTICLE_COLORS = ['#EF4444', '#FB923C', '#F59E0B', '#EC4899', '#F97316', '#DC2626'];

interface HeartBurstAnimationProps {
  /** Trigger the save animation (true = saved, false = unsaved) */
  saved: boolean;
  /** Size of the heart icon */
  size?: number;
  /** Called when animation completes */
  onAnimationComplete?: () => void;
}

export default function HeartBurstAnimation({
  saved,
  size = 24,
  onAnimationComplete,
}: HeartBurstAnimationProps) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const fillProgress = useRef(new Animated.Value(saved ? 1 : 0)).current;
  const isFirstRender = useRef(true);

  // Particle animations
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Skip animation on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fillProgress.setValue(saved ? 1 : 0);
      return;
    }

    if (saved) {
      // Save animation: scale burst + particles
      HapticChoreography.heartBurst();

      // Reset particles
      particles.forEach((p) => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.scale.setValue(0);
        p.opacity.setValue(0);
      });

      // Heart scale: 1 → 0.6 → 1.4 → 1.0
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1.4, friction: 3, tension: 300, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
      ]).start(() => {
        onAnimationComplete?.();
      });

      // Fill the heart
      Animated.timing(fillProgress, { toValue: 1, duration: 200, useNativeDriver: false }).start();

      // Particle burst — 6 particles radiate outward
      particles.forEach((p, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 16 + Math.random() * 12;

        Animated.sequence([
          Animated.delay(80), // Wait for the squeeze
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.spring(p.scale, { toValue: 1, friction: 5, tension: 300, useNativeDriver: true }),
            Animated.timing(p.x, {
              toValue: Math.cos(angle) * distance,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: Math.sin(angle) * distance,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
      });
    } else {
      // Unsave animation: simple scale down and back
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }),
      ]).start(() => {
        onAnimationComplete?.();
      });

      Animated.timing(fillProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }, [saved]);

  const particleSize = Math.max(4, size * 0.18);

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: particleSize,
              height: particleSize,
              borderRadius: particleSize / 2,
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}

      {/* Heart icon */}
      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={size}
          color={saved ? '#EF4444' : '#9CA3AF'}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
