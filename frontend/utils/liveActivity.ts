// frontend/utils/liveActivity.ts
// Bridge for Dynamic Island / Live Activity (iOS 16.1+)
// Provides a JS API to start, update, and end cooking timer Live Activities.
//
// NOTE: The native Swift widget extension must be added via EAS Build.
// In Expo Go, these functions are no-ops that log warnings.
// The actual ActivityKit calls happen in the native extension;
// this module communicates via expo-modules-core or NativeModules.

import { Platform } from 'react-native';

interface CookingTimerActivity {
  /** Recipe name displayed in Dynamic Island */
  recipeName: string;
  /** Current step number */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Timer end time (ISO string or unix timestamp) */
  timerEndTime?: string;
  /** Timer label (e.g., "Bake for 25 min") */
  timerLabel?: string;
}

/** Whether Live Activity is supported on this device */
export function isLiveActivitySupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  const version = parseInt(Platform.Version as string, 10);
  return version >= 16;
}

/**
 * Start a cooking timer Live Activity.
 * Shows the recipe name and timer in the Dynamic Island and Lock Screen.
 */
export async function startCookingActivity(activity: CookingTimerActivity): Promise<string | null> {
  if (!isLiveActivitySupported()) {
    console.log('[LiveActivity] Not supported on this platform/version');
    return null;
  }

  try {
    // Try to use the native module if available (post-prebuild)
    const NativeModule = getNativeModule();
    if (NativeModule) {
      return await NativeModule.startCookingActivity(activity);
    }
    console.log('[LiveActivity] Native module not available (Expo Go). Activity:', activity);
    return null;
  } catch (error) {
    console.warn('[LiveActivity] Failed to start:', error);
    return null;
  }
}

/**
 * Update an existing Live Activity (e.g., next step, new timer).
 */
export async function updateCookingActivity(
  activityId: string,
  update: Partial<CookingTimerActivity>
): Promise<void> {
  if (!isLiveActivitySupported()) return;

  try {
    const NativeModule = getNativeModule();
    if (NativeModule) {
      await NativeModule.updateCookingActivity(activityId, update);
    }
  } catch (error) {
    console.warn('[LiveActivity] Failed to update:', error);
  }
}

/**
 * End a Live Activity (cooking complete).
 */
export async function endCookingActivity(activityId: string): Promise<void> {
  if (!isLiveActivitySupported()) return;

  try {
    const NativeModule = getNativeModule();
    if (NativeModule) {
      await NativeModule.endCookingActivity(activityId);
    }
  } catch (error) {
    console.warn('[LiveActivity] Failed to end:', error);
  }
}

/** Try to get the native module, returns null if not available */
function getNativeModule(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules } = require('react-native');
    return NativeModules.SazonLiveActivity ?? null;
  } catch {
    return null;
  }
}
