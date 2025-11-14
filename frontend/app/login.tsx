// frontend/app/login.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
// Login screen

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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import SazonMascot from '../components/mascot/SazonMascot';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const { login, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setShakeEmail(!email.trim());
      setShakePassword(!password.trim());
      setTimeout(() => {
        setShakeEmail(false);
        setShakePassword(false);
      }, 500);
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
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
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md self-center">
          <View className="items-center mb-4">
            <SazonMascot 
              expression="happy" 
              size="medium" 
              variant="orange"
            />
          </View>
          <Text className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-2 text-center">
            Welcome Back
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
            Sign in to continue
          </Text>

          <View className="w-full">
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Email</Text>
              <ShakeAnimation shake={shakeEmail}>
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
              </ShakeAnimation>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Password</Text>
              <ShakeAnimation shake={shakePassword}>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!loading}
                />
              </ShakeAnimation>
            </View>

            <HapticTouchableOpacity
              className={`bg-orange-500 dark:bg-orange-600 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Sign In</Text>
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
              <Text className="text-gray-600 dark:text-gray-200 text-sm">Don't have an account? </Text>
              <HapticTouchableOpacity
                onPress={() => router.push('/register')}
                disabled={loading}
              >
                <Text className="text-orange-500 dark:text-orange-400 text-sm font-semibold">Sign Up</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
