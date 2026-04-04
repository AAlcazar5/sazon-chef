// frontend/app/register.tsx
// 9N: Registration with brand gradient, FrostedCard form, mascot error/success states.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ScreenGradient from '../components/ui/ScreenGradient';
import FrostedCard from '../components/ui/FrostedCard';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import FormInput from '../components/ui/FormInput';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import LogoMascot from '../components/mascot/LogoMascot';
import { Colors, DarkColors, Pastel, PastelDark } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { FontSize, FontWeight } from '../constants/Typography';

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
    <ScreenGradient variant="auth">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Success mascot flash */}
        {showSuccessMascot && (
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            pointerEvents="none"
            style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 99 }}
          >
            <LogoMascot expression="excited" size="hero" />
          </MotiView>
        )}

        <KeyboardAvoidingContainer>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
              {/* Title */}
              <MotiView
                from={{ opacity: 0, translateY: 24 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 0, damping: 20, stiffness: 180 }}
              >
                <Text style={{
                  fontSize: FontSize['3xl'],
                  fontWeight: FontWeight.extrabold,
                  color: isDark ? DarkColors.text.primary : Colors.primary,
                  textAlign: 'center',
                  marginBottom: 4,
                }}>
                  Create Account
                </Text>
                <Text style={{
                  fontSize: FontSize.md,
                  color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                  textAlign: 'center',
                  marginBottom: 20,
                }}>
                  Sign up to get started
                </Text>
              </MotiView>

              {/* Form-level error — mascot + pastel red tint */}
              {errors.form && (
                <MotiView
                  from={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 240 }}
                >
                  <View style={{
                    backgroundColor: isDark ? PastelDark.red : Pastel.red,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    ...(Shadows.SM as any),
                  }}>
                    <LogoMascot expression="curious" size="tiny" />
                    <Text style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: FontSize.sm,
                      color: isDark ? '#F87171' : '#B91C1C',
                      lineHeight: 18,
                    }}>
                      {errors.form}
                    </Text>
                  </View>
                </MotiView>
              )}

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
                      fontWeight: FontWeight.semibold,
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
                      fontWeight: FontWeight.semibold,
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
                      fontWeight: FontWeight.semibold,
                    }}>
                      Sign In
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </MotiView>
            </View>
          </ScrollView>
        </KeyboardAvoidingContainer>
      </SafeAreaView>
    </ScreenGradient>
  );
}
