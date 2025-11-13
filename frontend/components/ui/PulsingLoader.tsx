import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface PulsingLoaderProps {
  size?: number;
  color?: string;
}

export default function PulsingLoader({ size = 20, color = 'white' }: PulsingLoaderProps) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createPulse(pulse1, 0),
      createPulse(pulse2, 400),
      createPulse(pulse3, 800),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const getAnimatedStyle = (pulseValue: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity: pulseValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    }),
    transform: [
      {
        scale: pulseValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.8, 1.2, 0.8],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={getAnimatedStyle(pulse1)} />
      <Animated.View style={[getAnimatedStyle(pulse2), { marginHorizontal: size * 0.3 }]} />
      <Animated.View style={getAnimatedStyle(pulse3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

