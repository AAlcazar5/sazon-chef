// Haptic feedback constants for Sazon Chef app
// Standardized haptic patterns for consistent tactile feedback

import * as Haptics from 'expo-haptics';

/**
 * Impact feedback styles
 * Use these for button presses, taps, and UI interactions
 */
export const ImpactStyle = {
  /** Light impact - subtle feedback for minor interactions */
  light: Haptics.ImpactFeedbackStyle.Light,
  /** Medium impact - standard button press feedback */
  medium: Haptics.ImpactFeedbackStyle.Medium,
  /** Heavy impact - strong feedback for significant actions */
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

/**
 * Notification feedback types
 * Use these for system notifications and state changes
 */
export const NotificationType = {
  /** Success - positive outcome (save, complete, like) */
  success: Haptics.NotificationFeedbackType.Success,
  /** Warning - caution needed (delete confirmation, warnings) */
  warning: Haptics.NotificationFeedbackType.Warning,
  /** Error - negative outcome (failed action, validation error) */
  error: Haptics.NotificationFeedbackType.Error,
} as const;

/**
 * Helper function to safely execute haptic feedback with error handling
 * Silently fails if haptics are not available on the device
 */
const safeHaptic = async (hapticFn: () => Promise<void>) => {
  try {
    await hapticFn();
  } catch (error) {
    // Silently fail - haptics may not be available on all devices or simulators
    if (__DEV__) {
      console.debug('Haptic feedback not available:', error);
    }
  }
};

/**
 * Haptic feedback patterns for common UI interactions
 * These are semantic mappings to help developers choose the right feedback
 * All patterns include error handling and will fail silently if haptics are unavailable
 */
export const HapticPatterns = {
  // Button interactions
  /** Standard button press */
  buttonPress: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Primary/CTA button press */
  buttonPressPrimary: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Destructive button press */
  buttonPressDestructive: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.heavy)),

  // Selection interactions
  /** Single item selection (checkbox, radio) */
  selection: () => safeHaptic(() => Haptics.selectionAsync()),
  /** Toggle switch */
  toggle: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Tab switch */
  tabSwitch: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),

  // Gesture interactions
  /** Swipe action started */
  swipeStart: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Swipe threshold reached */
  swipeThreshold: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Swipe action completed */
  swipeComplete: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Long press detected */
  longPress: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.heavy)),
  /** Pull to refresh triggered */
  pullToRefresh: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),

  // Feedback interactions
  /** Like/favorite action */
  like: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Dislike action */
  dislike: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Save/bookmark action */
  save: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),

  // State change notifications
  /** Success state (save complete, action succeeded) */
  success: () => safeHaptic(() => Haptics.notificationAsync(NotificationType.success)),
  /** Warning state (confirmation needed) */
  warning: () => safeHaptic(() => Haptics.notificationAsync(NotificationType.warning)),
  /** Error state (action failed, validation error) */
  error: () => safeHaptic(() => Haptics.notificationAsync(NotificationType.error)),

  // Modal/sheet interactions
  /** Modal opened */
  modalOpen: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Modal closed */
  modalClose: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Action sheet opened */
  actionSheetOpen: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),

  // List interactions
  /** Item deleted from list */
  itemDelete: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Item added to list */
  itemAdd: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Item reordered */
  itemReorder: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),

  // Navigation
  /** Navigate forward */
  navigateForward: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Navigate back */
  navigateBack: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),

  // Form interactions
  /** Form submitted */
  formSubmit: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Form validation error */
  formError: () => safeHaptic(() => Haptics.notificationAsync(NotificationType.error)),

  // Special interactions
  /** Recipe card flip/expand */
  cardFlip: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Roulette spin */
  rouletteSpin: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Random recipe generated */
  randomGenerate: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.heavy)),

  // Additional UI interactions
  /** Refresh action (pull-to-refresh, manual refresh) */
  refresh: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Tab navigation change */
  tabChange: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.light)),
  /** Delete action */
  delete: () => safeHaptic(() => Haptics.impactAsync(ImpactStyle.medium)),
  /** Task/action completed */
  complete: () => safeHaptic(() => Haptics.notificationAsync(NotificationType.success)),
} as const;

/**
 * Helper function to trigger haptic feedback with error handling
 * Useful when you need custom haptic patterns
 */
export const triggerHaptic = async (
  type: 'impact' | 'notification' | 'selection',
  style?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType
) => {
  try {
    switch (type) {
      case 'impact':
        await Haptics.impactAsync(style as Haptics.ImpactFeedbackStyle ?? ImpactStyle.medium);
        break;
      case 'notification':
        await Haptics.notificationAsync(style as Haptics.NotificationFeedbackType ?? NotificationType.success);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (error) {
    // Silently fail - haptics may not be available on all devices
    console.debug('Haptic feedback not available:', error);
  }
};

// Type exports
export type ImpactStyleKey = keyof typeof ImpactStyle;
export type NotificationTypeKey = keyof typeof NotificationType;
export type HapticPatternKey = keyof typeof HapticPatterns;
