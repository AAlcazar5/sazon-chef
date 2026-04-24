import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StickyBottomBarProps extends ViewProps {
  children: React.ReactNode;
  fadeColor?: string;
}

export function StickyBottomBar({ children, fadeColor = '#FAF7F4', style, testID, ...props }: StickyBottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }, style]}
      {...props}
    >
      <LinearGradient
        testID={testID ? `${testID}-fade` : 'sticky-bar-fade'}
        colors={['transparent', fadeColor]}
        style={styles.fade}
        pointerEvents="none"
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  fade: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#FAF7F4',
  },
});
