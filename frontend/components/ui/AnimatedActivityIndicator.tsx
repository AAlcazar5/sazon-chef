import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';

interface AnimatedActivityIndicatorProps {
  visible?: boolean;
  size?: number | 'small' | 'large';
  color?: string;
  style?: object;
}

const SIZE_MAP: Record<string, number> = { small: 20, large: 36 };

export default function AnimatedActivityIndicator({
  visible = true,
  size = 24,
  color = '#F97316',
  style,
}: AnimatedActivityIndicatorProps) {
  if (!visible) return null;

  const resolvedSize = typeof size === 'string' ? (SIZE_MAP[size] ?? 24) : size;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'timing', duration: 200 }}
      style={style}
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
            width: resolvedSize,
            height: resolvedSize,
            borderRadius: resolvedSize / 2,
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
