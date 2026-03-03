// frontend/hooks/usePushNotifications.ts
// Registers for push notifications when authenticated, handles notification responses.
// Uses lazy-loaded expo-notifications to avoid Expo Go warnings.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../lib/api';

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const responseListenerRef = useRef<any>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }

    // Don't re-register if we already did this session
    if (registeredRef.current) return;

    let Notifications: any = null;

    (async () => {
      try {
        // Skip remote push registration in Expo Go — it's not supported since SDK 53.
        // Push notifications will work in development builds and production.
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
          console.log('[PushNotifications] Skipping remote push in Expo Go (use dev build for push)');
          return;
        }

        // Lazy load expo-notifications (same pattern as notificationsService.ts)
        Notifications = await import('expo-notifications');

        if (!Notifications || typeof Notifications.getPermissionsAsync !== 'function') {
          console.warn('[PushNotifications] Module not available');
          return;
        }

        // Set notification handler for foreground display
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[PushNotifications] Permission not granted');
          return;
        }

        // Get push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const pushToken = tokenResult.data;

        // Register with backend
        await notificationsApi.registerToken(pushToken, Platform.OS);
        registeredRef.current = true;
        console.log('📬 [PushNotifications] Token registered');

        // Android: set notification channel
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance?.MAX ?? 4,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        // Listen for notification taps (deep linking)
        responseListenerRef.current =
          Notifications.addNotificationResponseReceivedListener(
            (response: any) => {
              const data = response?.notification?.request?.content?.data;
              if (data?.screen) {
                try {
                  router.push(data.screen as any);
                } catch (e) {
                  console.warn('[PushNotifications] Navigation error:', e);
                }
              }
            }
          );
      } catch (error) {
        console.warn('[PushNotifications] Registration failed:', error);
      }
    })();

    return () => {
      if (responseListenerRef.current && Notifications) {
        try {
          Notifications.removeNotificationSubscription(
            responseListenerRef.current
          );
        } catch {
          // Cleanup failure is non-critical
        }
        responseListenerRef.current = null;
      }
    };
  }, [isAuthenticated]);
}
