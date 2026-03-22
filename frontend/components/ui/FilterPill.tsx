// frontend/components/ui/FilterPill.tsx
// Shared animated filter pill — spring scale on tap, consistent styling across all filter UIs

import React, { useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { getCategoryColor } from '../../constants/CategoryColors';

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  emoji?: string;
  /** Use green tint for dietary filters */
  color?: 'default' | 'green';
  /** Compact size for quick filter chips */
  compact?: boolean;
  /** Category name — auto-applies pastel bg + emoji from CATEGORY_COLORS */
  categoryName?: string;
}

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

export default function FilterPill({
  label,
  active,
  onPress,
  emoji,
  color = 'default',
  compact = false,
  categoryName,
}: FilterPillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.93, SPRING_CONFIG);
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
    })
    .onEnd(() => {
      // Haptic + callback run on JS thread
    });

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Category-specific coloring
  const catColor = categoryName ? getCategoryColor(categoryName) : null;

  const activeColor = catColor
    ? (isDark ? catColor.textDark : catColor.text)
    : color === 'green'
      ? isDark
        ? DarkColors.tertiaryGreen
        : Colors.tertiaryGreen
      : isDark
        ? DarkColors.primary
        : Colors.primary;

  const inactiveBg = catColor
    ? (isDark ? catColor.tintDark : catColor.tint)
    : isDark ? '#374151' : '#F3F4F6';

  const activeBg = catColor
    ? (isDark ? catColor.bgDark : catColor.bg)
    : activeColor;

  const resolvedEmoji = emoji ?? (catColor?.emoji || undefined);

  const textColor = active
    ? (catColor ? (isDark ? catColor.textDark : catColor.text) : '#FFFFFF')
    : isDark ? '#D1D5DB' : '#374151';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          animatedStyle,
          styles.pill,
          compact && styles.pillCompact,
          {
            backgroundColor: active ? activeBg : inactiveBg,
          },
          active && Shadows.SM,
          catColor && !active && { backgroundColor: isDark ? catColor.tintDark : catColor.tint },
        ]}
      >
        {/* Use Pressable overlay for onPress since Gesture.Tap doesn't support runOnJS callbacks easily */}
        <Animated.View
          style={styles.inner}
          // @ts-ignore - RN pressable workaround
          onStartShouldSetResponder={() => true}
          onResponderRelease={handlePress}
        >
          {resolvedEmoji && <Text style={styles.emoji}>{resolvedEmoji}</Text>}
          <Text
            style={[
              compact ? styles.textCompact : styles.text,
              { color: textColor },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Dismissible active filter chip with × button */
export function ActiveFilterChip({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        styles.activeChip,
        {
          backgroundColor: isDark ? DarkColors.primary + '33' : Colors.primary + '1A',
          borderColor: isDark ? DarkColors.primary + '66' : Colors.primary + '33',
        },
      ]}
    >
      <Text
        style={[
          styles.activeChipText,
          { color: isDark ? DarkColors.primary : Colors.primary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.activeChipClose,
          { color: isDark ? DarkColors.primary : Colors.primary },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0, SPRING_CONFIG);
          setTimeout(onDismiss, 150);
        }}
      >
        {'  \u00D7'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  pillCompact: {
    // slightly smaller padding for quick filter rows
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeChipClose: {
    fontSize: 14,
    fontWeight: '700',
  },
});
