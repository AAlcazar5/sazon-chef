import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedLogoMascot } from '../mascot';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2000 }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const crossFadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Mascot animation - fade in and scale up with spring
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Title animation - delayed fade in and slide up
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle shimmer loop on mascot
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-dismiss with cross-fade transition
    const timer = setTimeout(() => {
      if (onFinish) {
        Animated.timing(crossFadeOut, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, titleOpacity, titleTranslateY, shimmerAnim, crossFadeOut, duration, onFinish]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  // Brand gradient: warm orange → peach (matching ScreenGradient)
  const gradientColors = isDark
    ? ['#1A1020', '#0F0F0F'] as const
    : ['#fa7e12', '#FFD4A0', '#FFF3E0'] as const;

  return (
    <Animated.View style={[styles.fill, { opacity: crossFadeOut }]} testID="splash-screen">
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        style={styles.fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.container}>
          <Animated.View
            style={{
              opacity: Animated.multiply(fadeAnim, shimmerOpacity),
              transform: [{ scale: scaleAnim }],
            }}
          >
            <AnimatedLogoMascot
              expression="excited"
              size="hero"
              animationType="celebrate"
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
              Sazon Chef
            </Text>
            <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
              Your personal cooking companion
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },
  titleLight: {
    color: '#FFFFFF',
  },
  titleDark: {
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitleLight: {
    color: 'rgba(255,255,255,0.85)',
  },
  subtitleDark: {
    color: '#9CA3AF',
  },
});
