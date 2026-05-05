// frontend/components/cooking/PostCookRating.tsx
// ROADMAP 4.0 Tier J9 — Post-cook 5-star bloom.
//
// Five-star rating row that produces a designed peak moment when 5 is tapped:
// the row collapses into a single line ("Loved it. We'll find you more."),
// haptic success fires once, and the cuisine + technique can be stored as a
// high-confidence taste signal. 1–4 stars submit normally without the bloom.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type RatingTaste = 'disliked' | 'neutral' | 'liked' | 'loved';
export interface RatingSubmission {
  stars: number;
  taste: RatingTaste;
}

interface PostCookRatingProps {
  /** Called when the user submits a rating (any star). */
  onSubmit: (submission: RatingSubmission) => void;
}

const tasteForStars = (stars: number): RatingTaste => {
  if (stars <= 0) return 'neutral';
  if (stars <= 2) return 'disliked';
  if (stars === 3) return 'neutral';
  if (stars === 4) return 'liked';
  return 'loved';
};

interface StarProps {
  index: number;
  filled: boolean;
  bloom: boolean;
  onPress: () => void;
}

function Star({ index, filled, bloom, onPress }: StarProps) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (bloom) {
      scale.value = withSequence(
        withTiming(0.7, { duration: 60 }),
        withSpring(1.4, { damping: 8, stiffness: 240 }),
        withSpring(1.0, { damping: 12, stiffness: 220 }),
      );
    }
  }, [bloom, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      testID={`post-cook-star-${index}`}
      accessibilityRole="button"
      accessibilityLabel={`${index} star${index === 1 ? '' : 's'}`}
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.starHit}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={28}
          color={filled ? Accent.golden : '#9CA3AF'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function PostCookRating({ onSubmit }: PostCookRatingProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [submitted, setSubmitted] = useState<number | null>(null);

  const handleStarPress = (stars: number) => {
    if (submitted !== null) return;
    const taste = tasteForStars(stars);
    if (stars >= 5) {
      Promise.resolve(
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      ).catch(() => undefined);
    }
    setSubmitted(stars);
    onSubmit({ stars, taste });
  };

  const isLoved = submitted !== null && submitted >= 5;

  if (isLoved) {
    return (
      <View
        style={[
          styles.lovedRow,
          { backgroundColor: isDark ? PastelDark.golden : Pastel.golden },
        ]}
        accessibilityRole="summary"
        accessibilityLabel="Loved it. We'll find you more."
      >
        <Ionicons name="sparkles" size={16} color={Accent.golden} />
        <Text
          style={[
            styles.lovedCopy,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
        >
          Loved it. We'll find you more.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((idx) => (
        <Star
          key={idx}
          index={idx}
          filled={submitted !== null && idx <= submitted}
          bloom={submitted !== null && idx === 5 && submitted >= 5}
          onPress={() => handleStarPress(idx)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  starHit: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  lovedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 100,
    marginHorizontal: 16,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  lovedCopy: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
