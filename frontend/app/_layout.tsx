import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Text } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { EDITORIAL_FONTS } from '../constants/Typography';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { SazonSheetProvider } from '../contexts/SazonSheetContext';
import SplashScreen from '../components/ui/SplashScreen';

// Keep native splash visible until our animated splash is ready
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { Duration } from '../constants/Animations';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useBiometricLock } from '../hooks/useBiometricLock';
import { useShoppingListAppOpenCleanup } from '../hooks/useShoppingListAppOpenCleanup';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import LogoMascot from '../components/mascot/LogoMascot';
import Sazon from '../components/mascot/Sazon';
import { initSentry } from '../lib/sentry';
import { initRevenueCat, setUserId as setRevenueCatUserId, logOut as revenueCatLogOut } from '../lib/revenueCat';
import '../global.css';

// Initialize Sentry once at module load — runs before any component renders.
initSentry();

function RootLayoutNav() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts(EDITORIAL_FONTS);
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();

  // RevenueCat: configure once at boot, then sync the appUserID with auth state.
  useEffect(() => {
    initRevenueCat({ userId: user?.id ?? null }).catch(() => {});
  }, []);
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setRevenueCatUserId(user.id).catch(() => {});
    } else if (!isAuthenticated) {
      revenueCatLogOut().catch(() => {});
    }
  }, [isAuthenticated, user?.id]);

  // Register for push notifications when authenticated
  usePushNotifications();

  // App-open shopping list lifecycle cleanup (once per 24h)
  useShoppingListAppOpenCleanup();

  // Biometric lock
  const { isLocked, biometricEnabled, loading: biometricLoading, authenticate } = useBiometricLock();

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
    const inTonight = segments[0] === 'tonight';

    console.log('[Layout] Navigation logic:', { isAuthenticated, isOnboardingComplete, inAuth, inOnboarding, inTabs });

    // Check authentication first
    if (!isAuthenticated && !inAuth && !inOnboarding) {
      // User is not authenticated and not on auth/onboarding screens
      console.log('[Layout] Redirecting to login');
      router.replace('/login');
      return;
    }

    // ROADMAP 4.0 T0.1 — Tonight Mode redirect.
    // When the env flag is on AND the user has opted in, send authenticated
    // users to /tonight instead of (tabs). Skip if already on /tonight.
    if (isAuthenticated && !inAuth && !inOnboarding && !inTonight) {
      (async () => {
        const flagOn = (await AsyncStorage.getItem('tonight_mode_flag_on')) === '1';
        const prefOn = (await AsyncStorage.getItem('tonight_mode_pref_enabled')) === '1';
        if (flagOn && prefOn) {
          console.log('[Layout] Redirecting to tonight mode');
          router.replace('/tonight');
        }
      })().catch(() => {});
      // Don't early-return — fall through so tabs/auth routing still applies
      // when the gate is off. /tonight redirect happens async if both flags set.
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

  // Hold the splash until editorial fonts are loaded so Fraunces italic actually renders
  if (showSplash || !fontsLoaded) {
    return (
      <SplashScreen
        onFinish={() => {
          setShowSplash(false);
          ExpoSplashScreen.hideAsync().catch((_e: unknown) => {
            // Harmless in dev: fires when native splash wasn't registered (hot reload)
          });
        }}
        duration={2000}
      />
    );
  }

  if (isOnboardingComplete === null || isLoading || biometricLoading) {
    // Show loading screen while checking onboarding/authentication/biometric status
    return null;
  }

  // Biometric lock screen
  if (isAuthenticated && isLocked && biometricEnabled) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <Sazon variant="orange" motion="wobble" fx={['question']} size={192} />
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-2">
          Sazon is Locked
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center px-8">
          Authenticate to unlock your recipes
        </Text>
        <HapticTouchableOpacity
          onPress={authenticate}
          className="bg-emerald-500 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-semibold text-base">Unlock</Text>
        </HapticTouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'ios_from_right',
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
          <Stack.Screen name="cooking" />
          <Stack.Screen name="pantry-matches" />
          <Stack.Screen name="edit-budget" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="create-shopping-list"
            options={{ presentation: 'transparentModal', animation: 'none' }}
          />
          <Stack.Screen
            name="create-collection"
            options={{ presentation: 'transparentModal', animation: 'none' }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: 'modal',
            }}
          />
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
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <BottomSheetModalProvider>
                <SazonSheetProvider>
                  <RootLayoutNav />
                </SazonSheetProvider>
              </BottomSheetModalProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}