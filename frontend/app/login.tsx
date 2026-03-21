// frontend/app/login.tsx
// Login screen with FormInput validation

import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import LogoMascot from '../components/mascot/LogoMascot';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import FormInput from '../components/ui/FormInput';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { Colors, DarkColors } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  // Inline validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const { login, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Clear field error when user starts typing
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
        setShakeEmail(true);
        setTimeout(() => setShakeEmail(false), 500);
        isValid = false;
      }
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return isValid;
  };

  const handleLogin = async () => {
    // Clear previous form error
    setErrors(prev => ({ ...prev, form: undefined }));

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const raw = (error.message || '').toLowerCase();
      const friendlyMessage =
        raw.includes('invalid') || raw.includes('credential') || raw.includes('password') || raw.includes('incorrect') || raw.includes('not found') || raw.includes('unauthorized')
          ? "That email or password doesn't match — please try again."
          : error.message || 'Something went wrong. Please try again.';
      setErrors(prev => ({ ...prev, form: friendlyMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      // Try to authenticate with Google
      const result = await authenticateWithGoogle();
      
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
        // For development/testing, use mock auth
        // In production, this would be handled by the OAuth flow
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Google Sign-In',
          'For development, please use email/password login or configure Google OAuth credentials.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Google Sign-In Failed', error.message || 'An error occurred during Google sign-in');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    try {
      const result = await authenticateWithApple();
      
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
        Alert.alert(
          'Apple Sign-In',
          'For development, please use email/password login or configure Apple Sign-In credentials.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Apple Sign-In Failed', error.message || 'An error occurred during Apple sign-in');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      {/* Animated gradient accent */}
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.65 }}
        transition={{ type: 'timing', duration: 3000, loop: true, repeatReverse: true }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
        pointerEvents="none"
      >
        <LinearGradient
          testID="gradient-background"
          colors={isDark
            ? ['rgba(239,68,68,0.18)', 'rgba(249,115,22,0.08)', 'transparent']
            : ['rgba(239,68,68,0.10)', 'rgba(249,115,22,0.04)', 'transparent']}
          style={{ flex: 1 }}
        />
      </MotiView>

      <KeyboardAvoidingContainer>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
        <View className="w-full max-w-md self-center">
          {/* Logo — enters first */}
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 0, damping: 20, stiffness: 180 }}
          >
            <View className="items-center mb-4" testID="login-mascot">
              <LogoMascot expression="happy" size="medium" />
            </View>
          </MotiView>

          {/* Title + subtitle */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 80, damping: 20, stiffness: 180 }}
          >
            <Text className="text-3xl font-black text-red-600 dark:text-red-400 mb-2 text-center">
              Welcome Back
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
              Sign in to continue
            </Text>
          </MotiView>

          <View className="w-full">
            {/* Form-level error */}
            {errors.form && (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex-row items-center">
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text className="text-red-600 dark:text-red-400 text-sm ml-2 flex-1">{errors.form}</Text>
              </View>
            )}

            {/* Form fields — grouped card */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 160, damping: 20, stiffness: 180 }}
            >
              <View
                className="rounded-2xl p-4 mb-2"
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#FAFAFA',
                  ...Shadows.SM,
                }}
              >
                <ShakeAnimation shake={shakeEmail}>
                  <FormInput
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={handleEmailChange}
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    disabled={loading}
                    leftIcon="mail-outline"
                  />
                </ShakeAnimation>

                <ShakeAnimation shake={shakePassword}>
                  <FormInput
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    error={errors.password}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    disabled={loading}
                    leftIcon="lock-closed-outline"
                    rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />
                </ShakeAnimation>
              </View>
            </MotiView>

            {/* Forgot password + login button */}
            <MotiView
              from={{ opacity: 0, translateY: 14 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 240, damping: 20, stiffness: 180 }}
            >
              <View className="flex-row justify-end mb-4">
                <HapticTouchableOpacity
                  onPress={() => router.push('/forgot-password')}
                  disabled={loading}
                >
                  <Text className="text-red-600 dark:text-red-400 text-sm font-semibold">Forgot Password?</Text>
                </HapticTouchableOpacity>
              </View>

              <GradientButton
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                colors={GradientPresets.brand}
                icon="log-in-outline"
                style={{ minHeight: 50 }}
              />
            </MotiView>

            {/* Divider + social buttons */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 320, damping: 20, stiffness: 180 }}
            >
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <Text className="mx-4 text-gray-600 dark:text-gray-200 text-sm">OR</Text>
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </View>

              <View style={{ gap: 12 }}>
                <GradientButton
                  label="Continue with Google"
                  onPress={handleGoogleLogin}
                  loading={socialLoading === 'google'}
                  disabled={loading || socialLoading !== null}
                  icon="logo-google"
                  colors={['#4285F4', '#1A73E8']}
                  style={{ minHeight: 50, ...Shadows.SM }}
                />

                {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <GradientButton
                    label="Continue with Apple"
                    onPress={handleAppleLogin}
                    loading={socialLoading === 'apple'}
                    disabled={loading || socialLoading !== null}
                    icon="logo-apple"
                    colors={['#1c1c1e', '#374151']}
                    style={{ minHeight: 50, ...Shadows.SM }}
                  />
                )}
              </View>
            </MotiView>

            {/* Sign up link */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', delay: 420, duration: 400 }}
            >
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600 dark:text-gray-200 text-sm">Don't have an account? </Text>
                <HapticTouchableOpacity
                  onPress={() => router.push('/register')}
                  disabled={loading}
                >
                  <Text className="text-red-600 dark:text-red-400 text-sm font-semibold">Sign Up</Text>
                </HapticTouchableOpacity>
              </View>
            </MotiView>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
