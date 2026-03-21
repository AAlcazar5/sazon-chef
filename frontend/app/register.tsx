// frontend/app/register.tsx
// Registration screen with FormInput validation

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import FormInput from '../components/ui/FormInput';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import LogoMascot from '../components/mascot/LogoMascot';
import { Colors, DarkColors } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

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

  // Clear field error when user starts typing
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    // Email validation
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

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // Confirm password validation
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
    // Clear previous form error
    setErrors(prev => ({ ...prev, form: undefined }));

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessMascot(true);
      setTimeout(() => {
        setShowSuccessMascot(false);
        router.replace('/(tabs)');
      }, 800);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors(prev => ({ ...prev, form: error.message || 'An error occurred during registration' }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Google Sign-In',
          'For development, please use email/password registration or configure Google OAuth credentials.',
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
          'For development, please use email/password registration or configure Apple Sign-In credentials.',
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
      {/* Success mascot flash — excited expression for 800ms after registration */}
      {showSuccessMascot && (
        <View
          testID="register-success-mascot"
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 99 }}
        >
          <LogoMascot expression="excited" size="hero" />
        </View>
      )}
      {/* Animated gradient accent */}
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.65 }}
        transition={{ type: 'timing', duration: 3000, loop: true, repeatReverse: true }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      >
        <LinearGradient
          colors={isDark
            ? ['rgba(239,68,68,0.18)', 'rgba(249,115,22,0.08)', 'transparent']
            : ['rgba(239,68,68,0.10)', 'rgba(249,115,22,0.04)', 'transparent']}
          style={{ flex: 1 }}
        />
      </MotiView>

      <KeyboardAvoidingContainer>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-md self-center">
            {/* Title */}
            <MotiView
              from={{ opacity: 0, translateY: 24 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 0, damping: 20, stiffness: 180 }}
            >
              <Text className="text-3xl font-black text-red-600 dark:text-red-400 mb-2 text-center">
                Create Account
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
                Sign up to get started
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

              {/* Name + Email — grouped card */}
              <MotiView
                from={{ opacity: 0, translateY: 18 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 100, damping: 20, stiffness: 180 }}
              >
                <View
                  className="rounded-2xl p-4 mb-2"
                  style={{
                    backgroundColor: isDark ? '#1F2937' : '#FAFAFA',
                    ...Shadows.SM,
                  }}
                >
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
              </MotiView>

              {/* Password fields — grouped card */}
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 180, damping: 20, stiffness: 180 }}
              >
                <View
                  className="rounded-2xl p-4 mb-2"
                  style={{
                    backgroundColor: isDark ? '#1F2937' : '#FAFAFA',
                    ...Shadows.SM,
                  }}
                >
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
                  style={{ marginTop: 8, minHeight: 50 }}
                />
              </MotiView>

              {/* Divider + social */}
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 340, damping: 20, stiffness: 180 }}
              >
                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                  <Text className="mx-4 text-gray-600 dark:text-gray-200 text-sm">OR</Text>
                  <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                </View>

                <View style={{ gap: 12 }}>
                  <HapticTouchableOpacity
                    className={`flex-row items-center justify-center rounded-xl px-4 py-4 min-h-[50px] bg-blue-500 ${socialLoading === 'google' ? 'opacity-60' : ''}`}
                    style={Shadows.SM}
                    onPress={handleGoogleLogin}
                    disabled={loading || socialLoading !== null}
                  >
                    {socialLoading === 'google' ? (
                      <AnimatedActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={20} color="#fff" />
                        <Text className="text-white text-base font-semibold ml-2">Continue with Google</Text>
                      </>
                    )}
                  </HapticTouchableOpacity>

                  {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                    <HapticTouchableOpacity
                      className={`flex-row items-center justify-center rounded-xl px-4 py-4 min-h-[50px] bg-black dark:bg-gray-800 ${socialLoading === 'apple' ? 'opacity-60' : ''}`}
                      style={Shadows.SM}
                      onPress={handleAppleLogin}
                      disabled={loading || socialLoading !== null}
                    >
                      {socialLoading === 'apple' ? (
                        <AnimatedActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="logo-apple" size={20} color="#fff" />
                          <Text className="text-white text-base font-semibold ml-2">Continue with Apple</Text>
                        </>
                      )}
                    </HapticTouchableOpacity>
                  )}
                </View>
              </MotiView>

              {/* Sign in link */}
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', delay: 440, duration: 400 }}
              >
                <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-600 dark:text-gray-200 text-sm">Already have an account? </Text>
                  <HapticTouchableOpacity
                    onPress={() => router.push('/login')}
                    disabled={loading}
                  >
                    <Text className="text-red-600 dark:text-red-400 text-sm font-semibold">Sign In</Text>
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
