// frontend/app/forgot-password.tsx
// Password reset — 3 steps (email → code → new password).
// Chrome from <AuthScreenShell> so the gradient + mascot card + Fraunces
// headline match login/register. CTA via canonical <BrandButton>.

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AuthScreenShell from '../components/auth/AuthScreenShell';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import FormInput from '../components/ui/FormInput';
import FrostedCard from '../components/ui/FrostedCard';
import { Brand, Ink } from '../constants/tokens';
import { FontSize } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';
import { apiClient } from '../lib/api';

interface FormErrors {
  email?: string;
  code?: string;
  password?: string;
  form?: string;
}

type Step = 'email' | 'code' | 'reset';

const SUBHEAD: Record<Step, string> = {
  email: 'Enter your email and we\'ll send you a code',
  code: 'Enter the 6-digit code we just sent',
  reset: 'Pick a new password (at least 8 characters)',
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakeCode, setShakeCode] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<Step>('email');
  const [devResetCode, setDevResetCode] = useState<string>('');
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const linkColor = isDark ? Brand.dark.base : Brand.light.base;
  const mutedColor = isDark ? Ink.dark.secondary : Ink.light.secondary;

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRequestReset = async () => {
    setErrors({});

    if (!email.trim()) {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      setErrors({ email: 'Email is required' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      setErrors({ email: "That doesn't look like an email." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: email.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (response.data?.resetCode) {
        setDevResetCode(response.data.resetCode);
      }

      setStep('code');

      Alert.alert(
        'Code Sent',
        __DEV__ && response.data?.resetCode
          ? `For development: Your reset code is ${response.data.resetCode}`
          : 'A 6-digit reset code has been sent to your email. Please check your inbox.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ form: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setErrors({});

    if (!resetCode.trim()) {
      setShakeCode(true);
      setTimeout(() => setShakeCode(false), 500);
      setErrors({ code: 'Reset code is required' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (resetCode.trim().length !== 6) {
      setShakeCode(true);
      setTimeout(() => setShakeCode(false), 500);
      setErrors({ code: 'Reset code must be 6 digits' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setStep('reset');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetPassword = async () => {
    setErrors({});

    if (!newPassword.trim()) {
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      setErrors({ password: 'New password is required' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword.length < 8) {
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      setErrors({ password: 'Password must be at least 8 characters' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        resetCode: resetCode.trim(),
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'New password set',
        'You can sign back in with it now.',
        [{ text: 'Sign in', onPress: () => router.replace('/login') }],
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ form: error.message || 'Couldn\'t reset your password — try again?' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      headline="Reset password"
      subhead={SUBHEAD[step]}
      mascot={{
        variant: errors.form ? 'red' : 'orange',
        motion: errors.form ? 'wobble' : 'idle',
        fx: errors.form ? ['question'] : [],
      }}
      formError={errors.form}
    >
      {/* Back to login link, top of body */}
      <HapticTouchableOpacity
        onPress={() => router.back()}
        disabled={loading}
        accessibilityRole="link"
        accessibilityLabel="Back to login"
        style={{ marginBottom: Spacing.md, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}
      >
        <Ionicons name="arrow-back" size={18} color={linkColor} />
        <Text style={{
          marginLeft: 6,
          color: linkColor,
          fontSize: FontSize.sm,
          fontFamily: 'PlusJakartaSans_600SemiBold',
        }}>
          Back to login
        </Text>
      </HapticTouchableOpacity>

      <FrostedCard style={{ padding: Spacing.lg, marginBottom: Spacing.md + 2 }}>
        <View style={{ gap: 4 }}>
          {step === 'email' && (
            <ShakeAnimation shake={shakeEmail}>
              <FormInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={(value) => { setEmail(value); clearError('email'); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                disabled={loading}
                leftIcon="mail-outline"
                required
              />
            </ShakeAnimation>
          )}

          {step === 'code' && (
            <>
              <FormInput
                label="Email"
                value={email}
                disabled
                leftIcon="mail-outline"
              />
              <ShakeAnimation shake={shakeCode}>
                <FormInput
                  label="Reset Code"
                  placeholder="Enter 6-digit code"
                  value={resetCode}
                  onChangeText={(value) => { setResetCode(value); clearError('code'); }}
                  error={errors.code}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                  leftIcon="key-outline"
                  hint={__DEV__ && devResetCode ? `Dev code: ${devResetCode}` : 'Check your email for the code'}
                  required
                />
              </ShakeAnimation>
            </>
          )}

          {step === 'reset' && (
            <>
              <FormInput
                label="Email"
                value={email}
                disabled
                leftIcon="mail-outline"
              />
              <ShakeAnimation shake={shakePassword}>
                <FormInput
                  label="New Password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChangeText={(value) => { setNewPassword(value); clearError('password'); }}
                  error={errors.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  disabled={loading}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  hint="Must be at least 8 characters"
                  required
                />
              </ShakeAnimation>
            </>
          )}
        </View>
      </FrostedCard>

      {step === 'email' && (
        <BrandButton
          label="Send Reset Code"
          onPress={handleRequestReset}
          loading={loading}
          disabled={loading}
          variant="brand"
          icon="mail-outline"
        />
      )}

      {step === 'code' && (
        <>
          <BrandButton
            label="Verify Code"
            onPress={handleVerifyCode}
            loading={loading}
            disabled={loading}
            variant="brand"
            icon="key-outline"
          />
          <HapticTouchableOpacity
            onPress={() => { setStep('email'); setErrors({}); setResetCode(''); }}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Use different email"
            style={{ marginTop: Spacing.lg }}
          >
            <Text style={{ textAlign: 'center', color: mutedColor, fontSize: FontSize.sm }}>
              Use different email
            </Text>
          </HapticTouchableOpacity>
        </>
      )}

      {step === 'reset' && (
        <>
          <BrandButton
            label="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            variant="brand"
            icon="lock-closed-outline"
          />
          <HapticTouchableOpacity
            onPress={() => { setStep('code'); setErrors({}); setNewPassword(''); }}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Back to code verification"
            style={{ marginTop: Spacing.lg }}
          >
            <Text style={{ textAlign: 'center', color: mutedColor, fontSize: FontSize.sm }}>
              Back to code verification
            </Text>
          </HapticTouchableOpacity>
        </>
      )}
    </AuthScreenShell>
  );
}
