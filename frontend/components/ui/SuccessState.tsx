import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AnimatedLogoMascot } from '../mascot';
import { LogoMascotExpression } from '../mascot/LogoMascot';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { Colors, DarkColors, Gradients } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import GradientBorder from './GradientBorder';
import GradientText from './GradientText';

interface SuccessStateProps {
  title: string;
  message?: string;
  expression?: LogoMascotExpression;
  size?: 'small' | 'medium' | 'large' | 'hero';
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
  autoDismiss?: boolean;
  onDismiss?: () => void;
  dismissDelay?: number;
}

export default function SuccessState({
  title,
  message,
  expression = 'chef-kiss',
  size = 'large',
  actionLabel,
  onAction,
  fullScreen = false,
  autoDismiss = false,
  onDismiss,
  dismissDelay = 3000,
}: SuccessStateProps) {
  const colorScheme = useColorScheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Celebration entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Title animation - delayed
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-dismiss if enabled
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [scaleAnim, opacityAnim, titleOpacity, titleTranslateY, autoDismiss, onDismiss, dismissDelay]);

  const containerStyle = fullScreen
    ? styles.fullScreenContainer
    : styles.container;

  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: opacityAnim,
          backgroundColor: fullScreen ? (isDark ? DarkColors.background : Colors.background) : 'transparent',
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <AnimatedLogoMascot
          expression={expression}
          size={size}
          animationType="celebrate"
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
          alignItems: 'center',
        }}
      >
        <Text 
          className="text-2xl font-bold mt-6 text-center"
          style={{ color: colorScheme === 'dark' ? DarkColors.text.primary : Colors.text.primary }}
        >
          {title}
        </Text>
        {message && (
          <Text 
            className="text-base mt-2 text-center"
            style={{ color: colorScheme === 'dark' ? DarkColors.text.secondary : Colors.text.secondary }}
          >
            {message}
          </Text>
        )}
        {actionLabel && onAction && (
          <HapticTouchableOpacity
            onPress={onAction}
            className="px-6 py-3 rounded-lg mt-6"
            style={{ 
              backgroundColor: colorScheme === 'dark' ? DarkColors.primary : Colors.primary,
              minWidth: 120,
            }}
          >
            <Text 
              style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                textAlign: 'center',
                color: '#FFFFFF',
              }}
            >
              {actionLabel}
            </Text>
          </HapticTouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});

