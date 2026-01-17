// useScrollAnimation - Hook for scroll-based animations
// Provides parallax, stagger, and fade effects for scroll views

import { useRef, useMemo } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UseScrollAnimationOptions {
  /** Enable parallax effect for headers/backgrounds */
  enableParallax?: boolean;
  /** Parallax speed multiplier (default: 0.5) */
  parallaxSpeed?: number;
  /** Threshold for triggering hide animations (default: 50) */
  hideThreshold?: number;
  /** Enable header collapse effect */
  enableHeaderCollapse?: boolean;
  /** Maximum header collapse amount in pixels (default: 100) */
  maxHeaderCollapse?: number;
}

interface ScrollAnimationResult {
  /** Animated scroll Y value - use with onScroll */
  scrollY: Animated.Value;
  /** Handler for ScrollView onScroll event */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Parallax transform for background images */
  parallaxStyle: {
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
  /** Header collapse style (height reduction) */
  headerCollapseStyle: {
    height: Animated.AnimatedInterpolation<number>;
    opacity: Animated.AnimatedInterpolation<number>;
  };
  /** Fade out style for elements that should hide on scroll */
  fadeOnScrollStyle: {
    opacity: Animated.AnimatedInterpolation<number>;
  };
  /** Get stagger delay for list item at index */
  getStaggerDelay: (index: number, baseDelay?: number) => number;
  /** Get animated style for staggered list items */
  getStaggeredItemStyle: (index: number) => {
    opacity: Animated.AnimatedInterpolation<number>;
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
}

/**
 * Hook for creating scroll-based animations
 *
 * @example
 * // Basic parallax header
 * const { scrollY, onScroll, parallaxStyle } = useScrollAnimation({ enableParallax: true });
 *
 * <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *   <Animated.Image source={headerImage} style={[styles.header, parallaxStyle]} />
 *   ...
 * </ScrollView>
 *
 * @example
 * // Staggered list animation
 * const { getStaggeredItemStyle } = useScrollAnimation();
 *
 * {items.map((item, index) => (
 *   <Animated.View key={item.id} style={getStaggeredItemStyle(index)}>
 *     <ListItem {...item} />
 *   </Animated.View>
 * ))}
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}): ScrollAnimationResult {
  const {
    enableParallax = false,
    parallaxSpeed = 0.5,
    hideThreshold = 50,
    enableHeaderCollapse = false,
    maxHeaderCollapse = 100,
  } = options;

  const scrollY = useRef(new Animated.Value(0)).current;

  // Scroll event handler
  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      ),
    [scrollY]
  );

  // Parallax transform for background images
  const parallaxStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
            outputRange: [SCREEN_HEIGHT * parallaxSpeed, 0, -SCREEN_HEIGHT * parallaxSpeed],
            extrapolate: 'clamp',
          }),
        },
      ],
    }),
    [scrollY, parallaxSpeed]
  );

  // Header collapse effect (height + opacity)
  const headerCollapseStyle = useMemo(
    () => ({
      height: scrollY.interpolate({
        inputRange: [0, maxHeaderCollapse],
        outputRange: [maxHeaderCollapse, 0],
        extrapolate: 'clamp',
      }),
      opacity: scrollY.interpolate({
        inputRange: [0, maxHeaderCollapse * 0.8],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    }),
    [scrollY, maxHeaderCollapse]
  );

  // Fade out on scroll
  const fadeOnScrollStyle = useMemo(
    () => ({
      opacity: scrollY.interpolate({
        inputRange: [0, hideThreshold],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    }),
    [scrollY, hideThreshold]
  );

  // Get stagger delay for list items
  const getStaggerDelay = (index: number, baseDelay: number = 50): number => {
    return index * baseDelay;
  };

  // Stagger animation values for list items
  const staggerAnimations = useRef<Map<number, Animated.Value>>(new Map()).current;

  const getStaggeredItemStyle = (index: number) => {
    // Create animation value for this index if it doesn't exist
    if (!staggerAnimations.has(index)) {
      const animValue = new Animated.Value(0);
      staggerAnimations.set(index, animValue);

      // Start the animation with stagger delay
      setTimeout(() => {
        Animated.spring(animValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }, getStaggerDelay(index));
    }

    const animValue = staggerAnimations.get(index)!;

    return {
      opacity: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
      ],
    };
  };

  return {
    scrollY,
    onScroll,
    parallaxStyle,
    headerCollapseStyle,
    fadeOnScrollStyle,
    getStaggerDelay,
    getStaggeredItemStyle,
  };
}

/**
 * Hook for entrance animations when a component mounts
 *
 * @example
 * const { style, triggerAnimation } = useEntranceAnimation();
 *
 * useEffect(() => {
 *   triggerAnimation();
 * }, []);
 *
 * return <Animated.View style={style}>...</Animated.View>
 */
export function useEntranceAnimation(delay: number = 0) {
  const animValue = useRef(new Animated.Value(0)).current;

  const triggerAnimation = () => {
    setTimeout(() => {
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, delay);
  };

  const style = {
    opacity: animValue,
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  };

  return { style, triggerAnimation, animValue };
}

/**
 * Hook for success/completion animations
 *
 * @example
 * const { animatedStyle, triggerSuccess, isAnimating } = useSuccessAnimation();
 *
 * const handleComplete = async () => {
 *   await saveData();
 *   triggerSuccess();
 * };
 */
export function useSuccessAnimation() {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const checkmarkProgress = useRef(new Animated.Value(0)).current;

  const triggerSuccess = (onComplete?: () => void) => {
    // Reset values
    scaleValue.setValue(0);
    opacityValue.setValue(0);
    checkmarkProgress.setValue(0);

    // Sequence: scale in, show checkmark, then fade out
    Animated.sequence([
      // Scale and fade in
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Checkmark animation
      Animated.timing(checkmarkProgress, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(500),
      // Fade out
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  const animatedStyle = {
    opacity: opacityValue,
    transform: [
      {
        scale: scaleValue,
      },
    ],
  };

  const checkmarkStyle = {
    opacity: checkmarkProgress,
    transform: [
      {
        scale: checkmarkProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1.2, 1],
        }),
      },
    ],
  };

  return {
    animatedStyle,
    checkmarkStyle,
    triggerSuccess,
  };
}

export default useScrollAnimation;
