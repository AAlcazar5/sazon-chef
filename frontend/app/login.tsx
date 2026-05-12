// frontend/app/login.tsx
// Login screen. Chrome from <AuthScreenShell>; canonical <BrandButton> CTA;
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
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import FormInput from '../components/ui/FormInput';
import { Brand, Ink } from '../constants/tokens';
import { FontSize } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [showSuccessMascot, setShowSuccessMascot] = useState(false);
  const { login, socialLogin } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const linkColor = isDark ? Brand.dark.base : Brand.light.base;
  const mutedColor = isDark ? Ink.dark.secondary : Ink.light.secondary;

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
    setErrors(prev => ({ ...prev, form: undefined }));

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessMascot(true);
      setTimeout(() => {
        setShowSuccessMascot(false);
        router.replace('/(tabs)');
      }, 300);
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
      headline="Welcome back"
      subhead="Sign in to continue"
      mascot={{
        variant: errors.form ? 'red' : 'orange',
        motion: errors.form ? 'wobble' : 'idle',
        fx: errors.form ? ['question'] : [],
      }}
      formError={errors.form}
      successFlash={
        showSuccessMascot
          ? { motion: 'wave', fx: ['sparkles'] }
          : undefined
      }
    >
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 160, damping: 20, stiffness: 180 }}
      >
        <FrostedCard style={{ padding: Spacing.lg, marginBottom: Spacing.md + 2 }}>
          <View style={{ gap: 4 }}>
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
        </FrostedCard>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 240, damping: 20, stiffness: 180 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.md + 2 }}>
          <HapticTouchableOpacity
            onPress={() => router.push('/forgot-password')}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
          >
            <Text style={{
              color: linkColor,
              fontSize: FontSize.sm,
              fontFamily: 'PlusJakartaSans_600SemiBold',
            }}>
              Forgot Password?
            </Text>
          </HapticTouchableOpacity>
        </View>

        <BrandButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          variant="brand"
          icon="log-in-outline"
        />
      </MotiView>

      <SocialButtonRow
        onGoogle={() => handleSocialLogin('google')}
        onApple={() => handleSocialLogin('apple')}
        disabled={socialDisabled}
        delay={320}
      />

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', delay: 420, duration: 400 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl }}>
          <Text style={{ color: mutedColor, fontSize: FontSize.sm }}>
            Don't have an account?{' '}
          </Text>
          <HapticTouchableOpacity
            onPress={() => router.push('/register')}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Sign up"
          >
            <Text style={{
              color: linkColor,
              fontSize: FontSize.sm,
              fontFamily: 'PlusJakartaSans_600SemiBold',
            }}>
              Sign Up
            </Text>
          </HapticTouchableOpacity>
        </View>
      </MotiView>
    </AuthScreenShell>
  );
}
