// frontend/components/shopping/StartFreshAction.tsx
// Group 10Q-ListMgmt: "Start fresh" header action.
// Clears all items from the active list. Shows a 5-second undo banner.
// Requires confirm sheet when list has >10 items.

import { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ConfirmActionSheet from '../ui/ConfirmActionSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { shoppingListApi } from '../../lib/api';
import { ShoppingListItem } from '../../types';

const UNDO_WINDOW_MS = 5_000;
const LARGE_LIST_THRESHOLD = 10;

interface StartFreshActionProps {
  listId: string;
  items: ShoppingListItem[];
  onItemsCleared: () => void;
}

export default function StartFreshAction({
  listId,
  items,
  onItemsCleared,
}: StartFreshActionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [loading, setLoading] = useState(false);

  const stashedItemsRef = useRef<ShoppingListItem[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUndoTimer = () => {
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const executeClean = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stashedItemsRef.current = [...items];
    setLoading(true);

    try {
      await shoppingListApi.clearItems(listId);
      setLoading(false);
      onItemsCleared();

      // Show undo banner for 5 seconds
      setShowUndo(true);
      clearUndoTimer();
      undoTimerRef.current = setTimeout(() => {
        setShowUndo(false);
        stashedItemsRef.current = [];
      }, UNDO_WINDOW_MS);
    } catch {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (items.length > LARGE_LIST_THRESHOLD) {
      setShowConfirm(true);
    } else {
      await executeClean();
    }
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await executeClean();
  };

  const handleUndo = async () => {
    clearUndoTimer();
    setShowUndo(false);

    const stashed = stashedItemsRef.current;
    stashedItemsRef.current = [];

    if (stashed.length > 0) {
      try {
        await shoppingListApi.bulkAddItems(
          listId,
          stashed.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            notes: item.notes,
          }))
        );
        onItemsCleared(); // Trigger refresh
      } catch {
        // Silently fail undo
      }
    }
  };

  return (
    <>
      {/* Header icon button */}
      <HapticTouchableOpacity
        onPress={handlePress}
        hapticStyle="light"
        accessibilityLabel="Start fresh"
        style={styles.iconButton}
      >
        <Icon
          name={Icons.TRASH_OUTLINE}
          size={IconSizes.MD}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          accessibilityLabel="Start fresh"
        />
      </HapticTouchableOpacity>

      {/* Confirm sheet for large lists */}
      <ConfirmActionSheet
        visible={showConfirm}
        title="Clear all items?"
        body={`You have ${items.length} items. You'll have 5 seconds to undo if you change your mind.`}
        confirmLabel="Yes, clear all"
        variant="peach"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        confirmAccessibilityLabel="Confirm clear all items"
      />

      {/* Undo banner */}
      {showUndo && (
        <View
          style={[
            styles.undoBanner,
            {
              backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
            },
            Shadows.MD,
          ]}
        >
          <Text style={[styles.undoText, { color: isDark ? '#D1FAE5' : '#064E3B' }]}>
            List cleared
          </Text>
          <HapticTouchableOpacity
            onPress={handleUndo}
            hapticStyle="light"
            accessibilityLabel="Undo clear"
          >
            <Text style={[styles.undoAction, { color: isDark ? '#6EE7B7' : '#059669' }]}>
              Undo
            </Text>
          </HapticTouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  undoBanner: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  undoText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  undoAction: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
