// frontend/components/home/SurpriseMeFAB.tsx
// Floating Action Button — "Surprise Me!" gradient pill with spring bounce on press

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Text } from 'react-native';

interface SurpriseMeFABProps {
  onPress: () => void;
  bottomOffset?: number;
}

export default function SurpriseMeFAB({ onPress, bottomOffset }: SurpriseMeFABProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  // Idle pulse — very subtle, 0.98 → 1.02, 2s period
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 900 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 300 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle, bottomOffset !== undefined && { bottom: bottomOffset + 12 }]}>
      <HapticTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel="Surprise Me — open recipe roulette"
        accessibilityRole="button"
        activeOpacity={1}
      >
        <LinearGradient
          colors={['#FB923C', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pill}
        >
          <Text style={styles.emoji}>🎰</Text>
          <Text style={styles.label}>Surprise Me!</Text>
        </LinearGradient>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    // shadow
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  label: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
