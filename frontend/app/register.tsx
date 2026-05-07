// frontend/app/register.tsx
// ROADMAP 4.0 A7.2 — Signup screen visual redesign.
// Scaffold extracted to <AuthScreenShell> per A7.3. This file owns the
// signup-specific form body + actions row + social row + footer link.

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AuthScreenShell from '../components/auth/AuthScreenShell';
import FrostedCard from '../components/ui/FrostedCard';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import FormInput from '../components/ui/FormInput';
import { Colors, DarkColors } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { FontSize } from '../constants/Typography';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessMascot, setShowSuccessMascot] = useState(false);
  const { register, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return isValid;
  };

  const handleRegister = async () => {
    setErrors(prev => ({ ...prev, form: undefined }));

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessMascot(true);
      setTimeout(() => {
        setShowSuccessMascot(false);
        router.replace('/(tabs)');
      }, 300);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors(prev => ({ ...prev, form: error.message || 'Something went wrong — give it another shot?' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const authenticator = provider === 'google' ? authenticateWithGoogle : authenticateWithApple;
      const result = await authenticator();

      if (result) {
        await socialLogin(
          result.provider,
          result.providerId,
          result.email,
          result.name,
          result.idToken,
          result.accessToken
        );
        router.replace('/(tabs)');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors(prev => ({
          ...prev,
          form: `${provider === 'google' ? 'Google' : 'Apple'} sign-in isn't configured yet — try email for now.`,
        }));
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors(prev => ({
        ...prev,
        form: error.message || `Something went wrong with ${provider === 'google' ? 'Google' : 'Apple'} sign-in.`,
      }));
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <AuthScreenShell
      headline="Let's set up your kitchen"
      subhead="Sign up to get started"
      formError={errors.form}
      successFlash={
        showSuccessMascot
          ? { motion: 'bounce', fx: ['sparkles'] }
          : undefined
      }
    >
      {/* Form fields — grouped in FrostedCard */}
              <MotiView
                from={{ opacity: 0, translateY: 18 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 100, damping: 20, stiffness: 180 }}
              >
                <FrostedCard style={{ padding: 16, marginBottom: 14 }}>
                  <View style={{ gap: 4 }}>
                    <FormInput
                      label="Name"
                      placeholder="Enter your name"
                      value={name}
                      onChangeText={(value) => { setName(value); clearError('name'); }}
                      error={errors.name}
                      autoCapitalize="words"
                      autoComplete="name"
                      disabled={loading}
                      leftIcon="person-outline"
                      required
                    />

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
                  </View>
                </FrostedCard>
              </MotiView>

              {/* Password fields — separate FrostedCard */}
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 180, damping: 20, stiffness: 180 }}
              >
                <FrostedCard style={{ padding: 16, marginBottom: 14 }}>
                  <View style={{ gap: 4 }}>
                    <FormInput
                      label="Password"
                      placeholder="Enter your password (min 8 characters)"
                      value={password}
                      onChangeText={(value) => { setPassword(value); clearError('password'); }}
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

                    <FormInput
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={(value) => { setConfirmPassword(value); clearError('confirmPassword'); }}
                      error={errors.confirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      disabled={loading}
                      leftIcon="lock-closed-outline"
                      rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      required
                    />
                  </View>
                </FrostedCard>
              </MotiView>

              {/* Sign up button */}
              <MotiView
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 260, damping: 20, stiffness: 180 }}
              >
                <GradientButton
                  label="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  colors={GradientPresets.fresh}
                  icon="person-add-outline"
                  style={{ minHeight: 50 }}
                />
              </MotiView>

              {/* Divider + social buttons on white cards */}
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 340, damping: 20, stiffness: 180 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#374151' : '#D1D5DB' }} />
                  <Text style={{ marginHorizontal: 16, color: isDark ? '#9CA3AF' : '#6B7280', fontSize: FontSize.sm }}>
                    OR
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#374151' : '#D1D5DB' }} />
                </View>

                <View style={{ gap: 12 }}>
                  <HapticTouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      minHeight: 50,
                      ...(Shadows.SM as any),
                    }}
                    onPress={() => handleSocialLogin('google')}
                    disabled={loading || socialLoading !== null}
                    accessibilityLabel="Continue with Google"
                  >
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                    <Text style={{
                      marginLeft: 10,
                      fontSize: FontSize.md,
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      color: isDark ? DarkColors.text.primary : Colors.text.primary,
                    }}>
                      Continue with Google
                    </Text>
                  </HapticTouchableOpacity>

                  <HapticTouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      minHeight: 50,
                      ...(Shadows.SM as any),
                    }}
                    onPress={() => handleSocialLogin('apple')}
                    disabled={loading || socialLoading !== null}
                    accessibilityLabel="Continue with Apple"
                  >
                    <Ionicons name="logo-apple" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
                    <Text style={{
                      marginLeft: 10,
                      fontSize: FontSize.md,
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      color: isDark ? DarkColors.text.primary : Colors.text.primary,
                    }}>
                      Continue with Apple
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </MotiView>

              {/* Sign in link */}
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', delay: 440, duration: 400 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                  <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: FontSize.sm }}>
                    Already have an account?{' '}
                  </Text>
                  <HapticTouchableOpacity
                    onPress={() => router.push('/login')}
                    disabled={loading}
                  >
                    <Text style={{
                      color: isDark ? '#F87171' : Colors.primary,
                      fontSize: FontSize.sm,
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                    }}>
                      Sign In
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </MotiView>
    </AuthScreenShell>
  );
}
