// frontend/components/cookbook/StarRating.tsx
// Reusable 5-star rating component for cookbook recipes

import { View } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

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
    // Tapping same star clears rating
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
          <HapticTouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Icon
              name={filled ? Icons.STAR : Icons.STAR_OUTLINE}
              size={starSize}
              color={filled ? filledColor : emptyColor}
              accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
            />
          </HapticTouchableOpacity>
        );
      })}
    </View>
  );
}
