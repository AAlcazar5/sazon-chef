import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
import HapticTouchableOpacity from './HapticTouchableOpacity';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  deleteColor?: string;
  editColor?: string;
  disabled?: boolean;
}

export default function SwipeableItem({
  children,
  onDelete,
  onEdit,
  deleteColor = Colors.secondaryRed,
  editColor = '#3B82F6',
  disabled = false,
}: SwipeableItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActions}>
        {onEdit && (
          <Animated.View
            style={[
              styles.actionButton,
              { backgroundColor: editColor },
              {
                transform: [{ scale }, { translateX }],
              },
            ]}
          >
            <HapticTouchableOpacity
              style={styles.actionButtonContent}
              onPress={() => {
                swipeableRef.current?.close();
                onEdit();
              }}
              hapticStyle="medium"
              scaleOnPress={false}
              accessibilityLabel="Edit item"
              accessibilityHint="Double tap to edit this item"
            >
              <Ionicons name="create-outline" size={24} color="white" />
              <Text style={styles.actionText}>Edit</Text>
            </HapticTouchableOpacity>
          </Animated.View>
        )}
        {onDelete && (
          <Animated.View
            style={[
              styles.actionButton,
              { backgroundColor: deleteColor },
              {
                transform: [{ scale }, { translateX }],
              },
            ]}
          >
            <HapticTouchableOpacity
              style={styles.actionButtonContent}
              onPress={() => {
                swipeableRef.current?.close();
                onDelete();
              }}
              hapticStyle="heavy"
              scaleOnPress={false}
              accessibilityLabel="Delete item"
              accessibilityHint="Double tap to delete this item"
            >
              <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={styles.actionText}>Delete</Text>
            </HapticTouchableOpacity>
          </Animated.View>
        )}
      </View>
    );
  };

  if (disabled || (!onDelete && !onEdit)) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginVertical: Spacing.xs,
  },
  actionButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  actionButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    color: 'white',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
  },
});

