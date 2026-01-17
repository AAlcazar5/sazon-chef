import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoMascot, { LogoMascotExpression } from '../mascot/LogoMascot';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing, ComponentSpacing, BorderRadius } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { alertAccessibility } from '../../utils/accessibility';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export default function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from top using animation constants
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleClose();
    }
  }, [visible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  if (!visible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500 dark:bg-green-600',
          icon: 'checkmark-circle' as const,
          iconColor: 'white',
          mascotExpression: 'celebrating' as LogoMascotExpression,
        };
      case 'error':
        return {
          bg: 'bg-red-600 dark:bg-red-400',
          icon: 'close-circle' as const,
          iconColor: 'white',
          mascotExpression: 'supportive' as LogoMascotExpression,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500 dark:bg-yellow-600',
          icon: 'warning' as const,
          iconColor: 'white',
          mascotExpression: 'surprised' as LogoMascotExpression,
        };
      default:
        return {
          bg: 'bg-blue-500 dark:bg-blue-600',
          icon: 'information-circle' as const,
          iconColor: 'white',
          mascotExpression: 'curious' as LogoMascotExpression,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <SafeAreaView
      edges={['top']}
      className="absolute top-0 left-0 right-0 z-50"
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.toastContainer,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
        className={typeStyles.bg}
        {...alertAccessibility(message, type)}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={styles.touchable}
          activeOpacity={0.8}
          accessibilityLabel="Dismiss notification"
          accessibilityHint="Double tap to dismiss"
        >
          <View style={styles.mascotContainer}>
            <LogoMascot
              expression={typeStyles.mascotExpression}
              size="tiny"
            />
          </View>
          <Text style={styles.message}>{message}</Text>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: ComponentSpacing.toast.marginBottom,
    marginTop: Spacing.sm,
    borderRadius: ComponentSpacing.toast.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ComponentSpacing.toast.paddingHorizontal,
    paddingVertical: ComponentSpacing.toast.padding,
  },
  mascotContainer: {
    marginRight: Spacing.sm,
  },
  message: {
    color: '#FFFFFF',
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
});

