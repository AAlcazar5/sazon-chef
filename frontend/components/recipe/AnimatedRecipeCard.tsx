import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface AnimatedRecipeCardProps {
  children: React.ReactNode;
  index: number;
  recipeId: string;
  animatedIds: Set<string>;
  onAnimated: (id: string) => void;
  scrollY?: Animated.Value; // For parallax effect
}

function AnimatedRecipeCard({
  children,
  index,
  recipeId,
  animatedIds,
  onAnimated,
  scrollY,
}: AnimatedRecipeCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!animatedIds.has(recipeId)) {
      const delay = index * 50; // 50ms delay between each card for smoother staggered effect
      
      // Staggered entrance animation with scale, opacity, and translateY
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimated(recipeId);
      });
    } else {
      // Already animated, set to visible
      opacity.setValue(1);
      scale.setValue(1);
      translateY.setValue(0);
    }
  }, [recipeId, index, animatedIds, opacity, scale, translateY, onAnimated]);

  // Parallax effect for images (if scrollY is provided)
  const parallaxStyle = scrollY
    ? {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [-100, 0, 100],
              outputRange: [-20, 0, 20],
              extrapolate: 'clamp',
            }),
          },
        ],
      }
    : {};

  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          { scale },
          { translateY },
        ],
      }}
    >
      <Animated.View style={parallaxStyle}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export default React.memo(AnimatedRecipeCard);

