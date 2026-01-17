import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Duration } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VERTICAL_THRESHOLD = 100;
const ROTATION_DEG = 10;

interface CardStackProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  disabled?: boolean;
}

export default function CardStack({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
}: CardStackProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorType, setIndicatorType] = useState<'like' | 'dislike' | 'save' | null>(null);
  const [hapticTriggered, setHapticTriggered] = useState(false);

  // Track position for indicator
  useEffect(() => {
    const listener = position.addListener(({ x, y }) => {
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      
      // Determine which direction is dominant
      if (absX > 50 || absY > 50) {
        setShowIndicator(true);
        
        if (absX > absY) {
          // Horizontal swipe
          setIndicatorType(x > 0 ? 'like' : 'dislike');
        } else if (y < 0) {
          // Only show indicator for swipe up (save)
          setIndicatorType('save');
        } else {
          // Swipe down has no indicator
          setShowIndicator(false);
          setIndicatorType(null);
        }
        
        // Trigger haptic feedback once when threshold is crossed
        if (!hapticTriggered && (absX > 50 || absY > 50)) {
          HapticPatterns.swipeThreshold();
          setHapticTriggered(true);
        }
      } else {
        setShowIndicator(false);
        setIndicatorType(null);
        setHapticTriggered(false);
      }
    });

    return () => {
      position.removeListener(listener);
    };
  }, [position, hapticTriggered]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        
        // Horizontal rotation
        rotation.setValue(gesture.dx / SCREEN_WIDTH);
        
        // Opacity based on distance
        const distance = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        const maxDistance = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;
        opacity.setValue(1 - Math.min(distance / maxDistance, 0.5));
        
        // Scale effect for vertical swipes
        if (Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          const scaleValue = 1 - Math.abs(gesture.dy) / (SCREEN_HEIGHT * 0.3);
          scale.setValue(Math.max(0.9, scaleValue));
        } else {
          scale.setValue(1);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);
        const isHorizontal = absX > absY;
        
        if (isHorizontal && absX > SWIPE_THRESHOLD) {
          // Horizontal swipe detected
          const direction = gesture.dx > 0 ? 'right' : 'left';
          
          HapticPatterns.swipeComplete();
          
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH, y: gesture.dy },
              duration: Duration.medium,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: Duration.medium,
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
            scale.setValue(1);
            setShowIndicator(false);
            setIndicatorType(null);
            setHapticTriggered(false);
          });
        } else if (!isHorizontal && absY > SWIPE_VERTICAL_THRESHOLD) {
          // Vertical swipe detected
          const direction = gesture.dy < 0 ? 'up' : 'down';
          
          HapticPatterns.swipeComplete();
          
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: gesture.dx, y: direction === 'up' ? -SCREEN_HEIGHT : SCREEN_HEIGHT },
              duration: Duration.medium,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: Duration.medium,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: Duration.medium,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (direction === 'up' && onSwipeUp) {
              onSwipeUp();
            } else if (direction === 'down' && onSwipeDown) {
              onSwipeDown();
            }
            // Reset position
            position.setValue({ x: 0, y: 0 });
            rotation.setValue(0);
            opacity.setValue(1);
            scale.setValue(1);
            setShowIndicator(false);
            setIndicatorType(null);
            setHapticTriggered(false);
          });
        } else {
          // Spring back to center
          HapticPatterns.buttonPress();
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
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowIndicator(false);
            setIndicatorType(null);
            setHapticTriggered(false);
          });
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
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {children}
      
      {/* Swipe indicators */}
      {showIndicator && (
        <View style={styles.indicators}>
          {indicatorType === 'like' && (
            <View style={[styles.indicator, styles.likeIndicator]}>
              <Ionicons name="heart" size={50} color={Colors.success} />
              <Animated.Text style={styles.indicatorText}>Like</Animated.Text>
            </View>
          )}
          {indicatorType === 'dislike' && (
            <View style={[styles.indicator, styles.dislikeIndicator]}>
              <Ionicons name="close-circle" size={50} color={Colors.secondaryRed} />
              <Animated.Text style={styles.indicatorText}>Dislike</Animated.Text>
            </View>
          )}
          {indicatorType === 'save' && (
            <View style={[styles.indicator, styles.saveIndicator]}>
              <Ionicons name="bookmark" size={50} color={Colors.primary} />
              <Animated.Text style={styles.indicatorText}>Save</Animated.Text>
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
    zIndex: 1000,
  },
  indicator: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Spacing.xs },
    shadowOpacity: 0.3,
    shadowRadius: Spacing.sm,
    elevation: 8,
  },
  indicatorText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  likeIndicator: {
    borderWidth: 4,
    borderColor: Colors.success,
  },
  dislikeIndicator: {
    borderWidth: 4,
    borderColor: Colors.secondaryRed,
  },
  saveIndicator: {
    borderWidth: 4,
    borderColor: Colors.primary,
  },
});

