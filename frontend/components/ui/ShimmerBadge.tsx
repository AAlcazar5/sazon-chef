// frontend/components/ui/ShimmerBadge.tsx
// Badge with a moving shimmer highlight — used for Premium status indicator

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface ShimmerBadgeProps {
  label: string;
  testID?: string;
}

const BADGE_WIDTH = 96;
const SHIMMER_WIDTH = 40;

export default function ShimmerBadge({ label, testID }: ShimmerBadgeProps) {
  const shimmerX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(BADGE_WIDTH + SHIMMER_WIDTH, {
        duration: 1600,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View testID={testID} style={styles.wrapper}>
      <LinearGradient
        colors={['#F97316', '#FBBF24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.badge}
      >
        <Text style={styles.label}>{label}</Text>
        {/* Shimmer strip */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
  },
  badge: {
    width: BADGE_WIDTH,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_WIDTH,
  },
});
