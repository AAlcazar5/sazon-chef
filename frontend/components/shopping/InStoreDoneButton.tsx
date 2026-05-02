// frontend/components/shopping/InStoreDoneButton.tsx
// Group 10Q-ListMgmt: "I'm done shopping" button — shown only in in-store mode.
// On confirm, calls markListDone which archives the list and rolls un-purchased
// items into a new "Unfinished from <date>" list.

import { useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import BrandButton from '../ui/BrandButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { shoppingListApi } from '../../lib/api';

interface MarkListDoneResult {
  archivedListId: string;
  newActiveListId?: string;
  rolledOverItemCount: number;
}

interface InStoreDoneButtonProps {
  listId: string;
  inStoreMode: boolean;
  onListDone: (result: MarkListDoneResult) => void;
}

export default function InStoreDoneButton({
  listId,
  inStoreMode,
  onListDone,
}: InStoreDoneButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!inStoreMode) return null;

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await shoppingListApi.markListDone(listId);
      setShowConfirm(false);
      onListDone(result.data);
    } catch {
      // Silently fail — the list state won't change
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BrandButton
        label="I'm done shopping"
        onPress={() => setShowConfirm(true)}
        variant="sage"
        accessibilityLabel="I'm done shopping"
        hapticStyle="light"
      />

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
              Wrap up shopping?
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Any unfinished items will move to a new list so you can pick up where you left off.
            </Text>

            <View style={styles.actions}>
              <BrandButton
                label={loading ? 'Wrapping up...' : 'Yes, wrap up'}
                onPress={handleConfirm}
                variant="sage"
                disabled={loading}
                loading={loading}
                accessibilityLabel="Confirm done shopping"
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
    </>
  );
}

const styles = StyleSheet.create({
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
});
