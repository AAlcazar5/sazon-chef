import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedRecipeCardProps {
  children: React.ReactNode;
  index: number;
  recipeId: string;
  animatedIds: Set<string>;
  onAnimated: (id: string) => void;
}

function AnimatedRecipeCard({
  children,
  index,
  recipeId,
  animatedIds,
  onAnimated,
}: AnimatedRecipeCardProps) {
  const opacity = useSharedValue(animatedIds.has(recipeId) ? 1 : 0);
  const scale = useSharedValue(animatedIds.has(recipeId) ? 1 : 0.92);
  const translateY = useSharedValue(animatedIds.has(recipeId) ? 0 : 16);

  useEffect(() => {
    if (!animatedIds.has(recipeId)) {
      const delay = index * 50;
      opacity.value = withTiming(1, { duration: 400 + delay });
      translateY.value = withTiming(0, { duration: 400 + delay });
      scale.value = withSpring(1, { damping: 14, stiffness: 120 }, (finished) => {
        if (finished) {
          runOnJS(onAnimated)(recipeId);
        }
      });
    }
  }, [recipeId]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

export default React.memo(AnimatedRecipeCard);
