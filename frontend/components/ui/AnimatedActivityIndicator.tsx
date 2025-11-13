import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ActivityIndicatorProps, Animated } from 'react-native';

interface AnimatedActivityIndicatorProps extends ActivityIndicatorProps {
  visible?: boolean;
}

export default function AnimatedActivityIndicator({
  visible = true,
  ...props
}: AnimatedActivityIndicatorProps) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={{ opacity }}>
      <ActivityIndicator {...props} />
    </Animated.View>
  );
}

