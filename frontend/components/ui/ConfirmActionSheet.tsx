// frontend/components/ui/ConfirmActionSheet.tsx
// K16: shared bottom-sheet confirmation modal — title + body + accent
// confirm button + Cancel. Used by InStoreDoneButton ("Wrap up shopping?")
// and StartFreshAction ("Clear all items?"); both inlined the same Modal +
// overlay + sheet + actions block with only copy/variant differences.

import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import BrandButton from './BrandButton';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

export type ConfirmActionVariant = 'sage' | 'peach' | 'lavender' | 'brand' | 'golden' | 'sky' | 'blush';

export interface ConfirmActionSheetProps {
  visible: boolean;
  title: string;
  body: string;
  /** Confirm button label. Falls back to a working-state label when `loading`. */
  confirmLabel: string;
  /** Optional working-state label (defaults to "${confirmLabel.replace('Yes, ', 'Working...')}"). */
  loadingLabel?: string;
  /** BrandButton variant for the confirm CTA. */
  variant?: ConfirmActionVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional override for the cancel button label. */
  cancelLabel?: string;
  /** Optional a11y override; defaults to confirmLabel. */
  confirmAccessibilityLabel?: string;
}

export default function ConfirmActionSheet({
  visible,
  title,
  body,
  confirmLabel,
  loadingLabel,
  variant = 'brand',
  loading = false,
  onConfirm,
  onCancel,
  cancelLabel = 'Cancel',
  confirmAccessibilityLabel,
}: ConfirmActionSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {body}
          </Text>

          <View style={styles.actions}>
            <BrandButton
              label={loading && loadingLabel ? loadingLabel : confirmLabel}
              onPress={onConfirm}
              variant={variant}
              disabled={loading}
              loading={loading}
              accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
            />
            <HapticTouchableOpacity
              onPress={onCancel}
              style={styles.cancelButton}
              hapticStyle="light"
              accessibilityLabel={cancelLabel}
            >
              <Text style={[styles.cancelText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {cancelLabel}
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
