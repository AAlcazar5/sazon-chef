// frontend/app/register.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
// Registration screen

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { register, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

  const handleRegister = async () => {
    // Validation
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
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
            <Text className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-2 text-center">
              Create Account
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
              Sign up to get started
            </Text>

            <View className="w-full">
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Name</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Email</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Password</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your password (min 8 characters)"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  {...(Platform.OS === 'ios' && { passwordRules: '' })}
                  editable={!loading}
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Confirm Password</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  {...(Platform.OS === 'ios' && { passwordRules: '' })}
                  editable={!loading}
                />
              </View>

              <HapticTouchableOpacity
                className={`bg-orange-500 dark:bg-orange-600 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
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
                  <Text className="text-orange-500 dark:text-orange-400 text-sm font-semibold">Sign In</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
