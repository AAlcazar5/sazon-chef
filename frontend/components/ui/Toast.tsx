import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      // Slide in from top
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
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
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
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
        };
      case 'error':
        return {
          bg: 'bg-red-500 dark:bg-red-600',
          icon: 'close-circle' as const,
          iconColor: 'white',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500 dark:bg-yellow-600',
          icon: 'warning' as const,
          iconColor: 'white',
        };
      default:
        return {
          bg: 'bg-blue-500 dark:bg-blue-600',
          icon: 'information-circle' as const,
          iconColor: 'white',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <SafeAreaView
      edges={['top']}
      className="absolute top-0 left-0 right-0 z-50"
      pointerEvents="box-none"
    >
      <Animated.View
        style={{
          transform: [{ translateY }],
          opacity,
        }}
        className={`${styles.bg} mx-4 mt-2 rounded-lg shadow-lg`}
      >
        <TouchableOpacity
          onPress={handleClose}
          className="flex-row items-center px-4 py-3"
          activeOpacity={0.8}
        >
          <Ionicons name={styles.icon} size={24} color={styles.iconColor} />
          <Text className="text-white font-medium ml-3 flex-1">{message}</Text>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

