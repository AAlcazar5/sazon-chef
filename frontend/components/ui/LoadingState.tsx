import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedSazon } from '../mascot';
import { SazonExpression } from '../mascot/SazonMascot';

interface LoadingStateProps {
  message?: string;
  expression?: SazonExpression;
  size?: 'small' | 'medium' | 'large';
  variant?: 'orange' | 'red';
  fullScreen?: boolean;
}

export default function LoadingState({
  message = 'Loading...',
  expression = 'thinking',
  size = 'large',
  variant = 'orange',
  fullScreen = false,
}: LoadingStateProps) {
  const containerStyle = fullScreen
    ? styles.fullScreenContainer
    : styles.container;

  return (
    <View style={containerStyle}>
      <AnimatedSazon
        expression={expression}
        size={size}
        variant={variant}
        animationType="pulse"
      />
      <Text className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-4 text-center">
        {message}
      </Text>
    </View>
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

