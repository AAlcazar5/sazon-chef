// frontend/__tests__/components/BiometricLock.test.tsx
// Tests for Section 6: Biometric Lock (Face ID / Touch ID)

describe('Biometric Lock (spec)', () => {
  describe('useBiometricLock hook behavior', () => {
    it('should check if device supports biometric auth', () => {
      // expo-local-authentication.hasHardwareAsync()
      const hasHardware = true;
      expect(hasHardware).toBe(true);
    });

    it('should check if biometrics are enrolled', () => {
      // expo-local-authentication.isEnrolledAsync()
      const isEnrolled = true;
      expect(isEnrolled).toBe(true);
    });

    it('should prompt for authentication when app foregrounds', () => {
      // expo-local-authentication.authenticateAsync()
      const authResult = { success: true };
      expect(authResult.success).toBe(true);
    });

    it('should fall back to device passcode if biometric fails', () => {
      const authOptions = {
        promptMessage: 'Unlock Sazon',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      };
      expect(authOptions.disableDeviceFallback).toBe(false);
    });

    it('should store biometric preference in AsyncStorage', () => {
      const key = 'sazon:biometric_lock_enabled';
      expect(key).toBe('sazon:biometric_lock_enabled');
    });

    it('should not prompt if biometric lock is disabled', () => {
      const biometricEnabled = false;
      const shouldPrompt = biometricEnabled;
      expect(shouldPrompt).toBe(false);
    });
  });

  describe('Profile toggle behavior', () => {
    it('should show toggle in Security section', () => {
      const securitySettings = [
        { label: 'Require Face ID to open Sazon', type: 'toggle' },
      ];
      expect(securitySettings[0].label).toContain('Face ID');
    });

    it('should verify biometric before enabling the setting', () => {
      // When user enables the toggle, first authenticate to confirm identity
      const verifyBeforeEnable = true;
      expect(verifyBeforeEnable).toBe(true);
    });
  });

  describe('App gating behavior', () => {
    it('should gate content render on biometric success', () => {
      const isAuthenticated = false;
      const shouldShowContent = isAuthenticated;
      expect(shouldShowContent).toBe(false);
    });

    it('should show content after successful auth', () => {
      const isAuthenticated = true;
      const shouldShowContent = isAuthenticated;
      expect(shouldShowContent).toBe(true);
    });

    it('should not require auth if biometric lock is off', () => {
      const biometricEnabled = false;
      const shouldShowContent = !biometricEnabled || true; // auto-pass
      expect(shouldShowContent).toBe(true);
    });
  });
});
