// frontend/components/cookbook/StarRating.tsx
// Reusable 5-star rating component for cookbook recipes — stars burst on tap

import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
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
}

const STAR_SIZES = { sm: 14, md: 20, lg: 28 };

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
}: StarRatingProps) {
  const starSize = STAR_SIZES[size];
  const filledColor = isDark ? DarkColors.primary : Colors.primary;
  const emptyColor = isDark ? '#6B7280' : '#9CA3AF';
  const gap = size === 'sm' ? 1 : size === 'md' ? 2 : 4;

  const handlePress = (star: number) => {
    if (readonly || !onRate) return;
    onRate(rating === star ? null : star);
  };

  return (
    <View className="flex-row items-center" style={{ gap }}>
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
    </View>
  );
}
