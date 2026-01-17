// Animation constants for Sazon Chef app
// Standardized animation timing, easing, and configuration values

import { Animated, Easing } from 'react-native';

/**
 * Animation duration values (in milliseconds)
 */
export const Duration = {
  /** 100ms - Instant feedback (button press, toggle) */
  instant: 100,
  /** 150ms - Quick transitions (micro-interactions) */
  fast: 150,
  /** 200ms - Standard animations (most UI transitions) */
  normal: 200,
  /** 300ms - Smooth transitions (modals, sheets) */
  medium: 300,
  /** 400ms - Deliberate animations (page transitions) */
  slow: 400,
  /** 500ms - Emphasized animations (success states) */
  slower: 500,
  /** 600ms - Long animations (loading sequences) */
  long: 600,
  /** 1000ms - Extended animations (splash screen) */
  extended: 1000,
} as const;

/**
 * Spring animation configuration
 * Based on React Native Animated.spring defaults
 */
export const Spring = {
  /** Gentle spring - subtle bounce */
  gentle: {
    friction: 10,
    tension: 40,
    useNativeDriver: true,
  },
  /** Default spring - balanced bounce */
  default: {
    friction: 7,
    tension: 40,
    useNativeDriver: true,
  },
  /** Bouncy spring - playful bounce */
  bouncy: {
    friction: 5,
    tension: 40,
    useNativeDriver: true,
  },
  /** Stiff spring - quick snap */
  stiff: {
    friction: 8,
    tension: 100,
    useNativeDriver: true,
  },
  /** Wobbly spring - exaggerated bounce */
  wobbly: {
    friction: 4,
    tension: 30,
    useNativeDriver: true,
  },
} as const;

/**
 * Easing functions for timing animations
 */
export const Easing_ = {
  /** Linear - constant speed */
  linear: Easing.linear,
  /** Ease in - start slow, end fast */
  easeIn: Easing.ease,
  /** Ease out - start fast, end slow (most common) */
  easeOut: Easing.out(Easing.ease),
  /** Ease in-out - slow start and end */
  easeInOut: Easing.inOut(Easing.ease),
  /** Cubic ease out - smooth deceleration */
  cubicOut: Easing.out(Easing.cubic),
  /** Quad ease out - gentle deceleration */
  quadOut: Easing.out(Easing.quad),
  /** Back ease out - slight overshoot */
  backOut: Easing.out(Easing.back(1.2)),
  /** Bounce - bouncing effect */
  bounce: Easing.bounce,
  /** Elastic - elastic spring effect */
  elastic: Easing.elastic(1),
} as const;

/**
 * Animation timing configurations
 * Pre-configured Animated.timing options
 */
export const Timing = {
  /** Fade in/out */
  fade: {
    duration: Duration.normal,
    easing: Easing_.easeOut,
    useNativeDriver: true,
  },
  /** Quick fade */
  fadeQuick: {
    duration: Duration.fast,
    easing: Easing_.easeOut,
    useNativeDriver: true,
  },
  /** Slide animations */
  slide: {
    duration: Duration.medium,
    easing: Easing_.cubicOut,
    useNativeDriver: true,
  },
  /** Scale animations */
  scale: {
    duration: Duration.normal,
    easing: Easing_.backOut,
    useNativeDriver: true,
  },
  /** Button press */
  buttonPress: {
    duration: Duration.instant,
    easing: Easing_.easeOut,
    useNativeDriver: true,
  },
  /** Modal appear */
  modalAppear: {
    duration: Duration.medium,
    easing: Easing_.cubicOut,
    useNativeDriver: true,
  },
  /** Modal dismiss */
  modalDismiss: {
    duration: Duration.normal,
    easing: Easing_.easeIn,
    useNativeDriver: true,
  },
  /** Toast notification */
  toast: {
    duration: Duration.medium,
    easing: Easing_.cubicOut,
    useNativeDriver: true,
  },
  /** Loading spinner */
  loading: {
    duration: Duration.extended,
    easing: Easing_.linear,
    useNativeDriver: true,
  },
  /** Skeleton shimmer */
  shimmer: {
    duration: Duration.extended,
    easing: Easing_.linear,
    useNativeDriver: true,
  },
} as const;

/**
 * Transform values for common animations
 */
export const Transform = {
  /** Scale values */
  scale: {
    pressed: 0.95,
    normal: 1,
    emphasized: 1.05,
    large: 1.1,
    small: 0.9,
    hidden: 0,
  },
  /** Opacity values */
  opacity: {
    hidden: 0,
    subtle: 0.3,
    muted: 0.5,
    visible: 0.7,
    full: 1,
  },
  /** Translate values (in pixels) */
  translate: {
    offscreenBottom: 300,
    offscreenTop: -300,
    offscreenLeft: -300,
    offscreenRight: 300,
    subtle: 10,
    normal: 20,
  },
  /** Rotation values (in degrees) */
  rotation: {
    slight: '5deg',
    normal: '15deg',
    quarter: '90deg',
    half: '180deg',
    full: '360deg',
  },
} as const;

/**
 * Stagger delay for list animations
 */
export const Stagger = {
  /** 50ms between items */
  fast: 50,
  /** 75ms between items */
  normal: 75,
  /** 100ms between items */
  slow: 100,
} as const;

/**
 * Animation presets for common UI patterns
 * Returns Animated.timing or Animated.spring configurations
 */
export const AnimationPresets = {
  /** Fade in animation */
  fadeIn: (value: Animated.Value) =>
    Animated.timing(value, {
      toValue: 1,
      ...Timing.fade,
    }),

  /** Fade out animation */
  fadeOut: (value: Animated.Value) =>
    Animated.timing(value, {
      toValue: 0,
      ...Timing.fade,
    }),

  /** Scale up animation (bounce) */
  scaleUp: (value: Animated.Value) =>
    Animated.spring(value, {
      toValue: 1,
      ...Spring.bouncy,
    }),

  /** Scale down animation */
  scaleDown: (value: Animated.Value) =>
    Animated.spring(value, {
      toValue: 0,
      ...Spring.default,
    }),

  /** Button press animation */
  buttonPressIn: (value: Animated.Value) =>
    Animated.timing(value, {
      toValue: Transform.scale.pressed,
      ...Timing.buttonPress,
    }),

  /** Button release animation */
  buttonPressOut: (value: Animated.Value) =>
    Animated.spring(value, {
      toValue: Transform.scale.normal,
      ...Spring.gentle,
    }),

  /** Slide up animation */
  slideUp: (value: Animated.Value, from: number = Transform.translate.offscreenBottom) =>
    Animated.timing(value, {
      toValue: 0,
      ...Timing.slide,
    }),

  /** Slide down animation */
  slideDown: (value: Animated.Value, to: number = Transform.translate.offscreenBottom) =>
    Animated.timing(value, {
      toValue: to,
      ...Timing.slide,
    }),

  /** Shake animation (for errors) */
  shake: (value: Animated.Value) =>
    Animated.sequence([
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]),

  /** Pulse animation (for loading) */
  pulse: (value: Animated.Value) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1.1,
          duration: Duration.slow,
          easing: Easing_.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 1,
          duration: Duration.slow,
          easing: Easing_.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ),

  /** Spin animation (for loading) */
  spin: (value: Animated.Value) =>
    Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: Duration.extended,
        easing: Easing_.linear,
        useNativeDriver: true,
      })
    ),
} as const;

// Type exports
export type DurationKey = keyof typeof Duration;
export type SpringKey = keyof typeof Spring;
export type TimingKey = keyof typeof Timing;
export type StaggerKey = keyof typeof Stagger;
