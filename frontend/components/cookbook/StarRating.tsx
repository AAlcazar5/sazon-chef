// frontend/components/cookbook/StarRating.tsx
// Reusable 5-star rating component for cookbook recipes — stars burst on tap

import { View, Text } from 'react-native';
import React, { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticChoreography } from '../../utils/hapticChoreography';

interface StarRatingProps {
  /** Current rating (1-5) or null if unrated */
  rating: number | null;
  /** Called when user taps a star; tapping selected star clears rating */
  onRate?: (rating: number | null) => void;
  /** Star size variant */
  size?: 'sm' | 'md' | 'lg';
  /** If true, stars are display-only */
  readonly?: boolean;
  /** Whether dark mode is active */
  isDark?: boolean;
  /** Called when 5-star is given (for confetti/celebration) */
  onPerfectRating?: () => void;
}

const STAR_SIZES = { sm: 14, md: 20, lg: 28 };

const CONFETTI_COLORS = ['#FFD700', '#FF6B35', '#FF1744', '#00E676', '#2979FF', '#AA00FF'];

/** Tiny confetti particle that bursts out from the stars on 5-star rating */
function ConfettiParticle({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2;
  const distance = 20 + Math.random() * 15;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1, { damping: 6, stiffness: 500 }),
      withDelay(200, withTiming(0, { duration: 300 })),
    );
    translateX.value = withSpring(tx, { damping: 8, stiffness: 200 });
    translateY.value = withSpring(ty, { damping: 8, stiffness: 200 });
    opacity.value = withDelay(300, withTiming(0, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: color,
      }, style]}
    />
  );
}

/** Individual animated star — bursts outward on tap when becoming filled */
function AnimatedStar({
  star,
  filled,
  starSize,
  filledColor,
  emptyColor,
  onPress,
  currentRating,
}: {
  star: number;
  filled: boolean;
  starSize: number;
  filledColor: string;
  emptyColor: string;
  onPress: () => void;
  currentRating: number | null;
}) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const burst = () => {
    scale.value = withSequence(
      withSpring(1.6, { damping: 6, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 260 }),
    );
    rotate.value = withSequence(
      withTiming(20, { duration: 80 }),
      withSpring(0, { damping: 8, stiffness: 300 }),
    );
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const handlePress = () => {
    burst();
    // Choreographed haptic: count-up taps + burst at animation peak
    if (currentRating === star) {
      HapticChoreography.starClear();
    } else {
      HapticChoreography.starBurst(star);
    }
    onPress();
  };

  return (
    // hapticDisabled — we own the haptic timing via HapticChoreography
    <HapticTouchableOpacity
      onPress={handlePress}
      hapticDisabled
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={animStyle}>
        <Icon
          name={filled ? Icons.STAR : Icons.STAR_OUTLINE}
          size={starSize}
          color={filled ? filledColor : emptyColor}
          accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
        />
      </Animated.View>
    </HapticTouchableOpacity>
  );
}

export default function StarRating({
  rating,
  onRate,
  size = 'md',
  readonly = false,
  isDark = false,
  onPerfectRating,
}: StarRatingProps) {
  const starSize = STAR_SIZES[size];
  const filledColor = isDark ? DarkColors.primary : Colors.primary;
  const emptyColor = isDark ? '#6B7280' : '#9CA3AF';
  const gap = size === 'sm' ? 1 : size === 'md' ? 2 : 4;
  const [showConfetti, setShowConfetti] = useState(false);

  const handlePress = (star: number) => {
    if (readonly || !onRate) return;
    const newRating = rating === star ? null : star;
    onRate(newRating);
    // Trigger confetti on 5-star rating
    if (newRating === 5) {
      setShowConfetti(true);
      onPerfectRating?.();
      setTimeout(() => setShowConfetti(false), 800);
    }
  };

  return (
    <View className="flex-row items-center" style={{ gap, position: 'relative' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating !== null && star <= rating;
        if (readonly) {
          return (
            <Icon
              key={star}
              name={filled ? Icons.STAR : Icons.STAR_OUTLINE}
              size={starSize}
              color={filled ? filledColor : emptyColor}
              accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            />
          );
        }
        return (
          <AnimatedStar
            key={star}
            star={star}
            filled={filled}
            starSize={starSize}
            filledColor={filledColor}
            emptyColor={emptyColor}
            onPress={() => handlePress(star)}
            currentRating={rating}
          />
        );
      })}
      {/* Tiny confetti burst on 5-star */}
      {showConfetti && (
        <View style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 10 }} pointerEvents="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} total={10} />
          ))}
        </View>
      )}
    </View>
  );
}
