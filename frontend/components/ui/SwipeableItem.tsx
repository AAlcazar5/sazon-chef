import React, { useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

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
  deleteColor = '#EF4444',
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
            <TouchableOpacity
              style={styles.actionButtonContent}
              onPress={() => {
                swipeableRef.current?.close();
                onEdit();
              }}
            >
              <Ionicons name="create-outline" size={24} color="white" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.actionButtonContent}
              onPress={() => {
                swipeableRef.current?.close();
                onDelete();
              }}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
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
    marginVertical: 4,
  },
  actionButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderRadius: 8,
  },
  actionButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

