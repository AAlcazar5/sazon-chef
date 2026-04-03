import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import LottieMascot from './LottieMascot';
import { LogoMascotExpression, LogoMascotSize } from './LogoMascot';

interface AnimatedLottieMascotProps {
  expression?: LogoMascotExpression;
  size?: LogoMascotSize;
  animationType?: 'idle' | 'bounce' | 'pulse' | 'wave' | 'celebrate' | 'none';
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: any;
}

export default function AnimatedLottieMascot({
  expression = 'happy',
  size = 'medium',
  animationType = 'idle',
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
}: AnimatedLottieMascotProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    switch (animationType) {
      case 'idle':
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
        break;
    }

    return () => {
      scaleAnim.stopAnimation();
      rotateAnim.stopAnimation();
      translateYAnim.stopAnimation();
    };
  }, [animationType, scaleAnim, rotateAnim, translateYAnim]);

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
        },
      ]}
    >
      <LottieMascot
        expression={expression}
        size={size}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
      />
    </Animated.View>
  );
}
