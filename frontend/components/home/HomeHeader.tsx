// frontend/components/home/HomeHeader.tsx
// Header — logo + brand name + animated filters button (using BrandButton)

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import FrostedHeader from '../ui/FrostedHeader';
import { LogoMascot } from '../mascot';

interface HomeHeaderProps {
  /** Called when the mascot logo is pressed — scrolls to top */
  onMascotPress: () => void;
  /** Called when the filters button is pressed */
  onFilterPress?: () => void;
  /** Number of active filters (for badge) */
  activeFilterCount?: number;
  /** Called when Surprise Me is pressed */
  onSurpriseMe?: () => void;
}

export default function HomeHeader({
  onMascotPress,
  onFilterPress,
  activeFilterCount = 0,
  onSurpriseMe,
}: HomeHeaderProps) {
  // Badge animation — bounces when count changes
  const badgeScale = useSharedValue(1);
  const badgeRotation = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    );
    badgeRotation.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [activeFilterCount]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotation.value}deg` },
    ],
  }));

  return (
    <FrostedHeader paddingBottom={12} withTopInset>
      <View className="flex-row items-center justify-between" style={{ height: 36 }}>
        <View className="flex-row items-center">
          <HapticTouchableOpacity onPress={onMascotPress}>
            <LogoMascot size="xsmall" />
          </HapticTouchableOpacity>
          <Text
            className="text-2xl font-black text-gray-900 dark:text-gray-100 ml-0.5"
            style={{ lineHeight: 36 }}
            accessibilityRole="header"
          >
            Sazon Chef
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          {onSurpriseMe && (
            <BrandButton
              label="Surprise"
              emoji="🎰"
              onPress={onSurpriseMe}
              variant="ghost"
              size="compact"
              hapticStyle="medium"
              accessibilityLabel="Surprise Me"
            />
          )}

          {onFilterPress && (
            <View style={styles.filterWrapper}>
              <BrandButton
                label="Filters"
                icon="options"
                onPress={onFilterPress}
                variant="brand"
                size="compact"
                hapticStyle="medium"
                accessibilityLabel={`Filters, ${activeFilterCount} active`}
              />

              {/* Animated badge — always visible */}
              <Animated.View style={[styles.badge, badgeAnimStyle]} pointerEvents="none">
                <LinearGradient
                  colors={['#FFFFFF', '#F3F4F6']}
                  style={styles.badgeGradient}
                >
                  <Text style={styles.badgeText}>
                    {activeFilterCount}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
          )}
        </View>
      </View>
    </FrostedHeader>
  );
}

const styles = StyleSheet.create({
  filterWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#E84D3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#E84D3D',
    fontSize: 10,
    fontWeight: '800',
  },
});
