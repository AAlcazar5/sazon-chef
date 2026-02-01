// frontend/app/forgot-password.tsx
// Password reset screen with FormInput validation

import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import LogoMascot from '../components/mascot/LogoMascot';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import FormInput from '../components/ui/FormInput';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { Colors } from '../constants/Colors';
import { apiClient } from '../lib/api';

interface FormErrors {
  email?: string;
  code?: string;
  password?: string;
  form?: string;
}

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
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
  const [devResetCode, setDevResetCode] = useState<string>(''); // For development only
  const router = useRouter();
  const { theme } = useTheme();

  // Clear field error when user starts typing
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRequestReset = async () => {
    // Clear previous errors
    setErrors({});

    if (!email.trim()) {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      setErrors({ email: 'Email is required' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      setErrors({ email: 'Please enter a valid email address' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: email.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Store dev reset code if available
      if (response.data?.resetCode) {
        setDevResetCode(response.data.resetCode);
      }

      // Move to code verification step
      setStep('code');

      // Show success message
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
    // Clear previous errors
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

    // Move to password reset step
    setStep('reset');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetPassword = async () => {
    // Clear previous errors
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
        newPassword
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login')
          }
        ]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ form: error.message || 'Failed to reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      <KeyboardAvoidingContainer>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
        <View className="w-full max-w-md self-center">
          {/* Back button */}
          <HapticTouchableOpacity
            onPress={() => router.back()}
            className="mb-4"
            disabled={loading}
          >
            <View className="flex-row items-center">
              <Ionicons name="arrow-back" size={24} color={theme === 'dark' ? '#fff' : '#000'} />
              <Text className="ml-2 text-base text-gray-900 dark:text-gray-100">Back to Login</Text>
            </View>
          </HapticTouchableOpacity>

          <View className="items-center mb-4">
            <LogoMascot
              expression="happy"
              size="medium"
            />
          </View>

          <Text className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
            Reset Password
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
            {step === 'email'
              ? 'Enter your email address to receive a reset code'
              : step === 'code'
              ? 'Enter the 6-digit code sent to your email'
              : 'Create your new password'
            }
          </Text>

          <View className="w-full">
            {/* Form-level error */}
            {errors.form && (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex-row items-center">
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text className="text-red-600 dark:text-red-400 text-sm ml-2 flex-1">{errors.form}</Text>
              </View>
            )}

            {step === 'email' ? (
              <>
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

                <HapticTouchableOpacity
                  className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
                  onPress={handleRequestReset}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-semibold">Send Reset Code</Text>
                  )}
                </HapticTouchableOpacity>
              </>
            ) : step === 'code' ? (
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

                <HapticTouchableOpacity
                  className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-semibold">Verify Code</Text>
                  )}
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  className="mt-4"
                  onPress={() => { setStep('email'); setErrors({}); setResetCode(''); }}
                  disabled={loading}
                >
                  <Text className="text-center text-gray-600 dark:text-gray-200 text-sm">
                    Use different email
                  </Text>
                </HapticTouchableOpacity>
              </>
            ) : (
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

                <HapticTouchableOpacity
                  className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-semibold">Reset Password</Text>
                  )}
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  className="mt-4"
                  onPress={() => { setStep('code'); setErrors({}); setNewPassword(''); }}
                  disabled={loading}
                >
                  <Text className="text-center text-gray-600 dark:text-gray-200 text-sm">
                    Back to code verification
                  </Text>
                </HapticTouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
