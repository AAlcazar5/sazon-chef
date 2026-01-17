import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import LogoMascot, { LogoMascotExpression, LogoMascotSize } from './LogoMascot';

interface AnimatedLogoMascotProps {
  expression?: LogoMascotExpression;
  size?: LogoMascotSize;
  animationType?: 'idle' | 'bounce' | 'pulse' | 'wave' | 'celebrate' | 'none';
  style?: any;
}

export default function AnimatedLogoMascot({
  expression = 'happy',
  size = 'medium',
  animationType = 'idle',
  style,
}: AnimatedLogoMascotProps) {
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
        // Celebration animation - bounce and rotate
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.sequence([
                Animated.timing(scaleAnim, {
                  toValue: 1.15,
                  duration: 300,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                  toValue: 1,
                  duration: 300,
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
              Animated.sequence([
                Animated.timing(translateYAnim, {
                  toValue: -10,
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
              ]),
            ]),
            Animated.delay(500),
          ])
        ).start();
        break;

      case 'none':
      default:
        // No animation
        break;
    }

    return () => {
      // Cleanup animations on unmount
      scaleAnim.stopAnimation();
      rotateAnim.stopAnimation();
      translateYAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [animationType, scaleAnim, rotateAnim, translateYAnim, opacityAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

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
      <LogoMascot expression={expression} size={size} />
    </Animated.View>
  );
}

