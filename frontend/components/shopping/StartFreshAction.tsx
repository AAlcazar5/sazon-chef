// frontend/components/shopping/StartFreshAction.tsx
// Group 10Q-ListMgmt: "Start fresh" header action.
// Clears all items from the active list. Shows a 5-second undo banner.
// Requires confirm sheet when list has >10 items.

import { useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
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
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: isDark ? DarkColors.card : '#FAF7F4' },
              Shadows.LG,
            ]}
          >
            <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Clear all items?
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              You have {items.length} items. You'll have 5 seconds to undo if you change your mind.
            </Text>

            <View style={styles.actions}>
              <BrandButton
                label="Yes, clear all"
                onPress={handleConfirm}
                variant="peach"
                disabled={loading}
                loading={loading}
                accessibilityLabel="Confirm clear all items"
              />
              <HapticTouchableOpacity
                onPress={() => setShowConfirm(false)}
                style={styles.cancelButton}
                hapticStyle="light"
              >
                <Text style={[styles.cancelText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Cancel
                </Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
