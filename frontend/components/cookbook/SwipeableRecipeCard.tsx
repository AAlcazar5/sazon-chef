import React, { useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';

interface SwipeableRecipeCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onNotes?: () => void;
  onCollection?: () => void;
  disabled?: boolean;
}

export default function SwipeableRecipeCard({
  children,
  onEdit,
  onNotes,
  onCollection,
  disabled = false,
}: SwipeableRecipeCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const close = useCallback(() => swipeableRef.current?.close(), []);

  const renderRightActions = useCallback((
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    const actions = [
      onEdit && { label: 'Edit', icon: 'create-outline' as const, color: '#3B82F6', onPress: onEdit, a11y: 'Quick edit recipe' },
      onNotes && { label: 'Notes', icon: 'document-text-outline' as const, color: '#F59E0B', onPress: onNotes, a11y: 'Edit notes' },
      onCollection && { label: 'Move', icon: 'folder-outline' as const, color: '#8B5CF6', onPress: onCollection, a11y: 'Change collection' },
    ].filter(Boolean) as Array<{ label: string; icon: string; color: string; onPress: () => void; a11y: string }>;

    return (
      <View style={styles.rightActions}>
        {actions.map((action) => (
          <Animated.View
            key={action.label}
            style={[
              styles.actionButton,
              { backgroundColor: action.color },
              { transform: [{ scale }, { translateX }] },
            ]}
          >
            <HapticTouchableOpacity
              style={styles.actionButtonContent}
              onPress={() => { close(); action.onPress(); }}
              hapticStyle="medium"
              scaleOnPress={false}
              accessibilityLabel={action.a11y}
            >
              <Ionicons name={action.icon as any} size={20} color="white" />
              <Text style={styles.actionText}>{action.label}</Text>
            </HapticTouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  }, [onEdit, onNotes, onCollection, close]);

  if (disabled || (!onEdit && !onNotes && !onCollection)) {
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
  },
  actionButton: {
    width: 56,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
