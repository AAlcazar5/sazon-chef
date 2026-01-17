// Custom hook for standardized haptic feedback
// Provides easy access to haptic patterns with context-aware defaults

import { useCallback } from 'react';
import { HapticPatterns } from '../constants/Haptics';

/**
 * Hook for standardized haptic feedback across the app.
 * Provides convenient access to common haptic patterns with sensible defaults.
 *
 * @example
 * const { triggerPress, triggerSuccess, triggerError } = useHapticFeedback();
 *
 * // In button handler
 * const handleSubmit = () => {
 *   triggerPress();
 *   // do something
 * };
 *
 * // On success
 * const onSuccess = () => {
 *   triggerSuccess();
 *   // show success state
 * };
 */
export function useHapticFeedback() {
  // Button press feedback
  const triggerPress = useCallback(() => {
    HapticPatterns.buttonPress();
  }, []);

  const triggerPressPrimary = useCallback(() => {
    HapticPatterns.buttonPressPrimary();
  }, []);

  const triggerPressDestructive = useCallback(() => {
    HapticPatterns.buttonPressDestructive();
  }, []);

  // Selection feedback
  const triggerSelection = useCallback(() => {
    HapticPatterns.selection();
  }, []);

  const triggerToggle = useCallback(() => {
    HapticPatterns.toggle();
  }, []);

  // Notification feedback
  const triggerSuccess = useCallback(() => {
    HapticPatterns.success();
  }, []);

  const triggerError = useCallback(() => {
    HapticPatterns.error();
  }, []);

  const triggerWarning = useCallback(() => {
    HapticPatterns.warning();
  }, []);

  // Gesture feedback
  const triggerSwipeStart = useCallback(() => {
    HapticPatterns.swipeStart();
  }, []);

  const triggerSwipeThreshold = useCallback(() => {
    HapticPatterns.swipeThreshold();
  }, []);

  const triggerSwipeComplete = useCallback(() => {
    HapticPatterns.swipeComplete();
  }, []);

  const triggerLongPress = useCallback(() => {
    HapticPatterns.longPress();
  }, []);

  // Modal/UI feedback
  const triggerModalOpen = useCallback(() => {
    HapticPatterns.modalOpen();
  }, []);

  const triggerActionSheetOpen = useCallback(() => {
    HapticPatterns.actionSheetOpen();
  }, []);

  const triggerRefresh = useCallback(() => {
    HapticPatterns.refresh();
  }, []);

  const triggerTabChange = useCallback(() => {
    HapticPatterns.tabChange();
  }, []);

  // State change feedback
  const triggerSave = useCallback(() => {
    HapticPatterns.save();
  }, []);

  const triggerDelete = useCallback(() => {
    HapticPatterns.delete();
  }, []);

  const triggerLike = useCallback(() => {
    HapticPatterns.like();
  }, []);

  const triggerDislike = useCallback(() => {
    HapticPatterns.dislike();
  }, []);

  const triggerComplete = useCallback(() => {
    HapticPatterns.complete();
  }, []);

  return {
    // Button presses
    triggerPress,
    triggerPressPrimary,
    triggerPressDestructive,

    // Selections
    triggerSelection,
    triggerToggle,

    // Notifications
    triggerSuccess,
    triggerError,
    triggerWarning,

    // Gestures
    triggerSwipeStart,
    triggerSwipeThreshold,
    triggerSwipeComplete,
    triggerLongPress,

    // Modal/UI
    triggerModalOpen,
    triggerActionSheetOpen,
    triggerRefresh,
    triggerTabChange,

    // State changes
    triggerSave,
    triggerDelete,
    triggerLike,
    triggerDislike,
    triggerComplete,

    // Direct access to patterns object for advanced use cases
    patterns: HapticPatterns,
  };
}

export default useHapticFeedback;
