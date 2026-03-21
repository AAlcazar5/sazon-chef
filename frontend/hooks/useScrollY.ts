// frontend/hooks/useScrollY.ts
// Provides a shared scroll Y value for scroll-driven animations.
// Returns scrollY (SharedValue) and scrollHandler (for Animated.ScrollView onScroll).

import {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

export function useScrollY() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return { scrollY, scrollHandler };
}
