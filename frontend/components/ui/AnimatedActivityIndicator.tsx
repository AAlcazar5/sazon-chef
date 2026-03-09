import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';

interface AnimatedActivityIndicatorProps {
  visible?: boolean;
  size?: number;
  color?: string;
}

export default function AnimatedActivityIndicator({
  visible = true,
  size = 24,
  color = '#F97316',
}: AnimatedActivityIndicatorProps) {
  if (!visible) return null;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <MotiView
        from={{ rotate: '0deg' }}
        animate={{ rotate: '360deg' }}
        transition={{
          type: 'timing',
          duration: 900,
          loop: true,
          repeatReverse: false,
        }}
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            borderTopColor: 'transparent',
          },
        ]}
      />
    </MotiView>
  );
}

const styles = StyleSheet.create({
  spinner: {
    borderWidth: 2.5,
  },
});
