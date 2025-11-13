import React, { useRef } from 'react';
import { ScrollView, ScrollViewProps, Animated, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ParallaxScrollViewProps extends ScrollViewProps {
  parallaxImage?: string;
  parallaxHeight?: number;
  parallaxSpeed?: number;
  children: React.ReactNode;
}

export default function ParallaxScrollView({
  parallaxImage,
  parallaxHeight = 200,
  parallaxSpeed = 0.5, // 0.5 means background moves at half the speed of foreground
  children,
  ...scrollViewProps
}: ParallaxScrollViewProps) {
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const parallaxTranslateY = scrollY.interpolate({
    inputRange: [0, parallaxHeight],
    outputRange: [0, parallaxHeight * parallaxSpeed],
    extrapolate: 'clamp',
  });

  const parallaxOpacity = scrollY.interpolate({
    inputRange: [0, parallaxHeight * 0.5, parallaxHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {parallaxImage && (
        <Animated.View
          style={[
            styles.parallaxImageContainer,
            {
              height: parallaxHeight,
              transform: [{ translateY: parallaxTranslateY }],
              opacity: parallaxOpacity,
            },
          ]}
        >
          <Image
            source={{ uri: parallaxImage }}
            style={styles.parallaxImage}
            contentFit="cover"
          />
        </Animated.View>
      )}
      <ScrollView
        {...scrollViewProps}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          scrollViewProps.contentContainerStyle,
          parallaxImage && { paddingTop: parallaxHeight },
        ]}
      >
        {children}
      </ScrollView>
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

