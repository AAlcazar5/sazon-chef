import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressDotsProps {
  total: number;
  activeIndex: number;
}

export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <View style={styles.container} testID="progress-dots">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === activeIndex;
        return (
          <View
            key={i}
            testID={`dot-${i}`}
            style={[
              styles.dot,
              {
                width: isActive ? 24 : 8,
                backgroundColor: isActive ? '#fa7e12' : '#D1D5DB',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
