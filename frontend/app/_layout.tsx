import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Linking } from 'react-native';
import { resolveDeepLink, isRecognizedDeepLink } from '../lib/deepLinkRouter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createQueryClient } from '../lib/queryClient';
import { createQueryPersister, QUERY_PERSISTER_DEFAULTS } from '../lib/queryPersister';
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
import { useForceUpgrade } from '../hooks/useForceUpgrade';
import ForceUpgradeScreen from '../components/ui/ForceUpgradeScreen';
import { createLogger } from '../lib/logger';

const log = createLogger('Layout');
import { useShoppingListAppOpenCleanup } from '../hooks/useShoppingListAppOpenCleanup';
import BrandButton from '../components/ui/BrandButton';
import LogoMascot from '../components/mascot/LogoMascot';
import Sazon from '../components/mascot/Sazon';
import { initSentry } from '../lib/sentry';
import { initRevenueCat, setUserId as setRevenueCatUserId, logOut as revenueCatLogOut } from '../lib/revenueCat';
import '../global.css';

// Initialize Sentry once at module load — runs before any component renders.
initSentry();

// P5: single QueryClient + AsyncStorage persister per app boot. Created at
// module scope so they survive RootLayout re-renders and aren't recreated on
// hot reload of the component body. The persister hydrates the query cache
// from disk on cold start so frequently-accessed surfaces (recipe feed,
// pantry, plate suggestions) populate before the network round-trip lands.
const queryClient = createQueryClient();
const queryPersister = createQueryPersister();
const queryPersistOptions = {
  persister: queryPersister,
  maxAge: QUERY_PERSISTER_DEFAULTS.maxAge,
};

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

  // U2: Deep-link runtime handler.
  // Every `sazon://...` URL (and universal https link) is resolved to an
  // expo-router target and pushed. We ONLY push when the URL matches a
  // recognized deep-link pattern (sazon:// scheme or https://sazonchef.app).
  // Cold-start Expo dev URLs (exp://localhost:…) and arbitrary launch URLs
  // fall through to the resolver's Today fallback — but we DON'T push to
  // Today in that case, because the user just opened the app normally;
  // the existing onboarding/auth routing will land them where they belong.
  // Pushing on every cold-start caused an infinite remount loop.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!isRecognizedDeepLink(url)) return;
      const target = resolveDeepLink(url as string);
      const qp = new URLSearchParams(target.params).toString();
      const dest = qp ? `${target.pathname}?${qp}` : target.pathname;
      router.push(dest as never);
    };
    // Cold-start: app was launched by a deep link.
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    // Warm: app already running.
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      sub.remove();
    };
    // Empty deps: the listener registration is one-shot. router is a stable
    // singleton in expo-router; including it in deps causes re-registration
    // loops if any consumer mutates the router reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // App-open shopping list lifecycle cleanup (once per 24h)
  useShoppingListAppOpenCleanup();

  // Biometric lock
  const { isLocked, biometricEnabled, loading: biometricLoading, authenticate } = useBiometricLock();

  // U3: Force-upgrade gate — block stale builds before any other UI mounts.
  const { mustUpgrade, floor: upgradeFloor, loading: upgradeLoading } = useForceUpgrade();

  log.debug('RootLayoutNav rendering', { showSplash, isOnboardingComplete, isLoading, isAuthenticated, segments });

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      log.debug('Onboarding status from storage', onboardingComplete);
      // For Android testing, default to true if not set (dev bypass)
      const isComplete = onboardingComplete === 'true' || onboardingComplete === null;
      setIsOnboardingComplete(isComplete);
    } catch (error) {
      log.error('Error checking onboarding status', error);
      setIsOnboardingComplete(true);
    }
  };

  useEffect(() => {
    if (isOnboardingComplete === null || isLoading) {
      log.debug('Still loading', { isOnboardingComplete, isLoading });
      return;
    }

    const inAuth = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inTonight = segments[0] === 'tonight';

    log.debug('Navigation logic', { isAuthenticated, isOnboardingComplete, inAuth, inOnboarding, inTabs });

    // Check authentication first
    if (!isAuthenticated && !inAuth && !inOnboarding) {
      // User is not authenticated and not on auth/onboarding screens
      log.debug('Redirecting to login');
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
          log.debug('Redirecting to tonight mode');
          router.replace('/tonight');
        }
      })().catch(() => {});
      // Don't early-return — fall through so tabs/auth routing still applies
      // when the gate is off. /tonight redirect happens async if both flags set.
    }

    if (isAuthenticated && inAuth) {
      // User is authenticated but on auth screen, redirect to tabs
      log.debug('Redirecting to tabs from auth screen');
      router.replace('/(tabs)');
      return;
    }

    // Then check onboarding
    if (isAuthenticated && !isOnboardingComplete && !inOnboarding) {
      // User is authenticated but hasn't completed onboarding
      log.debug('Redirecting to onboarding');
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

  if (isOnboardingComplete === null || isLoading || biometricLoading || upgradeLoading) {
    // Show loading screen while checking onboarding/authentication/biometric/upgrade status
    return null;
  }

  // U3: Block stale builds before any other UI mounts.
  if (mustUpgrade) {
    return <ForceUpgradeScreen floor={upgradeFloor} />;
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
        <BrandButton
          label="Unlock"
          onPress={authenticate}
          variant="sage"
        />
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
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={queryPersistOptions}
        >
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
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}