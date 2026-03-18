// frontend/hooks/useBiometricLock.ts
// Manages biometric lock state — prompts auth when app returns from background.

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@sazon_biometric_lock_enabled';

export function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  // Check hardware support + load preference
  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);

        const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        const enabled = stored === 'true';
        setBiometricEnabled(enabled);

        // If enabled, lock on first launch
        if (enabled && hasHardware && isEnrolled) {
          setIsLocked(true);
        }
      } catch {
        setBiometricAvailable(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prompt biometric authentication
  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Sazon',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Listen for app state changes — lock when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        biometricEnabled
      ) {
        setIsLocked(true);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [biometricEnabled]);

  // Auto-prompt when locked
  useEffect(() => {
    if (isLocked && biometricEnabled) {
      authenticate();
    }
  }, [isLocked, biometricEnabled, authenticate]);

  // Toggle preference
  const toggleBiometricLock = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Verify identity before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm your identity to enable biometric lock',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      if (!result.success) return false;
    }
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    setBiometricEnabled(enabled);
    if (!enabled) setIsLocked(false);
    return true;
  }, []);

  return {
    isLocked,
    biometricEnabled,
    biometricAvailable,
    loading,
    authenticate,
    toggleBiometricLock,
  };
}
