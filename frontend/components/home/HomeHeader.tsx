// frontend/components/home/HomeHeader.tsx
// Header — logo + brand name + animated filters button

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FrostedHeader from '../ui/FrostedHeader';
import { LogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';

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

const SPRING_PRESS = { damping: 12, stiffness: 400 };
const SPRING_BOUNCE = { damping: 8, stiffness: 300 };

export default function HomeHeader({
  onMascotPress,
  onFilterPress,
  activeFilterCount = 0,
  onSurpriseMe,
}: HomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Press animation
  const pressScale = useSharedValue(1);

  // Badge animation — bounces when count changes
  const badgeScale = useSharedValue(1);
  const badgeRotation = useSharedValue(0);

  // Icon rotation on press
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 400 }),
      withSpring(1, SPRING_BOUNCE),
    );
    badgeRotation.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [activeFilterCount]);

  const handlePressIn = () => {
    pressScale.value = withSpring(0.93, SPRING_PRESS);
    iconRotation.value = withSpring(15, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, SPRING_BOUNCE);
    iconRotation.value = withSpring(0, SPRING_BOUNCE);
  };

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotation.value}deg` },
    ],
  }));

  return (
    <FrostedHeader paddingBottom={12} withTopInset={false}>
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
            <HapticTouchableOpacity
              onPress={onSurpriseMe}
              hapticStyle="medium"
              accessibilityLabel="Surprise Me"
              accessibilityRole="button"
              style={styles.surpriseButton}
            >
              <Text style={{ fontSize: 13 }}>🎰</Text>
              <Text style={[styles.label, { color: '#EF4444' }]}>Surprise</Text>
            </HapticTouchableOpacity>
          )}

          {onFilterPress && (
            <Animated.View style={buttonAnimStyle}>
              <HapticTouchableOpacity
                onPress={onFilterPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityLabel={`Filters, ${activeFilterCount} active`}
                accessibilityRole="button"
                style={styles.buttonOuter}
              >
                <LinearGradient
                  colors={['#FF8B41', '#E84D3D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <Animated.View style={iconAnimStyle}>
                    <Ionicons
                      name="options"
                      size={15}
                      color="#FFF"
                    />
                  </Animated.View>
                  <Text style={[styles.label, { color: '#FFF' }]}>
                    Filters
                  </Text>
                </LinearGradient>

                {/* Animated badge — always visible */}
                <Animated.View style={[styles.badge, badgeAnimStyle]}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F3F4F6']}
                    style={styles.badgeGradient}
                  >
                    <Text style={styles.badgeText}>
                      {activeFilterCount}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </HapticTouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </FrostedHeader>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    position: 'relative',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 5,
  },
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
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
