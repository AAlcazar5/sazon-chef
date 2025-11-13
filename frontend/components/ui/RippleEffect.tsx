import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, TouchableOpacityProps, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';

interface RippleEffectProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  rippleColor?: string;
  rippleOpacity?: number;
  rippleDuration?: number;
  disabled?: boolean;
  className?: string;
  style?: any;
}

export default function RippleEffect({
  children,
  rippleColor = 'rgba(255, 255, 255, 0.5)',
  rippleOpacity = 0.5,
  rippleDuration = 600,
  disabled = false,
  onPress,
  style,
  ...props
}: RippleEffectProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; scale: Animated.Value; opacity: Animated.Value }>>([]);
  const rippleId = useRef(0);
  const containerRef = useRef<View>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handlePress = (event: any) => {
    if (disabled) return;

    const { locationX, locationY } = event.nativeEvent;
    const id = rippleId.current++;
    
    const maxSize = Math.max(containerSize.width, containerSize.height) * 2;
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(rippleOpacity)).current;

    const newRipple = {
      id,
      x: locationX,
      y: locationY,
      scale,
      opacity,
    };

    setRipples(prev => [...prev, newRipple]);

    // Animate ripple
    Animated.parallel([
      Animated.timing(scale, {
        toValue: maxSize,
        duration: rippleDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: rippleDuration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Remove ripple after animation
      setRipples(prev => prev.filter(r => r.id !== id));
    });

    // Call original onPress
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      {...(props as any)}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1} // Disable default opacity change
      style={[styles.container, style]}
    >
      <View
        ref={containerRef}
        onLayout={handleLayout}
        style={styles.content}
      >
        {children}
        {ripples.map(ripple => {
          const size = Math.max(containerSize.width, containerSize.height) * 2;
          return (
            <Animated.View
              key={ripple.id}
              style={[
                styles.ripple,
                {
                  left: ripple.x - size / 2,
                  top: ripple.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: rippleColor,
                  transform: [{ scale: ripple.scale }],
                  opacity: ripple.opacity,
                },
              ]}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

