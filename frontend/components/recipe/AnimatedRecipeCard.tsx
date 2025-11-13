import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface AnimatedRecipeCardProps {
  children: React.ReactNode;
  index: number;
  recipeId: string;
  animatedIds: Set<string>;
  onAnimated: (id: string) => void;
}

export default function AnimatedRecipeCard({
  children,
  index,
  recipeId,
  animatedIds,
  onAnimated,
}: AnimatedRecipeCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animatedIds.has(recipeId)) {
      const delay = index * 100; // 100ms delay between each card
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }).start(() => {
        onAnimated(recipeId);
      });
    } else {
      // Already animated, set to visible
      opacity.setValue(1);
    }
  }, [recipeId, index, animatedIds, opacity, onAnimated]);

  return (
    <Animated.View
      style={{
        opacity,
      }}
    >
      {children}
    </Animated.View>
  );
}

