import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AnimatedSazon } from '../mascot';
import { SazonExpression } from '../mascot/SazonMascot';
import HapticTouchableOpacity from './HapticTouchableOpacity';

interface SuccessStateProps {
  title: string;
  message?: string;
  expression?: SazonExpression;
  size?: 'small' | 'medium' | 'large' | 'hero';
  variant?: 'orange' | 'red';
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
  variant = 'orange',
  actionLabel,
  onAction,
  fullScreen = false,
  autoDismiss = false,
  onDismiss,
  dismissDelay = 3000,
}: SuccessStateProps) {
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

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <AnimatedSazon
          expression={expression}
          size={size}
          variant={variant}
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
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 text-center">
          {title}
        </Text>
        {message && (
          <Text className="text-base text-gray-600 dark:text-gray-400 mt-2 text-center">
            {message}
          </Text>
        )}
        {actionLabel && onAction && (
          <HapticTouchableOpacity
            onPress={onAction}
            className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg mt-6"
          >
            <Text className="text-white font-semibold">{actionLabel}</Text>
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

