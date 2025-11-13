import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ROTATION_DEG = 10;

interface CardStackProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

export default function CardStack({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: CardStackProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorType, setIndicatorType] = useState<'like' | 'dislike' | null>(null);

  // Track position for indicator
  useEffect(() => {
    const listener = position.x.addListener(({ value }) => {
      if (Math.abs(value) > 50) {
        setShowIndicator(true);
        setIndicatorType(value > 0 ? 'like' : 'dislike');
      } else {
        setShowIndicator(false);
        setIndicatorType(null);
      }
    });

    return () => {
      position.x.removeListener(listener);
    };
  }, [position.x]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        rotation.setValue(gesture.dx / SCREEN_WIDTH);
        opacity.setValue(1 - Math.abs(gesture.dx) / SCREEN_WIDTH);
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD) {
          // Swipe detected
          const direction = gesture.dx > 0 ? 'right' : 'left';
          
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH, y: gesture.dy },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (direction === 'right' && onSwipeRight) {
              onSwipeRight();
            } else if (direction === 'left' && onSwipeLeft) {
              onSwipeLeft();
            }
            // Reset position
            position.setValue({ x: 0, y: 0 });
            rotation.setValue(0);
            opacity.setValue(1);
            setShowIndicator(false);
            setIndicatorType(null);
          });
        } else {
          // Spring back to center
          Animated.parallel([
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(rotation, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rotateCard = rotation.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [`-${ROTATION_DEG}deg`, '0deg', `${ROTATION_DEG}deg`],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotateCard },
          ],
          opacity,
        },
      ]}
    >
      {children}
      
      {/* Swipe indicators */}
      {showIndicator && (
        <View style={styles.indicators}>
          {indicatorType === 'like' ? (
            <View style={[styles.indicator, styles.likeIndicator]}>
              <Ionicons name="heart" size={40} color="#10B981" />
            </View>
          ) : (
            <View style={[styles.indicator, styles.dislikeIndicator]}>
              <Ionicons name="close" size={40} color="#EF4444" />
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    position: 'relative',
  },
  indicators: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  indicator: {
    borderRadius: 8,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  likeIndicator: {
    borderWidth: 4,
    borderColor: '#10B981',
  },
  dislikeIndicator: {
    borderWidth: 4,
    borderColor: '#EF4444',
  },
});

