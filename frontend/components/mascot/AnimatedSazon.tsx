import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import SazonMascot, { SazonExpression, SazonSize, SazonVariant } from './SazonMascot';

interface AnimatedSazonProps {
  expression?: SazonExpression;
  size?: SazonSize;
  variant?: SazonVariant;
  animationType?: 'idle' | 'bounce' | 'pulse' | 'wave' | 'celebrate' | 'stirring' | 'chopping' | 'none';
  style?: any;
}

export default function AnimatedSazon({
  expression = 'happy',
  size = 'medium',
  variant = 'orange',
  animationType = 'idle',
  style,
}: AnimatedSazonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    switch (animationType) {
      case 'idle':
        // Gentle breathing animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'bounce':
        // Bounce animation for interactions
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'pulse':
        // Pulse animation for attention
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'wave':
        // Wave animation (slight rotation)
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: -1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'celebrate':
        // Celebration animation (bounce + rotate)
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateYAnim, {
              toValue: -20,
              duration: 300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: 300,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: -15,
              duration: 200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: -1,
              duration: 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
        break;

      case 'stirring':
        // Stirring animation - circular rotation motion (simulates stirring with spatula)
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(rotateAnim, {
                toValue: 0.8,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(translateYAnim, {
                toValue: -3,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(rotateAnim, {
                toValue: -0.8,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(translateYAnim, {
                toValue: 3,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(rotateAnim, {
                toValue: 0,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(translateYAnim, {
                toValue: 0,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
        break;

      case 'chopping':
        // Chopping animation - up and down motion (simulates chopping with knife)
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateYAnim, {
              toValue: -8,
              duration: 200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: 150,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: -6,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: 120,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            // Small pause between chops
            Animated.delay(100),
          ])
        ).start();
        break;

      case 'none':
      default:
        // No animation
        break;
    }
  }, [animationType, scaleAnim, rotateAnim, translateYAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  // Determine tool based on animation type
  const tool = animationType === 'chopping' ? 'knife' : animationType === 'stirring' ? 'spatula' : 'spatula';

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { scale: scaleAnim },
            { rotate },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <SazonMascot expression={expression} size={size} variant={variant} tool={tool} />
    </Animated.View>
  );
}

