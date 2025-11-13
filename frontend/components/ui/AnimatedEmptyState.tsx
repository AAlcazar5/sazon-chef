import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';

interface AnimatedEmptyStateProps {
  icon: keyof typeof Icons;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
  iconColor?: string;
}

export default function AnimatedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  iconSize = 64,
  iconColor = '#9CA3AF',
}: AnimatedEmptyStateProps) {
  const bounceScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle bounce animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceScale, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse opacity animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();
    pulseAnimation.start();

    return () => {
      bounceAnimation.stop();
      pulseAnimation.stop();
    };
  }, [bounceScale, pulseOpacity]);

  return (
    <View className="flex-1 items-center justify-center p-8">
      <Animated.View
        style={{
          transform: [{ scale: bounceScale }],
          opacity: pulseOpacity,
        }}
      >
        <Icon name={icon} size={iconSize} color={iconColor} accessibilityLabel={title} />
      </Animated.View>
      <Text className="text-xl font-semibold text-gray-500 dark:text-gray-200 mt-4 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-gray-400 dark:text-gray-300 text-center mt-2">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <HapticTouchableOpacity 
          onPress={onAction}
          className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg mt-4"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}

