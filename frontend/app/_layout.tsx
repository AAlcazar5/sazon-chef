import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import SplashScreen from '../components/ui/SplashScreen';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { Duration } from '../constants/Animations';
import '../global.css';

function RootLayoutNav() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  console.log('[Layout] RootLayoutNav rendering with state:', { showSplash, isOnboardingComplete, isLoading, isAuthenticated, segments });

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      console.log('[Layout] Onboarding status from storage:', onboardingComplete);
      // For Android testing, default to true if not set (dev bypass)
      const isComplete = onboardingComplete === 'true' || onboardingComplete === null;
      setIsOnboardingComplete(isComplete);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingComplete(true);
    }
  };

  useEffect(() => {
    if (isOnboardingComplete === null || isLoading) {
      console.log('[Layout] Still loading:', { isOnboardingComplete, isLoading });
      return;
    }

    const inAuth = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    console.log('[Layout] Navigation logic:', { isAuthenticated, isOnboardingComplete, inAuth, inOnboarding, inTabs });

    // Check authentication first
    if (!isAuthenticated && !inAuth && !inOnboarding) {
      // User is not authenticated and not on auth/onboarding screens
      console.log('[Layout] Redirecting to login');
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuth) {
      // User is authenticated but on auth screen, redirect to tabs
      console.log('[Layout] Redirecting to tabs from auth screen');
      router.replace('/(tabs)');
      return;
    }

    // Then check onboarding
    if (isAuthenticated && !isOnboardingComplete && !inOnboarding) {
      // User is authenticated but hasn't completed onboarding
      console.log('[Layout] Redirecting to onboarding');
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding && segments.length === 1) {
      // User has completed onboarding but is on onboarding screen (without edit param)
      // This can happen on app restart - redirect to main app
      // router.replace('/(tabs)');
      // Actually, let's not redirect here - they might be intentionally redoing onboarding
    }
  }, [isOnboardingComplete, segments, isAuthenticated, isLoading]);

  // Show splash screen on first load
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        duration={2000}
      />
    );
  }

  if (isOnboardingComplete === null || isLoading) {
    // Show loading screen while checking onboarding/authentication status
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <View className="flex-1">
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'default',
                animationDuration: Duration.medium,
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: 'modal',
                }}
              />
              <Stack.Screen name="edit-physical-profile" />
              <Stack.Screen name="edit-macro-goals" />
              <Stack.Screen name="edit-preferences" />
              <Stack.Screen name="recipe-form" />
              <Stack.Screen name="scanner-results" />
              <Stack.Screen name="edit-budget" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="login"
                options={{
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="register"
                options={{
                  presentation: 'modal',
                }}
              />
            </Stack>
          </View>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RootLayoutNav />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}