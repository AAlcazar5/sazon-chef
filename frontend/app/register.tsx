// frontend/app/register.tsx
// Signup screen. Chrome from <AuthScreenShell>; canonical <BrandButton> CTA;
// shared <SocialButtonRow>; all colors via tokens (DS0.2).

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithGoogle, authenticateWithApple } from '../utils/socialAuth';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import AuthScreenShell from '../components/auth/AuthScreenShell';
import SocialButtonRow from '../components/auth/SocialButtonRow';
import FrostedCard from '../components/ui/FrostedCard';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import FormInput from '../components/ui/FormInput';
import { Brand, Ink } from '../constants/tokens';
import { FontSize } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';

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

  const linkColor = isDark ? Brand.dark.base : Brand.light.base;
  const mutedColor = isDark ? Ink.dark.secondary : Ink.light.secondary;

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
        newErrors.email = "That doesn't look like an email.";
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

  const socialDisabled = loading || socialLoading !== null;

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
      <MotiView
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 100, damping: 20, stiffness: 180 }}
      >
        <FrostedCard style={{ padding: Spacing.lg, marginBottom: Spacing.md + 2 }}>
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

      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 180, damping: 20, stiffness: 180 }}
      >
        <FrostedCard style={{ padding: Spacing.lg, marginBottom: Spacing.md + 2 }}>
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

      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 260, damping: 20, stiffness: 180 }}
      >
        <BrandButton
          label="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          variant="sage"
          icon="person-add-outline"
        />
      </MotiView>

      <SocialButtonRow
        onGoogle={() => handleSocialLogin('google')}
        onApple={() => handleSocialLogin('apple')}
        disabled={socialDisabled}
        delay={340}
      />

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', delay: 440, duration: 400 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl }}>
          <Text style={{ color: mutedColor, fontSize: FontSize.sm }}>
            Already have an account?{' '}
          </Text>
          <HapticTouchableOpacity
            onPress={() => router.push('/login')}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={{
              color: linkColor,
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
