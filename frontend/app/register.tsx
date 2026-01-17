// frontend/app/register.tsx
// Registration screen with FormInput validation

import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import FormInput from '../components/ui/FormInput';
import { Colors, DarkColors } from '../constants/Colors';

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
  const { register, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

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
      router.replace('/(tabs)');
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
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-md self-center">
            <Text className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
              Create Account
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
              Sign up to get started
            </Text>

            <View className="w-full">
              {/* Form-level error */}
              {errors.form && (
                <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text className="text-red-600 dark:text-red-400 text-sm ml-2 flex-1">{errors.form}</Text>
                </View>
              )}

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

              <HapticTouchableOpacity
                className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Sign Up</Text>
                )}
              </HapticTouchableOpacity>

              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <Text className="mx-4 text-gray-600 dark:text-gray-200 text-sm">OR</Text>
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </View>

              <View style={{ gap: 12 }}>
                <HapticTouchableOpacity
                  className={`flex-row items-center justify-center rounded-lg px-4 py-4 min-h-[50px] bg-blue-500 ${socialLoading === 'google' ? 'opacity-60' : ''}`}
                  onPress={handleGoogleLogin}
                  disabled={loading || socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#fff" />
                      <Text className="text-white text-base font-semibold ml-2">Continue with Google</Text>
                    </>
                  )}
                </HapticTouchableOpacity>

                {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <HapticTouchableOpacity
                    className={`flex-row items-center justify-center rounded-lg px-4 py-4 min-h-[50px] bg-black dark:bg-gray-800 ${socialLoading === 'apple' ? 'opacity-60' : ''}`}
                    onPress={handleAppleLogin}
                    disabled={loading || socialLoading !== null}
                  >
                    {socialLoading === 'apple' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={20} color="#fff" />
                        <Text className="text-white text-base font-semibold ml-2">Continue with Apple</Text>
                      </>
                    )}
                  </HapticTouchableOpacity>
                )}
              </View>

              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600 dark:text-gray-200 text-sm">Already have an account? </Text>
                <HapticTouchableOpacity
                  onPress={() => router.push('/login')}
                  disabled={loading}
                >
                  <Text className="text-red-600 dark:text-red-400 text-sm font-semibold">Sign In</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
