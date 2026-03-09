import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface ParallaxScrollViewProps {
  parallaxImage?: string;
  parallaxHeight?: number;
  parallaxSpeed?: number;
  children: React.ReactNode;
  [key: string]: any;
}

export default function ParallaxScrollView({
  parallaxImage,
  parallaxHeight = 200,
  parallaxSpeed = 0.5,
  children,
  ...scrollViewProps
}: ParallaxScrollViewProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, parallaxHeight],
          [0, parallaxHeight * parallaxSpeed],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      scrollY.value,
      [0, parallaxHeight * 0.5, parallaxHeight],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View style={styles.container}>
      {parallaxImage && (
        <Animated.View
          style={[
            styles.parallaxImageContainer,
            { height: parallaxHeight },
            imageAnimatedStyle,
          ]}
        >
          <Image
            source={{ uri: parallaxImage }}
            style={styles.parallaxImage}
            contentFit="cover"
          />
        </Animated.View>
      )}
      <Animated.ScrollView
        {...scrollViewProps}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          scrollViewProps.contentContainerStyle,
          parallaxImage && { paddingTop: parallaxHeight },
        ]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  parallaxImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  parallaxImage: {
    width: '100%',
    height: '100%',
  },
});
