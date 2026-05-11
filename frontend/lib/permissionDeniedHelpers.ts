// frontend/lib/permissionDeniedHelpers.ts
// ROADMAP 4.0 U11 — Sazon-voiced "denied" recovery for OS permission flows.
//
// S2.2 shipped the voice permission flow with copy + Linking.openSettings()
// recovery. U11 brings parity to camera, photos, notifications, HealthKit.
// Every `*PermissionsAsync` call should be paired with `showPermissionDenied`
// when the user denies — otherwise the feature just silently fails.

import { Alert, Linking } from 'react-native';

export type PermissionKind =
  | 'camera'
  | 'photos'
  | 'mic'
  | 'notifications'
  | 'health'
  | 'location';

interface CopySet {
  title: string;
  message: string;
}

const COPY: Record<PermissionKind, CopySet> = {
  camera: {
    title: "Sazon can't see yet",
    message:
      "Camera's off — flip it on in Settings so we can scan ingredients and read labels.",
  },
  photos: {
    title: 'Need a photo to work with',
    message:
      "Photos access is off — turn it on in Settings and pick a shot for Sazon to look at.",
  },
  mic: {
    title: "Can't hear you yet",
    message:
      "Mic permission is off — flip it on in Settings and we're back in business.",
  },
  notifications: {
    title: 'No pings, no nudges',
    message:
      "Notifications are off — turn them on in Settings so Sazon can ping you when ingredients are about to go.",
  },
  health: {
    title: 'Health stays out of the loop',
    message:
      "Health access is off — flip it on in Settings if you'd like Sazon to tune today's plate to how you're moving.",
  },
  location: {
    title: 'No location, no nearby stores',
    message:
      "Location is off — turn it on in Settings so Sazon can suggest where to shop.",
  },
};

/**
 * Show the Sazon-voiced "permission denied" alert. Two-button choice:
 * dismiss or `Linking.openSettings()` to the OS settings page for this app.
 */
export function showPermissionDenied(kind: PermissionKind): void {
  const copy = COPY[kind];
  Alert.alert(copy.title, copy.message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        Linking.openSettings().catch(() => {});
      },
    },
  ]);
}
