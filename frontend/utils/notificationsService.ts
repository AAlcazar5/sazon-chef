/**
 * Notifications Service
 * Handles expo-notifications with graceful fallback for Expo Go compatibility
 * Local notifications work in Expo Go, but remote/push notifications don't
 * Uses lazy loading to prevent the warning from appearing on app startup
 * Note: LogBox suppression is handled in app/_layout.tsx
 */

let Notifications: any = null;
let isNotificationsAvailable = false;
let isLoading = false;
let loadPromise: Promise<boolean> | null = null;

/**
 * Lazy load the notifications module only when needed
 * This prevents the Expo Go warning from appearing on app startup
 */
async function loadNotificationsModule(): Promise<boolean> {
  if (Notifications !== null) {
    return isNotificationsAvailable;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Dynamic import to lazy load the module
      // The LogBox.ignoreLogs above will suppress the warning
      Notifications = await import('expo-notifications');

      // Verify the module has the functions we need
      if (Notifications && 
          typeof Notifications.getPermissionsAsync === 'function' &&
          typeof Notifications.scheduleNotificationAsync === 'function') {
        isNotificationsAvailable = true;
        return true;
      } else {
        console.warn('⚠️  Notifications module loaded but missing required functions');
        isNotificationsAvailable = false;
        return false;
      }
    } catch (error) {
      // Module failed to load entirely
      console.warn('⚠️  Notifications module not available:', error);
      isNotificationsAvailable = false;
      return false;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Check if notifications are available
 * Note: This will trigger lazy loading if not already loaded
 */
export async function isNotificationsSupported(): Promise<boolean> {
  if (Notifications === null) {
    await loadNotificationsModule();
  }
  return isNotificationsAvailable && Notifications !== null;
}

/**
 * Get notification permissions
 */
export async function getNotificationPermissions(): Promise<{ status: string } | null> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return null;
  }

  try {
    return await Notifications.getPermissionsAsync();
  } catch (error) {
    console.warn('⚠️  Error getting notification permissions:', error);
    return null;
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<{ status: string } | null> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return null;
  }

  try {
    return await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.warn('⚠️  Error requesting notification permissions:', error);
    return null;
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<any[]> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return [];
  }

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('⚠️  Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Schedule a notification
 */
export async function scheduleNotification(notification: any): Promise<string | null> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync(notification);
  } catch (error) {
    console.warn('⚠️  Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('⚠️  Error cancelling notification:', error);
  }
}

/**
 * Set notification handler
 */
export async function setNotificationHandler(handler: any): Promise<void> {
  const supported = await isNotificationsSupported();
  if (!supported) {
    return;
  }

  try {
    Notifications.setNotificationHandler(handler);
  } catch (error) {
    console.warn('⚠️  Error setting notification handler:', error);
  }
}

/**
 * Export notification types for TypeScript
 */
export type DailyTriggerInput = {
  type: 'daily';
  hour: number;
  minute: number;
  repeats: boolean;
};

export type DateTriggerInput = {
  type: 'date';
  date: Date;
  repeats: boolean;
};
